/**
 * Input Masks Library
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Utilities for formatting and validating input fields
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  masked?: string;
  raw?: string;
}

export type MaskType = 'cpf' | 'phone' | 'cep' | 'plate' | 'date' | 'time' | 'currency' | 'text';

// Apply mask to value
export function applyMask(value: string, maskType: MaskType): string {
  const clean = value.replace(/\D/g, '');

  switch (maskType) {
    case 'cpf':
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14);
    case 'phone':
      if (clean.length <= 10) {
        return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3').substring(0, 13);
      }
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15);
    case 'cep':
      return clean.replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
    case 'plate':
      return clean.toUpperCase().replace(/([A-Z]{3})(\d{4})/, '$1-$2').substring(0, 8);
    case 'date':
      return clean.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3').substring(0, 10);
    case 'time':
      return clean.replace(/(\d{2})(\d{2})/, '$1:$2').substring(0, 5);
    case 'currency':
      const num = parseInt(clean || '0', 10) / 100;
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    default:
      return value;
  }
}

// Remove mask and return raw value
export function removeMask(value: string, maskType: MaskType): string {
  if (maskType === 'currency') {
    return value.replace(/[^\d,]/g, '').replace(',', '.');
  }
  return value.replace(/\D/g, '');
}

// Validate value based on mask type
export function validateValue(value: string, maskType: MaskType): ValidationResult {
  const raw = removeMask(value, maskType);

  switch (maskType) {
    case 'cpf':
      if (raw.length !== 11) {
        return { valid: false, error: 'CPF deve ter 11 dígitos', raw };
      }
      if (!isValidCPF(raw)) {
        return { valid: false, error: 'CPF inválido', raw };
      }
      return { valid: true, masked: applyMask(value, 'cpf'), raw };

    case 'phone':
      if (raw.length < 10 || raw.length > 11) {
        return { valid: false, error: 'Telefone deve ter 10 ou 11 dígitos', raw };
      }
      return { valid: true, masked: applyMask(value, 'phone'), raw };

    case 'cep':
      if (raw.length !== 8) {
        return { valid: false, error: 'CEP deve ter 8 dígitos', raw };
      }
      return { valid: true, masked: applyMask(value, 'cep'), raw };

    case 'plate':
      if (!/^[A-Z]{3}-?\d{4}$/.test(value.toUpperCase())) {
        return { valid: false, error: 'Placa deve ter formato AAA-0000', raw };
      }
      return { valid: true, masked: applyMask(value, 'plate'), raw };

    case 'date':
      if (raw.length !== 8) {
        return { valid: false, error: 'Data deve ter formato DD/MM/AAAA', raw };
      }
      const day = parseInt(raw.substring(0, 2), 10);
      const month = parseInt(raw.substring(2, 4), 10);
      const year = parseInt(raw.substring(4, 8), 10);
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return { valid: false, error: 'Data inválida', raw };
      }
      return { valid: true, masked: applyMask(value, 'date'), raw };

    case 'time':
      if (raw.length !== 4) {
        return { valid: false, error: 'Hora deve ter formato HH:MM', raw };
      }
      const hour = parseInt(raw.substring(0, 2), 10);
      const min = parseInt(raw.substring(2, 4), 10);
      if (hour > 23 || min > 59) {
        return { valid: false, error: 'Hora inválida', raw };
      }
      return { valid: true, masked: applyMask(value, 'time'), raw };

    case 'currency':
      const amount = parseFloat(raw);
      if (isNaN(amount) || amount < 0) {
        return { valid: false, error: 'Valor inválido', raw };
      }
      return { valid: true, masked: applyMask(value, 'currency'), raw };

    default:
      return { valid: true, raw: value };
  }
}

// Get format hint for mask type
export function getFormatHint(maskType: MaskType): string {
  const hints: Record<MaskType, string> = {
    cpf: '000.000.000-00',
    phone: '(00) 00000-0000',
    cep: '00000-000',
    plate: 'AAA-0000',
    date: 'DD/MM/AAAA',
    time: 'HH:MM',
    currency: 'R$ 0,00',
    text: '',
  };
  return hints[maskType];
}

// Get placeholder for mask type
export function getPlaceholder(maskType: MaskType): string {
  const placeholders: Record<MaskType, string> = {
    cpf: '000.000.000-00',
    phone: '(00) 00000-0000',
    cep: '00000-000',
    plate: 'AAA-0000',
    date: 'DD/MM/AAAA',
    time: '00:00',
    currency: 'R$ 0,00',
    text: 'Digite aqui...',
  };
  return placeholders[maskType];
}

// Get validation function for mask type
export function getValidationFunction(maskType: MaskType) {
  return (value: string) => validateValue(value, maskType);
}

// CPF validation algorithm
function isValidCPF(cpf: string): boolean {
  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) return false;

  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

// Get mask function for mask type
export function getMaskFunction(maskType: MaskType) {
  return (value: string) => applyMask(value, maskType);
}

export default {
  applyMask,
  removeMask,
  validateValue,
  getFormatHint,
  getPlaceholder,
  getValidationFunction,
  getMaskFunction,
};
