'use client';

/**
 * Intelink Document Upload Component
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Drag-and-drop upload interface with real-time analysis
 */

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadResult {
  ok: boolean;
  document_id?: string;
  filename: string;
  size_bytes: number;
  text_extracted: boolean;
  text_length: number;
  entities_found: number;
  entities?: Array<{
    text: string;
    label: string;
    confidence: number;
  }>;
  patterns_detected: number;
  risk_level: string;
  behavioral_tags?: Array<{
    pattern_id: string;
    pattern_name: string;
    confidence: number;
    matched_keywords: string[];
    severity: string;
  }>;
  processing_steps: string[];
  warnings?: string[];
}

interface DocumentUploadProps {
  caseId?: string;
  onUploadComplete?: (result: UploadResult) => void;
}

export default function DocumentUpload({ caseId, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom validator to accept files by extension when MIME is empty
  const validator = useCallback((file: File) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/);
    
    // Accept if extension is valid, even with empty MIME
    if (fileExtension && allowedExtensions.includes(fileExtension[0])) {
      return null; // null = valid
    }
    
    return {
      code: 'invalid-file-type',
      message: `File type not supported. Allowed: ${allowedExtensions.join(', ')}`
    };
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'file_upload');
      if (caseId) {
        formData.append('caseId', caseId);
      }
      formData.append('extract_text', 'true');
      formData.append('run_ner', 'true');
      formData.append('detect_patterns', 'true');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/intelink/analyze', {
        method: 'POST',
        body: formData,
        // Add auth header if needed
        headers: {
          // 'Authorization': `Bearer ${token}`,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data: UploadResult = await response.json();
      setResult(data);
      
      if (onUploadComplete) {
        onUploadComplete(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [caseId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    validator,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-gray-900';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <Upload className="w-12 h-12 text-gray-400" />
          
          {isDragActive ? (
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
              Solte o arquivo aqui...
            </p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Arraste um documento ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PDF, DOCX, DOC, TXT, MD ou JSON (máx. 50MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Processando...</span>
            <span className="text-gray-600 dark:text-gray-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">Erro no upload</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {result.filename}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {(result.size_bytes / 1024).toFixed(1)} KB • {result.text_length} caracteres extraídos
                  </p>
                </div>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk_level)}`}>
                {result.risk_level.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {result.entities_found}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Entidades
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {result.patterns_detected}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Padrões Comportamentais
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                result.risk_level === 'critical' || result.risk_level === 'high' 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {result.risk_level === 'critical' ? '!!!' : result.risk_level === 'high' ? '!!' : '✓'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Nível de Risco
              </div>
            </div>
          </div>

          {/* Entities */}
          {result.entities && result.entities.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                👥 Entidades Detectadas
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.entities.slice(0, 10).map((entity, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {entity.text}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {entity.label}
                    </span>
                    <span className="text-xs text-blue-500 dark:text-blue-500">
                      {(entity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Behavioral Patterns */}
          {result.behavioral_tags && result.behavioral_tags.length > 0 && (
            <div className="p-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                🧠 Padrões Comportamentais Detectados
              </h4>
              <div className="space-y-3">
                {result.behavioral_tags.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(pattern.severity)}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {pattern.pattern_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {(pattern.confidence * 100).toFixed(0)}% confiança
                      </span>
                    </div>
                    
                    {pattern.matched_keywords.length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Palavras-chave:</span>{' '}
                        {pattern.matched_keywords.slice(0, 5).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-950 border-t border-yellow-200 dark:border-yellow-800">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Avisos
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
