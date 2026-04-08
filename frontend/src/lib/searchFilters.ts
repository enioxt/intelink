/**
 * Search Filters — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Advanced search filtering and query building
 */

export interface SearchFilters {
  entityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  riskScoreMin?: number;
  riskScoreMax?: number;
  hasContracts?: boolean;
  isPEP?: boolean;
  isSanctioned?: boolean;
  states?: string[];
  sources?: string[];
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

// Entity type options
export const ENTITY_TYPE_OPTIONS: FilterOption[] = [
  { value: 'Person', label: 'Pessoa' },
  { value: 'Company', label: 'Empresa' },
  { value: 'Organization', label: 'Organização' },
  { value: 'Contract', label: 'Contrato' },
  { value: 'Partner', label: 'Sócio' },
  { value: 'Politician', label: 'Político' },
];

// State options (Brazil)
export const STATE_OPTIONS: FilterOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// Source options
export const SOURCE_OPTIONS: FilterOption[] = [
  { value: 'transparencia', label: 'Portal Transparência' },
  { value: 'receita', label: 'Receita Federal' },
  { value: 'tce', label: 'Tribunal de Contas' },
  { value: 'licitacoes', label: 'Licitações' },
  { value: 'convenios', label: 'Convênios' },
  { value: 'sancoes', label: 'Sanções' },
  { value: 'ceis', label: 'CEIS (Inidôneos)' },
];

// Build query string from filters
export function buildQueryString(
  baseQuery: string,
  filters: SearchFilters
): string {
  const parts: string[] = [baseQuery];

  if (filters.entityTypes?.length) {
    parts.push(`type:(${filters.entityTypes.join(' OR ')})`);
  }

  if (filters.dateFrom || filters.dateTo) {
    const range = `date:[${filters.dateFrom || '*'} TO ${filters.dateTo || '*'}]`;
    parts.push(range);
  }

  if (filters.riskScoreMin !== undefined || filters.riskScoreMax !== undefined) {
    const min = filters.riskScoreMin ?? 0;
    const max = filters.riskScoreMax ?? 100;
    parts.push(`risk_score:[${min} TO ${max}]`);
  }

  if (filters.hasContracts) {
    parts.push('has_contracts:true');
  }

  if (filters.isPEP) {
    parts.push('is_pep:true');
  }

  if (filters.isSanctioned) {
    parts.push('is_sanctioned:true');
  }

  if (filters.states?.length) {
    parts.push(`state:(${filters.states.join(' OR ')})`);
  }

  if (filters.sources?.length) {
    parts.push(`source:(${filters.sources.join(' OR ')})`);
  }

  return parts.join(' AND ');
}

// Parse query string into filters
export function parseQueryString(query: string): {
  baseQuery: string;
  filters: SearchFilters;
} {
  const filters: SearchFilters = {};
  const parts = query.split(/\s+AND\s+/i);
  const baseQueryParts: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();

    // Check for type filter
    const typeMatch = trimmed.match(/^type:\(([^)]+)\)$/i);
    if (typeMatch) {
      filters.entityTypes = typeMatch[1].split(/\s+OR\s+/i).map(s => s.trim());
      continue;
    }

    // Check for date range
    const dateMatch = trimmed.match(/^date:\[([^\]]+)\]$/i);
    if (dateMatch) {
      const [from, to] = dateMatch[1].split(/\s+TO\s+/i);
      if (from && from !== '*') filters.dateFrom = from.trim();
      if (to && to !== '*') filters.dateTo = to.trim();
      continue;
    }

    // Check for risk score
    const riskMatch = trimmed.match(/^risk_score:\[(\d+)\s+TO\s+(\d+)\]$/i);
    if (riskMatch) {
      filters.riskScoreMin = parseInt(riskMatch[1], 10);
      filters.riskScoreMax = parseInt(riskMatch[2], 10);
      continue;
    }

    // Check for state
    const stateMatch = trimmed.match(/^state:\(([^)]+)\)$/i);
    if (stateMatch) {
      filters.states = stateMatch[1].split(/\s+OR\s+/i).map(s => s.trim());
      continue;
    }

    // Check for boolean flags
    if (trimmed === 'has_contracts:true') {
      filters.hasContracts = true;
      continue;
    }
    if (trimmed === 'is_pep:true') {
      filters.isPEP = true;
      continue;
    }
    if (trimmed === 'is_sanctioned:true') {
      filters.isSanctioned = true;
      continue;
    }

    // Otherwise, it's part of the base query
    baseQueryParts.push(trimmed);
  }

  return {
    baseQuery: baseQueryParts.join(' '),
    filters,
  };
}

// Check if filters are active
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    (filters.entityTypes?.length ?? 0) > 0 ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.riskScoreMin !== undefined ||
    filters.riskScoreMax !== undefined ||
    !!filters.hasContracts ||
    !!filters.isPEP ||
    !!filters.isSanctioned ||
    (filters.states?.length ?? 0) > 0 ||
    (filters.sources?.length ?? 0) > 0
  );
}

// Clear all filters
export function clearFilters(): SearchFilters {
  return {};
}

// Get active filter count
export function getActiveFilterCount(filters: SearchFilters): number {
  let count = 0;
  if (filters.entityTypes?.length) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.riskScoreMin !== undefined || filters.riskScoreMax !== undefined) count++;
  if (filters.hasContracts) count++;
  if (filters.isPEP) count++;
  if (filters.isSanctioned) count++;
  if (filters.states?.length) count++;
  if (filters.sources?.length) count++;
  return count;
}

export default {
  ENTITY_TYPE_OPTIONS,
  STATE_OPTIONS,
  SOURCE_OPTIONS,
  buildQueryString,
  parseQueryString,
  hasActiveFilters,
  clearFilters,
  getActiveFilterCount,
};
