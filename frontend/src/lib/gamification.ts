/**
 * Gamification System — Adaptado de 852
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Points, ranks, and reputation system
 */

// Rank definitions
export type Rank = 
  | 'Recruta' 
  | 'Soldado' 
  | 'Cabo' 
  | 'Sargento' 
  | 'Subtenente' 
  | 'Tenente' 
  | 'Capitão' 
  | 'Major' 
  | 'Tenente Coronel' 
  | 'Coronel' 
  | 'Comissário';

export interface RankInfo {
  name: Rank;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
}

export const RANKS: RankInfo[] = [
  { name: 'Recruta', minPoints: 0, maxPoints: 99, icon: '🌱', color: '#9CA3AF' },
  { name: 'Soldado', minPoints: 100, maxPoints: 249, icon: '🥉', color: '#6B7280' },
  { name: 'Cabo', minPoints: 250, maxPoints: 499, icon: '🥈', color: '#4B5563' },
  { name: 'Sargento', minPoints: 500, maxPoints: 999, icon: '🥇', color: '#374151' },
  { name: 'Subtenente', minPoints: 1000, maxPoints: 1999, icon: '⚡', color: '#F59E0B' },
  { name: 'Tenente', minPoints: 2000, maxPoints: 3999, icon: '⭐', color: '#FBBF24' },
  { name: 'Capitão', minPoints: 4000, maxPoints: 6999, icon: '🌟', color: '#FCD34D' },
  { name: 'Major', minPoints: 7000, maxPoints: 10999, icon: '🔥', color: '#EF4444' },
  { name: 'Tenente Coronel', minPoints: 11000, maxPoints: 15999, icon: '💎', color: '#EC4899' },
  { name: 'Coronel', minPoints: 16000, maxPoints: 21999, icon: '👑', color: '#8B5CF6' },
  { name: 'Comissário', minPoints: 22000, maxPoints: Infinity, icon: '🏆', color: '#3B82F6' },
];

// Points configuration
export const POINTS = {
  LOGIN_DAILY: 10,
  SEARCH_PERFORM: 5,
  DOCUMENT_UPLOAD: 20,
  DOCUMENT_ANALYZE: 30,
  ENTITY_CREATE: 15,
  LINK_CREATE: 10,
  REPORT_SHARE: 25,
  SUGGESTION_ACCEPTED: 50,
  INVITE_USER: 100,
} as const;

export interface UserGamification {
  points: number;
  rank: Rank;
  nextRankPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalActions: number;
}

// Calculate rank from points
export function calculateRank(points: number): RankInfo {
  for (const rank of RANKS) {
    if (points >= rank.minPoints && points <= rank.maxPoints) {
      return rank;
    }
  }
  return RANKS[RANKS.length - 1];
}

// Calculate progress to next rank (0-100)
export function calculateRankProgress(points: number): number {
  const currentRank = calculateRank(points);
  if (currentRank.maxPoints === Infinity) return 100;
  
  const range = currentRank.maxPoints - currentRank.minPoints;
  const progress = points - currentRank.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}

// Add points and return new state
export function addPoints(
  current: UserGamification, 
  action: keyof typeof POINTS
): UserGamification {
  const newPoints = current.points + POINTS[action];
  const newRank = calculateRank(newPoints);
  
  return {
    ...current,
    points: newPoints,
    rank: newRank.name,
    nextRankPoints: newRank.maxPoints === Infinity ? newPoints : newRank.maxPoints + 1,
    weeklyPoints: current.weeklyPoints + POINTS[action],
    monthlyPoints: current.monthlyPoints + POINTS[action],
    totalActions: current.totalActions + 1,
  };
}

// Get leaderboard position color
export function getLeaderboardColor(position: number): string {
  if (position === 1) return '#FFD700'; // Gold
  if (position === 2) return '#C0C0C0'; // Silver
  if (position === 3) return '#CD7F32'; // Bronze
  return '#6B7280'; // Gray
}

// Format points with separators
export function formatPoints(points: number): string {
  return points.toLocaleString('pt-BR');
}

export default {
  RANKS,
  POINTS,
  calculateRank,
  calculateRankProgress,
  addPoints,
  getLeaderboardColor,
  formatPoints,
};
