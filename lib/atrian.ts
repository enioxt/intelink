/**
 * ATRiAN Compliance — Adaptado de 852
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Ethical AI validation and compliance scoring
 */

export type ATRiANSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ATRiANCategory = 
  | 'accuracy' 
  | 'privacy' 
  | 'bias' 
  | 'transparency' 
  | 'accountability'
  | 'safety';

export interface ATRiANCheck {
  id: string;
  rule: string;
  description: string;
  severity: ATRiANSeverity;
  category: ATRiANCategory;
  validator: (content: string) => boolean;
}

export interface ATRiANViolation {
  id: string;
  rule: string;
  message: string;
  suggestion: string;
  severity: ATRiANSeverity;
  category: ATRiANCategory;
}

export interface ATRiANReport {
  score: number; // 0-100
  passed: boolean;
  violations: ATRiANViolation[];
  warnings: ATRiANViolation[];
  timestamp: string;
}

// ATRiAN Rules
export const ATRiAN_RULES: ATRiANCheck[] = [
  {
    id: 'ATRiAN-001',
    rule: 'No PII in output',
    description: 'Must not expose personal identifiable information',
    severity: 'critical',
    category: 'privacy',
    validator: (content) => {
      // Check for CPF pattern
      const cpfPattern = /\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2}/;
      // Check for email pattern
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      // Check for phone pattern
      const phonePattern = /\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/;
      
      return !cpfPattern.test(content) && !emailPattern.test(content) && !phonePattern.test(content);
    },
  },
  {
    id: 'ATRiAN-002',
    rule: 'No legal promises',
    description: 'Must not make promises about legal outcomes',
    severity: 'high',
    category: 'accountability',
    validator: (content) => {
      const forbiddenWords = ['garanto que', 'vai ganhar', 'certeza absoluta', '100% garantido'];
      return !forbiddenWords.some(word => content.toLowerCase().includes(word));
    },
  },
  {
    id: 'ATRiAN-003',
    rule: 'Source attribution',
    description: 'Factual claims should reference sources',
    severity: 'medium',
    category: 'transparency',
    validator: (content) => {
      // Check if content has references or citations
      return content.includes('Fonte:') || content.includes('Referência:') || content.includes('http');
    },
  },
  {
    id: 'ATRiAN-004',
    rule: 'No hallucinated precedents',
    description: 'Legal precedents must be verifiable',
    severity: 'high',
    category: 'accuracy',
    validator: (content) => {
      // Check for suspicious patterns
      const suspicious = ['processo nº', 'julgado em', 'acórdão'];
      const hasLegalRefs = suspicious.some(ref => content.toLowerCase().includes(ref));
      // If has legal references, should have citation
      if (hasLegalRefs) {
        return content.includes('Fonte:') || content.includes('STF') || content.includes('TJ') || content.includes('TRF');
      }
      return true;
    },
  },
  {
    id: 'ATRiAN-005',
    rule: 'Bias check',
    description: 'Content should not show discriminatory bias',
    severity: 'critical',
    category: 'bias',
    validator: (content) => {
      const discriminatoryTerms = ['todos os', 'sempre', 'nunca confie'];
      return !discriminatoryTerms.some(term => content.toLowerCase().includes(term));
    },
  },
];

// Validate content against ATRiAN rules
export function validateATRiAN(content: string): ATRiANReport {
  const violations: ATRiANViolation[] = [];
  const warnings: ATRiANViolation[] = [];
  
  for (const rule of ATRiAN_RULES) {
    const passed = rule.validator(content);
    
    if (!passed) {
      const violation: ATRiANViolation = {
        id: rule.id,
        rule: rule.rule,
        message: `Rule violated: ${rule.description}`,
        suggestion: getSuggestionForRule(rule),
        severity: rule.severity,
        category: rule.category,
      };
      
      if (rule.severity === 'critical' || rule.severity === 'high') {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }
  
  // Calculate score
  const baseScore = 100;
  const criticalPenalty = violations.filter(v => v.severity === 'critical').length * 25;
  const highPenalty = violations.filter(v => v.severity === 'high').length * 15;
  const mediumPenalty = warnings.filter(v => v.severity === 'medium').length * 5;
  const lowPenalty = warnings.filter(v => v.severity === 'low').length * 2;
  
  const score = Math.max(0, baseScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);
  
  return {
    score,
    passed: violations.length === 0,
    violations,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

function getSuggestionForRule(rule: ATRiANCheck): string {
  const suggestions: Record<string, string> = {
    'ATRiAN-001': 'Remova informações pessoais ou use formato mascarado (***.***.***-XX)',
    'ATRiAN-002': 'Use linguagem probabilística: "sugere-se", "pode ser considerado"',
    'ATRiAN-003': 'Adicione uma fonte oficial: "Fonte: INPI/MJ" ou link para documento oficial',
    'ATRiAN-004': 'Inclua número do processo completo e tribunal: "STF, RE 123456"',
    'ATRiAN-005': 'Use linguagem mais neutra e específica, evite generalizações',
  };
  
  return suggestions[rule.id] || 'Revise o conteúdo para adequação às diretrizes ATRiAN';
}

// Quick check for PII
export function containsPII(text: string): boolean {
  const patterns = [
    /\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2}/, // CPF
    /\d{2}[.-]?\d{3}[.-]?\d{3}[\/]?\d{4}[.-]?\d{2}/, // CNPJ
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/, // Phone
    /\d{5}-?\d{3}/, // CEP
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

// Mask PII in text
export function maskPII(text: string): string {
  return text
    .replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/g, '***.***.$3-$4')
    .replace(/([a-zA-Z0-9._%+-])@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2')
    .replace(/(\(?\d{2}\)?[\s-]?)\d{4,5}([\s-]?\d{4})/g, '$1****-****');
}

export default {
  validateATRiAN,
  containsPII,
  maskPII,
  ATRiAN_RULES,
};
