export type ListParams = { page?: number; page_size?: number; q?: string };

const BASE_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8000/api/v1';
const DEMO_TOKEN = process.env.NEXT_PUBLIC_INTELINK_DEMO_TOKEN;

function authHeaders(token?: string): Record<string, string> {
  const t = token || DEMO_TOKEN;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function listDocuments(params: ListParams = {}, token?: string) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {} as Record<string, string>)
  ).toString();
  const url = `${BASE_URL}/docs${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`);
  return res.json();
}

export async function getDocument(id: string, token?: string) {
  const res = await fetch(`${BASE_URL}/docs/${id}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getDocument failed: ${res.status}`);
  return res.json();
}

export async function uploadDocument(file: File, metadata: Record<string, any> = {}, token?: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('metadata', JSON.stringify(metadata));
  const res = await fetch(`${BASE_URL}/ingest/file`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: fd,
  });
  if (!res.ok) throw new Error(`uploadDocument failed: ${res.status}`);
  return res.json();
}

export async function getEgoGraph(entityId: string, depth = 2, token?: string) {
  const qs = new URLSearchParams({ entity_id: entityId, depth: String(depth) }).toString();
  const res = await fetch(`${BASE_URL}/graph/ego?${qs}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getEgoGraph failed: ${res.status}`);
  return res.json();
}

export async function listJobs(params: ListParams = {}, token?: string) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {} as Record<string, string>)
  ).toString();
  const res = await fetch(`${BASE_URL}/jobs${qs ? `?${qs}` : ''}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`listJobs failed: ${res.status}`);
  return res.json();
}

export async function getHealth(token?: string) {
  const res = await fetch(`${BASE_URL}/health`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getHealth failed: ${res.status}`);
  return res.json();
}

export async function getStats(token?: string) {
  const res = await fetch(`${BASE_URL}/stats`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getStats failed: ${res.status}`);
  return res.json();
}

export async function ingestContent(content: string, metadata: Record<string, any> = {}, token?: string) {
  const res = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify({ content, metadata }),
  });
  if (!res.ok) throw new Error(`ingestContent failed: ${res.status}`);
  return res.json();
}

export async function searchDocuments(query: string, filters: Record<string, any> = {}, token?: string) {
  const body = { query, ...filters };
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`searchDocuments failed: ${res.status}`);
  return res.json();
}

export async function getJobById(jobId: string, token?: string) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getJobById failed: ${res.status}`);
  return res.json();
}

export async function requeueJob(jobId: string, token?: string) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/requeue`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`requeueJob failed: ${res.status}`);
  return res.json();
}

export async function cancelJob(jobId: string, token?: string) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`cancelJob failed: ${res.status}`);
  return res.json();
}

export async function deleteDocument(id: string, token?: string) {
  const res = await fetch(`${BASE_URL}/docs/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`deleteDocument failed: ${res.status}`);
  return res.json();
}

// Investigation APIs
export async function listInvestigations(params: ListParams = {}, token?: string) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {} as Record<string, string>)
  ).toString();
  const res = await fetch(`${BASE_URL}/investigations${qs ? `?${qs}` : ''}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`listInvestigations failed: ${res.status}`);
  return res.json();
}

export async function getInvestigation(id: string, token?: string) {
  const res = await fetch(`${BASE_URL}/investigations/${id}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getInvestigation failed: ${res.status}`);
  return res.json();
}

export async function createInvestigation(data: { title: string; description?: string }, token?: string) {
  const res = await fetch(`${BASE_URL}/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createInvestigation failed: ${res.status}`);
  return res.json();
}

export async function updateInvestigation(id: string, data: { title?: string; description?: string }, token?: string) {
  const res = await fetch(`${BASE_URL}/investigations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateInvestigation failed: ${res.status}`);
  return res.json();
}

export async function deleteInvestigation(id: string, token?: string) {
  const res = await fetch(`${BASE_URL}/investigations/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`deleteInvestigation failed: ${res.status}`);
  return res.json();
}

// Export APIs
export async function exportInvestigation(id: string, format: 'md' | 'html' | 'pdf', token?: string) {
  const res = await fetch(`${BASE_URL}/investigations/${id}/export?format=${format}`, {
    headers: { ...authHeaders(token) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`exportInvestigation failed: ${res.status}`);
  return res.text();
}

// Chat API
export async function sendChatMessage(messages: any[], context?: any, token?: string) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) throw new Error(`sendChatMessage failed: ${res.status}`);
  return res.json();
}

// Entity APIs
export async function getEntity(id: string, token?: string) {
  const res = await fetch(`${BASE_URL}/entity/${id}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`getEntity failed: ${res.status}`);
  return res.json();
}

export async function searchEntities(query: string, token?: string) {
  const res = await fetch(`${BASE_URL}/entity/search?q=${encodeURIComponent(query)}`, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`searchEntities failed: ${res.status}`);
  return res.json();
}

// Pattern APIs
export async function runPatterns(entityId?: string, token?: string) {
  const url = entityId ? `${BASE_URL}/patterns?entity_id=${entityId}` : `${BASE_URL}/patterns`;
  const res = await fetch(url, { headers: { ...authHeaders(token) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`runPatterns failed: ${res.status}`);
  return res.json();
}

// Analytics API
export async function trackPageView(page: string, referrer: string = '', token?: string) {
  const res = await fetch(`${BASE_URL}/analytics/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ page, referrer }),
  });
  if (!res.ok) throw new Error(`trackPageView failed: ${res.status}`);
  return res.json();
}

// Export default client object for convenience
export const intelinkClient = {
  listDocuments,
  getDocument,
  deleteDocument,
  uploadDocument,
  getEgoGraph,
  listJobs,
  getHealth,
  getStats,
  ingestContent,
  searchDocuments,
  getJobById,
  requeueJob,
  cancelJob,
  // New APIs
  listInvestigations,
  getInvestigation,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
  exportInvestigation,
  sendChatMessage,
  getEntity,
  searchEntities,
  runPatterns,
  trackPageView,
};
