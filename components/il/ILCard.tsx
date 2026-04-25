'use client';

import { IL } from '@/lib/design/tokens';

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ILCard({ children, style = {}, hover = true, onClick, className }: Props) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: IL.surf,
        border: `1px solid ${IL.border}`,
        borderRadius: 12,
        padding: 16,
        transition: 'all 150ms',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = IL.borderHover;
        (e.currentTarget as HTMLDivElement).style.background = IL.surf2;
      } : undefined}
      onMouseLeave={hover ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = IL.border;
        (e.currentTarget as HTMLDivElement).style.background = IL.surf;
      } : undefined}
    >
      {children}
    </div>
  );
}
