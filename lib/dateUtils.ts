/**
 * Date Utilities — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Date formatting and manipulation utilities
 */

// Format date to Brazilian locale
export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format date with time
export function formatDateTimeBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format relative time ("2 hours ago", "3 days ago")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffHour < 24) return `${diffHour} horas atrás`;
  if (diffDay < 7) return `${diffDay} dias atrás`;
  if (diffWeek < 4) return `${diffWeek} semanas atrás`;
  if (diffMonth < 12) return `${diffMonth} meses atrás`;
  return `${diffYear} anos atrás`;
}

// Parse Brazilian date (DD/MM/YYYY)
export function parseDateBR(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Get date range for filters
export function getDateRange(
  preset: 'today' | 'week' | 'month' | 'quarter' | 'year'
): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from.setMonth(from.getMonth() - 1);
      break;
    case 'quarter':
      from.setMonth(from.getMonth() - 3);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return { from, to };
}

// Format ISO date for API
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Check if date is valid
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// Add days to date
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Get age from date
export function getAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

export default {
  formatDateBR,
  formatDateTimeBR,
  formatRelativeTime,
  parseDateBR,
  getDateRange,
  toISODate,
  isValidDate,
  addDays,
  getAge,
};
