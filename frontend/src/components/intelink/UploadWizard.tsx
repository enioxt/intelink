'use client';

/**
 * Upload Wizard - Multi-step Document Upload & Validation
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Steps:
 * 1. Upload: Drag-and-drop or file picker (PDF, DOCX, CSV, ZIP, images)
 * 2. Preview: Show files, sizes, types, basic validation
 * 3. Mapping: For CSV/Excel, map columns to fields
 * 4. Validation: Inline validation, normalization, error fixing
 * 5. Confirm: Summary and submit job
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import CSVMapper from './CSVMapper';

type WizardStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'confirm';

interface FileEntry {
  file: File;
  id: string;
  status: 'pending' | 'validating' | 'valid' | 'invalid';
  errors: string[];
  warnings: string[];
  normalized?: Record<string, any>;
  csvMapping?: any[];
}

export default function UploadWizard({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentMappingFileId, setCurrentMappingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((f) => ({
      file: f,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      errors: [],
      warnings: [],
    }));
    setFiles((prev) => [...prev, ...entries]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const validateFiles = async () => {
    setStep('validation');
    const updated = files.map((f) => {
      const errs: string[] = [];
      const warns: string[] = [];

      // Size check
      if (f.file.size > 50 * 1024 * 1024) errs.push('File exceeds 50MB');
      if (f.file.size === 0) errs.push('File is empty');

      // Type check
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/zip', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(f.file.type) && !f.file.name.match(/\.(pdf|docx|csv|zip|png|jpg|jpeg)$/i)) {
        warns.push('File type may not be supported');
      }

      return { ...f, status: errs.length > 0 ? 'invalid' : 'valid', errors: errs, warnings: warns } as FileEntry;
    });
    setFiles(updated);
    setTimeout(() => setStep('confirm'), 500);
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Upload files to backend
      for (const entry of files) {
        if (entry.status !== 'valid') continue;
        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('source', 'upload');
        await fetch('/api/intelink/ingest/file', { method: 'POST', body: formData });
      }
      onComplete();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const canProceed = () => {
    if (step === 'upload') return files.length > 0;
    if (step === 'preview') return files.length > 0;
    if (step === 'validation') return files.some((f) => f.status === 'valid');
    if (step === 'confirm') return files.some((f) => f.status === 'valid');
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" data-testid="upload-wizard">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Documents</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Step {getStepNumber(step)} of 5</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            {['upload', 'preview', 'mapping', 'validation', 'confirm'].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded-full ${getStepNumber(step) > i + 1 ? 'bg-blue-600' : getStepNumber(step) === i + 1 ? 'bg-blue-400' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Drop files here or click to browse</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supported: PDF, DOCX, CSV, ZIP, PNG, JPG (max 50MB each)</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.docx,.csv,.zip,.png,.jpg,.jpeg" data-testid="upload-file-input" />
              </div>

              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3">Selected Files ({files.length})</h3>
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{f.file.name}</p>
                            <p className="text-xs text-gray-500">{(f.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(f.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Review Files</h3>
              <div className="space-y-3">
                {files.map((f) => (
                  <div key={f.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{f.file.name}</p>
                          <p className="text-xs text-gray-500">{(f.file.size / 1024).toFixed(1)} KB • {f.file.type || 'unknown type'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'mapping' && (() => {
            const csvFiles = files.filter(f => f.file.type === 'text/csv' || f.file.name.endsWith('.csv'));
            
            if (csvFiles.length === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">Nenhum arquivo CSV para mapear.</p>
                  <p className="text-sm text-gray-500 mt-2">Avançar para validação...</p>
                </div>
              );
            }
            
            const fileToMap = currentMappingFileId 
              ? csvFiles.find(f => f.id === currentMappingFileId) 
              : csvFiles[0];
            
            if (!fileToMap) return null;
            
            return (
              <div>
                {csvFiles.length > 1 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                      Mapeando arquivo {csvFiles.findIndex(f => f.id === fileToMap.id) + 1} de {csvFiles.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {csvFiles.map((f, i) => (
                        <button
                          key={f.id}
                          onClick={() => setCurrentMappingFileId(f.id)}
                          className={`px-3 py-1 text-xs rounded-lg ${
                            f.id === fileToMap.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700'
                          }`}
                        >
                          {i + 1}. {f.file.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <CSVMapper
                  file={fileToMap.file}
                  onMappingComplete={(mapping) => {
                    setFiles(prev => prev.map(f => 
                      f.id === fileToMap.id ? { ...f, csvMapping: mapping } : f
                    ));
                    
                    const nextUnmapped = csvFiles.find(f => f.id !== fileToMap.id && !f.csvMapping);
                    if (nextUnmapped) {
                      setCurrentMappingFileId(nextUnmapped.id);
                    } else {
                      setStep('validation');
                      validateFiles();
                    }
                  }}
                  onSkip={() => {
                    const nextUnmapped = csvFiles.find(f => f.id !== fileToMap.id && !f.csvMapping);
                    if (nextUnmapped) {
                      setCurrentMappingFileId(nextUnmapped.id);
                    } else {
                      setStep('validation');
                      validateFiles();
                    }
                  }}
                />
              </div>
            );
          })()}

          {step === 'validation' && (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Validation Results</h3>
              <div className="space-y-3">
                {files.map((f) => (
                  <div key={f.id} className={`p-4 rounded-lg border ${f.status === 'valid' ? 'bg-green-50 border-green-200' : f.status === 'invalid' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      {f.status === 'valid' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                      {f.status === 'invalid' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{f.file.name}</p>
                        {f.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {f.errors.map((err, i) => (
                              <p key={i} className="text-sm text-red-600">• {err}</p>
                            ))}
                          </div>
                        )}
                        {f.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {f.warnings.map((warn, i) => (
                              <p key={i} className="text-sm text-yellow-600">⚠ {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Ready to Upload</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{files.filter((f) => f.status === 'valid').length}</strong> files will be uploaded and processed.
                  {files.filter((f) => f.status === 'invalid').length > 0 && ` ${files.filter((f) => f.status === 'invalid').length} files have errors and will be skipped.`}
                </p>
              </div>
              <div className="space-y-2">
                {files.filter((f) => f.status === 'valid').map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{f.file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={() => {
              const steps: WizardStep[] = ['upload', 'preview', 'mapping', 'validation', 'confirm'];
              const idx = steps.indexOf(step);
              if (idx > 0) setStep(steps[idx - 1]);
            }}
            disabled={step === 'upload'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step !== 'confirm' && (
            <button
              onClick={() => {
                if (step === 'upload') setStep('preview');
                else if (step === 'preview') setStep('mapping');
                else if (step === 'mapping') validateFiles();
              }}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={uploading || !canProceed()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {files.filter((f) => f.status === 'valid').length} Files
                </>
              )}
            </button>
          )}
        </div>

        {/* Sacred Code */}
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-mono text-gray-500 text-center">Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)</p>
        </div>
      </div>
    </div>
  );
}

function getStepNumber(step: WizardStep): number {
  const steps: WizardStep[] = ['upload', 'preview', 'mapping', 'validation', 'confirm'];
  return steps.indexOf(step) + 1;
}
