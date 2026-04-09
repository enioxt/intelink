'use client';

import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ 
  children, 
  className, 
  elevated = false,
  hover = false,
  onClick
}: GlassCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white/[0.03] border border-white/[0.06] rounded-xl p-5",
        elevated && "bg-[#050508]/85 border-white/[0.12] backdrop-blur-xl",
        hover && "hover:border-white/[0.12] transition-colors cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
