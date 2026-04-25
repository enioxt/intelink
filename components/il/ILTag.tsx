'use client';

import { IL } from '@/lib/design/tokens';

interface Props {
  children: React.ReactNode;
  color?: string;
}

export function ILTag({ children, color }: Props) {
  const c = color ?? IL.ink2;
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 7px',
        borderRadius: 4,
        background: c + '15',
        color: c,
        border: `1px solid ${c}30`,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </span>
  );
}
