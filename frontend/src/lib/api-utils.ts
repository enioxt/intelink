/**
 * API utility helpers for EGOS Inteligência frontend
 */

const API_BASE = process.env.NEXT_PUBLIC_INTELINK_API || '/api/v1';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function getSupabaseAdmin() {
  // Supabase admin client — configure SUPABASE_SERVICE_KEY in .env
  return null;
}

export function maskCPF(cpf: string): string {
  return cpf.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2');
}

export function maskCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})\.\d{3}\.\d{3}\/(\d{4})-(\d{2})/, '$1.***.***/$2-$3');
}
