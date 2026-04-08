/**
 * Intelink TypeScript Type Definitions
 * Centralized type definitions for the Intelink application
 * Sacred Code: 000.111.369.963.1618
 */

// ==========================================
// File Management Types
// ==========================================

export interface StagedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  docId?: string;
  source: 'upload' | 'db';
  description: string;
}

// ==========================================
// Chat UI Types
// ==========================================

export type ChatbotSize = 'small' | 'medium' | 'full';

export type ChatScope = 'all' | 'investigation' | 'delegacias' | 'custom';

// ==========================================
// Navigation Types
// ==========================================

export type Page = 'dashboard' | 'analysis' | 'jobs' | 'upload' | 'settings' | 'graph' | 'search';

// ==========================================
// Investigation Types
// ==========================================

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  status?: 'active' | 'archived' | 'closed';
}

// ==========================================
// Document Types
// ==========================================

export interface Document {
  id: string;
  title: string;
  filename?: string;
  content?: string;
  file_path?: string;
  mime_type?: string;
  size?: number;
  created_at: string;
  investigation_id?: string;
  atrian_issues?: ATRiANIssue[];
  entities?: Entity[];
  status?: string;
  atrian_compliant?: boolean;
  source?: string;
  ethik_score?: number;
  ethik_baseline?: number;
  ethik_delta?: number;
  metadata?: Record<string, any>;
}

// ==========================================
// Entity Types
// ==========================================

export type EntityType = 'person' | 'company' | 'organization' | 'location' | 'date' | 'event' | 'concept' | 'document';

export interface Entity {
  id: string;
  name: string;
  type: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// ==========================================
// Relationship Types
// ==========================================

export interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// ==========================================
// Search Types
// ==========================================

export interface SearchResult {
  id: string;
  title: string;
  snippet?: string;
  relevance?: number;
  type: 'document' | 'entity' | 'investigation';
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  investigation_id?: string;
  document_types?: string[];
  entity_types?: string[];
  date_from?: string;
  date_to?: string;
  status?: string[];
  atrian_compliant?: boolean;
  ethik_score_min?: number;
  ethik_score_max?: number;
  source?: string;
}

export interface SearchQuery {
  q: string;
  filters?: SearchFilters;
  sort?: string;
  page?: number;
  per_page?: number;
  limit?: number;
}

// ==========================================
// Job Types
// ==========================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress?: number;
  total?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

// ==========================================
// Statistics Types
// ==========================================

export interface Stats {
  documents: number;
  entities: number;
  relationships: number;
  investigations: number;
}

// ==========================================
// Graph Types
// ==========================================

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ==========================================
// API Response Types
// ==========================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// ATRiAN Types
export interface ATRiANIssue {
  id: string;
  title: string;
  rule?: string;
  message?: string;
  suggestion?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
}
