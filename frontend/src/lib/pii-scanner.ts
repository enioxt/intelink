/**
 * PII Scanner — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Client-side PII detection and masking
 */

// Brazilian PII Patterns
const PII_PATTERNS = {
  cpf: /\b(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})\b/g,
  cnpj: /\b(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})\b/g,
  email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
  phone: /\b(\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4})\b/g,
  cep: /\b(\d{5}[-\s]?\d{3})\b/g,
  // REDS/BO pattern (police documents)
  reds: /\b(RED[S]?-?\d{6,10})\b/gi,
  // Vehicle plates
  plate: /\b([A-Z]{3}[-\s]?\d{4}|[A-Z]{3}\d[A-Z]\d{2})\b/g,
  // MASP (military/police ID)
  masp: /\b(\d{6,8})\b/g,
};

export type PIIType = keyof typeof PII_PATTERNS;

export interface PIIFinding {
  type: PIIType;
  value: string;
  position: [number, number];
  severity: 'high' | 'medium' | 'low';
}

export interface PIIReport {
  hasPII: boolean;
  findings: PIIFinding[];
  riskScore: number; // 0-100
  maskedText: string;
}

// Mask individual PII types
export function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `***.***.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  }
  return '***.***.***-**';
}

export function maskCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return `**.***.***/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  }
  return '**.***.***/****-**';
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    return `(**) ****-${last4}`;
  }
  return '(**) ****-****';
}

export function maskREDS(reds: string): string {
  return reds.replace(/\d/g, '*');
}

// Detect PII in text
export function detectPII(text: string): PIIReport {
  const findings: PIIFinding[] = [];
  let maskedText = text;
  let riskScore = 0;

  const severities: Record<PIIType, 'high' | 'medium' | 'low'> = {
    cpf: 'high',
    cnpj: 'high',
    email: 'medium',
    phone: 'medium',
    cep: 'low',
    reds: 'high',
    plate: 'low',
    masp: 'high',
  };

  // Find all PII
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        findings.push({
          type: type as PIIType,
          value: match[1] || match[0],
          position: [match.index, match.index + match[0].length],
          severity: severities[type as PIIType],
        });
      }
    }
  }

  // Sort by position (descending) to replace from end to start
  findings.sort((a, b) => b.position[0] - a.position[0]);

  // Mask each finding
  for (const finding of findings) {
    let masked: string;
    switch (finding.type) {
      case 'cpf':
        masked = maskCPF(finding.value);
        riskScore += 20;
        break;
      case 'cnpj':
        masked = maskCNPJ(finding.value);
        riskScore += 20;
        break;
      case 'email':
        masked = maskEmail(finding.value);
        riskScore += 15;
        break;
      case 'phone':
        masked = maskPhone(finding.value);
        riskScore += 10;
        break;
      case 'reds':
        masked = maskREDS(finding.value);
        riskScore += 25;
        break;
      default:
        masked = '*'.repeat(finding.value.length);
        riskScore += 5;
    }

    maskedText = 
      maskedText.slice(0, finding.position[0]) +
      masked +
      maskedText.slice(finding.position[1]);
  }

  // Reverse findings to be in original order
  findings.reverse();

  return {
    hasPII: findings.length > 0,
    findings,
    riskScore: Math.min(100, riskScore),
    maskedText,
  };
}

// Quick check
export function containsPII(text: string): boolean {
  return Object.values(PII_PATTERNS).some(pattern => pattern.test(text));
}

// Validate CPF checksum
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(.)(\1){10}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  return cleaned[9] === String(digit1) && cleaned[10] === String(digit2);
}

// Validate CNPJ checksum
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  return cleaned[12] === String(digit1) && cleaned[13] === String(digit2);
}

// React hook for form validation
export function usePIIGuard() {
  const scan = (text: string): PIIReport => detectPII(text);
  
  const validate = (text: string, options: { 
    allowLowRisk?: boolean;
    blockHighRisk?: boolean;
  } = {}): { valid: boolean; error?: string } => {
    const report = detectPII(text);
    
    if (!report.hasPII) return { valid: true };
    
    const highRisk = report.findings.filter(f => f.severity === 'high');
    if (options.blockHighRisk && highRisk.length > 0) {
      return { 
        valid: false, 
        error: `PII detected: ${highRisk.map(f => f.type.toUpperCase()).join(', ')}. Please remove or mask.` 
      };
    }
    
    if (report.riskScore > 50 && !options.allowLowRisk) {
      return { 
        valid: false, 
        error: 'High-risk PII detected. Please review before submitting.' 
      };
    }
    
    return { valid: true };
  };

  return { scan, validate, containsPII };
}

export default {
  detectPII,
  containsPII,
  maskCPF,
  maskCNPJ,
  maskEmail,
  maskPhone,
  validateCPF,
  validateCNPJ,
  usePIIGuard,
};
