/**
 * EGOS v.2 - Investigations Hook
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * TanStack Query hook for managing criminal investigations
 * 
 * Features:
 * - List investigations (with filters)
 * - Create new investigation
 * - Get investigation details
 * - Update investigation
 * - Link documents to investigation
 * - List investigation documents
 * - Get templates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const INTELINK_API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8000/api/v1'

// Types
export interface Investigation {
  id: string
  title: string
  description: string
  template_id: string | null
  case_number: string | null
  status: 'active' | 'under_review' | 'closed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  team_members: string[]
  metadata: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
  closed_at: string | null
  document_count: number
}

export interface InvestigationCreate {
  title: string
  description: string
  template_id?: string
  case_number?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  team_members?: string[]
  metadata?: Record<string, any>
}

export interface InvestigationUpdate {
  title?: string
  description?: string
  status?: 'active' | 'under_review' | 'closed' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  team_members?: string[]
  metadata?: Record<string, any>
}

export interface InvestigationTemplate {
  id: string
  name: string
  description: string
  entity_types: string[]
  relationship_types: string[]
  queries: Array<{
    name: string
    cypher: string
    description: string
  }>
  visualization_config: Record<string, any>
  suggested_sources: string[]
}

export interface InvestigationDocument {
  link_id: string
  document_id: string
  filename: string
  status: string
  role: string
  added_by: string
  added_at: string
  notes: string | null
}

// Helper to get auth token (adjust based on your auth system)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  // BYPASS MODE FOR TESTING - Remove in production
  return 'test-bypass-token'
  // return localStorage.getItem('intelink_token') || null
}

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Normalize incoming headers into plain object (covers Headers, array and object)
  if (options.headers) {
    const h = options.headers as any
    if (typeof h?.forEach === 'function') {
      h.forEach((v: string, k: string) => { headers[k] = v })
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) headers[k] = String(v)
    } else if (typeof h === 'object') {
      Object.assign(headers, h)
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  console.log('🔍 [fetchWithAuth] Request:', {
    url,
    method: options.method || 'GET',
    headers,
    bodyPreview: options.body ? (options.body as string).substring(0, 200) : null
  })

  const response = await fetch(url, { ...options, headers })

  console.log('📡 [fetchWithAuth] Response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  })

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await response.json();
        if (json && typeof json === 'object' && Object.keys(json).length > 0) {
          detail = (json.detail || json.message || JSON.stringify(json)).toString();
        }
      } else {
        const text = await response.text();
        if (text && text.trim().length > 0) detail = text.slice(0, 300);
      }
    } catch (_) {
      // ignore parse errors
    }
    console.error('❌ [fetchWithAuth] Error:', { status: response.status, statusText: response.statusText, url, detail });
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }

  const data = await response.json()
  console.log('✅ [fetchWithAuth] Success:', data)
  return data
}

/**
 * List investigations with optional filters
 */
export function useInvestigations(params?: {
  status?: string
  template_id?: string
  offset?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['investigations', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.append('status', params.status)
      if (params?.template_id) searchParams.append('template_id', params.template_id)
      if (params?.offset !== undefined) searchParams.append('offset', params.offset.toString())
      if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString())

      const url = `${INTELINK_API_URL}/investigations?${searchParams}`
      return fetchWithAuth(url)
    },
  })
}

/**
 * Get single investigation by ID
 */
export function useInvestigation(id: string | null) {
  return useQuery({
    queryKey: ['investigation', id],
    queryFn: async () => {
      if (!id) throw new Error('Investigation ID required')
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/${id}`)
    },
    enabled: !!id,
  })
}

/**
 * Create new investigation
 */
export function useCreateInvestigation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InvestigationCreate) => {
      return fetchWithAuth(`${INTELINK_API_URL}/investigations`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      // Invalidate investigations list
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
    },
  })
}

/**
 * Update investigation
 */
export function useUpdateInvestigation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InvestigationUpdate) => {
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      // Invalidate this investigation and list
      queryClient.invalidateQueries({ queryKey: ['investigation', id] })
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
    },
  })
}

/**
 * Get list of available templates
 */
export function useInvestigationTemplates() {
  return useQuery({
    queryKey: ['investigation-templates'],
    queryFn: async () => {
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/templates/list`)
    },
  })
}

/**
 * Get template details
 */
export function useInvestigationTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['investigation-template', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('Template ID required')
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/templates/${templateId}`)
    },
    enabled: !!templateId,
  })
}

/**
 * List documents linked to investigation
 */
export function useInvestigationDocuments(investigationId: string | null) {
  return useQuery({
    queryKey: ['investigation-documents', investigationId],
    queryFn: async () => {
      if (!investigationId) throw new Error('Investigation ID required')
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/${investigationId}/documents`)
    },
    enabled: !!investigationId,
  })
}

/**
 * Link document to investigation
 */
export function useLinkDocumentToInvestigation(investigationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      document_id: string
      role?: string
      notes?: string
    }) => {
      return fetchWithAuth(`${INTELINK_API_URL}/investigations/${investigationId}/documents`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      // Invalidate investigation documents and investigation itself (to update doc count)
      queryClient.invalidateQueries({ queryKey: ['investigation-documents', investigationId] })
      queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] })
    },
  })
}
