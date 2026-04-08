export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function truncate(str: string, maxLen = 100): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return formatDate(d);
}

export interface Investigation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at?: string;
  entity_count?: number;
  document_count?: number;
}

export function isInvestigationIncomplete(inv: Investigation): boolean {
  return inv.status === 'draft' || (inv.entity_count ?? 0) === 0;
}
