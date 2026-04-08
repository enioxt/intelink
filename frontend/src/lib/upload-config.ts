export const UPLOAD_CONFIG = {
  maxFileSizeMB: 50,
  maxFileSizeBytes: 50 * 1024 * 1024,
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'audio/webm',
    'video/mp4',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.mp3', '.mp4', '.webm'],
};

export const MAX_FILE_SIZE_DISPLAY = '50MB';
export const MAX_FILES_PER_BATCH = 10;
export const ACCEPTED_EXTENSIONS = UPLOAD_CONFIG.allowedExtensions.join(',');

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > UPLOAD_CONFIG.maxFileSizeBytes) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_DISPLAY}` };
  }
  if (!isAllowedFileType(file)) {
    return { valid: false, error: `Tipo não permitido. Use: ${ACCEPTED_EXTENSIONS}` };
  }
  return { valid: true };
}

export function isAllowedFileType(file: File): boolean {
  return UPLOAD_CONFIG.allowedTypes.includes(file.type) ||
    UPLOAD_CONFIG.allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}
