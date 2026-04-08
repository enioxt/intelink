'use client';

/**
 * Masked Input Component with Live Validation
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Real-time input masking and validation with visual feedback.
 */

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { 
  getMaskFunction, 
  getValidationFunction, 
  type ValidationResult 
} from '@/lib/inputMasks';

export interface MaskedInputProps {
  type: 'cpf' | 'phone' | 'cep' | 'plate' | 'date' | 'time' | 'currency' | 'text';
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MaskedInput({
  type,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  className = '',
}: MaskedInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [touched, setTouched] = useState(false);

  const maskFn = type !== 'text' ? getMaskFunction(type) : null;
  const validateFn = type !== 'text' ? getValidationFunction(type) : null;

  useEffect(() => {
    if (maskFn) {
      setDisplayValue(maskFn(value));
    } else {
      setDisplayValue(value);
    }
  }, [value, maskFn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (maskFn) {
      const masked = maskFn(newValue);
      setDisplayValue(masked);
      onChange(masked);
    } else {
      setDisplayValue(newValue);
      onChange(newValue);
    }
    
    // Validate on change
    if (validateFn && newValue.trim()) {
      const result = validateFn(newValue);
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    
    if (validateFn && displayValue.trim()) {
      const result = validateFn(displayValue);
      setValidation(result);
    }
  };

  const getStatusIcon = () => {
    if (!touched || !displayValue.trim()) return null;
    
    if (validation === null) return null;
    
    if (validation.valid) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    if (!touched || !displayValue.trim()) return 'border-gray-300 dark:border-gray-600';
    
    if (validation === null) return 'border-gray-300 dark:border-gray-600';
    
    if (validation.valid) {
      return 'border-green-500 focus:ring-green-500';
    } else {
      return 'border-red-500 focus:ring-red-500';
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${getStatusColor()} disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {getStatusIcon()}
        </div>
      </div>
      
      {touched && validation && (
        <div className="flex items-start gap-1 text-sm">
          {validation.valid ? (
            <p className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Válido
            </p>
          ) : (
            <div className="text-red-600 space-y-1">
              <p className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validation.error}
              </p>
              {validation.suggestion && (
                <p className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Info className="w-4 h-4" />
                  {validation.suggestion}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
