export function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const norm = normalizeSearchTerm(query);
  return normalizeSearchTerm(text).includes(norm);
}

export function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
