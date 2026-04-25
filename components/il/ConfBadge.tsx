'use client';

import { CONF, type ConfidenceKind } from '@/lib/design/tokens';

interface Props {
  kind: ConfidenceKind;
  withLabel?: boolean;
}

export function ConfBadge({ kind, withLabel = false }: Props) {
  const c = CONF[kind] ?? CONF.unconfirmed;
  return (
    <span
      title={c.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        padding: withLabel ? '2px 6px' : 0,
        color: c.color,
        fontFamily: 'var(--font-mono)',
        background: withLabel ? c.color + '15' : 'transparent',
        border: withLabel ? `1px solid ${c.color}30` : 'none',
        borderRadius: 4,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ fontSize: 8 }}>{c.mark}</span>
      {withLabel && c.label}
    </span>
  );
}
