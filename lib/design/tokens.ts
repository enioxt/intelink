/**
 * Intelink Design Tokens
 * Single source of truth for all design values.
 * Used in TSX components via Tailwind classes or inline styles.
 */

export const IL = {
  // Backgrounds
  bg0: '#020617',   // darkest
  bg1: '#0f172a',
  bg2: '#1e293b',

  // Surfaces
  surf:  'rgba(15,23,42,0.5)',
  surf2: 'rgba(30,41,59,0.55)',

  // Borders
  border:      'rgba(148,163,184,0.10)',
  borderHover: 'rgba(6,182,212,0.30)',

  // Ink
  ink:  '#e2e8f0',
  ink2: '#94a3b8',
  dim:  '#64748b',

  // Brand
  cyan:    '#06b6d4',
  cyanDim: '#0891b2',
  blue:    '#3b82f6',

  // Status
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  purple:  '#a78bfa',
} as const;

export type ILColor = typeof IL[keyof typeof IL];

// Confidence levels — matches confidence.ts in lib/intelink/confidence.ts
export const CONF = {
  reds:        { color: '#3b82f6', label: 'REDS_OFICIAL',   mark: '●' },
  confirmed:   { color: '#10b981', label: 'CONFIRMADO',      mark: '●' },
  probable:    { color: '#f59e0b', label: 'PROVÁVEL',        mark: '●' },
  unconfirmed: { color: '#fb923c', label: 'NÃO CONFIRMADO',  mark: '○' },
} as const;

export type ConfidenceKind = keyof typeof CONF;

// Tailwind class helpers (avoids repeating long strings)
export const TW = {
  page: 'min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-slate-200',
  card: 'bg-slate-900/50 border border-slate-800/60 rounded-xl',
  cardHover: 'hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all duration-150',
  mono: 'font-mono',
  label: 'text-[10px] font-mono uppercase tracking-widest text-slate-500',
  cyantag: 'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
} as const;
