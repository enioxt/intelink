/**
 * Validation — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Form validation utilities
 */

import { validateCPF as validateCPFUtil, validateCNPJ as validateCNPJUtil } from './pii-scanner';

// Validate CPF
export function validateCPF(cpf: string): boolean {
  return validateCPFUtil(cpf);
}

// Validate CNPJ
export function validateCNPJ(cnpj: string): boolean {
  return validateCNPJUtil(cnpj);
}

// Validate email
export function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// Validate phone (Brazilian)
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

// Validate CEP
export function validateCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

// Validate required field
export function required(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

// Validate min length
export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

// Validate max length
export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

// Validate pattern (regex)
export function pattern(value: string, regex: RegExp): boolean {
  return regex.test(value);
}

// Validate number range
export function range(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Validate URL
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Form field validator type
export type Validator = (value: any) => boolean | string;

// Compose multiple validators
export function compose(...validators: Validator[]): Validator {
  return (value: any) => {
    for (const validator of validators) {
      const result = validator(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  };
}

// Create required validator with message
export function requiredField(fieldName: string): Validator {
  return (value: any) => {
    if (!required(value)) {
      return `${fieldName} é obrigatório`;
    }
    return true;
  };
}

// Create min length validator with message
export function minLengthField(fieldName: string, min: number): Validator {
  return (value: string) => {
    if (!minLength(value, min)) {
      return `${fieldName} deve ter pelo menos ${min} caracteres`;
    }
    return true;
  };
}

// Create email validator with message
export function emailField(fieldName: string = 'Email'): Validator {
  return (value: string) => {
    if (!validateEmail(value)) {
      return `${fieldName} inválido`;
    }
    return true;
  };
}

// Validate entire form
export function validateForm(
  values: Record<string, any>,
  validators: Record<string, Validator>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(values[field]);
    if (result !== true) {
      errors[field] = typeof result === 'string' ? result : 'Valor inválido';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export default {
  validateCPF,
  validateCNPJ,
  validateEmail,
  validatePhone,
  validateCEP,
  required,
  minLength,
  maxLength,
  pattern,
  range,
  validateURL,
  compose,
  requiredField,
  minLengthField,
  emailField,
  validateForm,
};
