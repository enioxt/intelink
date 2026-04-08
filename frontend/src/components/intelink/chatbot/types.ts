
export type StagedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  docId?: string;
  source: 'upload' | 'db';
  description: string;
};

export type ChatbotSize = 'small' | 'medium' | 'full';

export type ChatScope = 'all' | 'investigation' | 'delegacias' | 'custom';
