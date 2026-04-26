'use client';

/**
 * DrillDownSheet — side panel for entity detail without losing context.
 * Adapted from egos-7 hq-components.tsx (HQ design pack) using IL tokens.
 *
 * Behavior:
 * - Click backdrop → close
 * - Esc → close
 * - "Open full page" CTA → navigate to canonical detail route
 *
 * Use case: Central/Pessoas row click opens here instead of full navigation.
 */

import { useEffect } from 'react';
import { IL } from '@/lib/design/tokens';

interface Props {
    title: string;
    subtitle?: string;
    fullPageHref?: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}

export function DrillDownSheet({ title, subtitle, fullPageHref, onClose, children, width = 480 }: Props) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(2,6,23,0.6)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 400,
                }}
            />

            {/* Sheet */}
            <div
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: `min(${width}px, 92vw)`,
                    background: IL.bg1,
                    borderLeft: `1px solid ${IL.border}`,
                    zIndex: 450,
                    overflowY: 'auto',
                    boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
                    fontFamily: 'var(--font-inter)',
                    color: IL.ink,
                }}
            >
                {/* Sticky header */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    background: IL.bg1,
                    padding: '16px 20px',
                    borderBottom: `1px solid ${IL.border}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: IL.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                        </div>
                        {subtitle && (
                            <div style={{ fontSize: 11, color: IL.ink2, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                {subtitle}
                            </div>
                        )}
                    </div>
                    {fullPageHref && (
                        <a
                            href={fullPageHref}
                            style={{
                                padding: '6px 12px',
                                background: IL.cyan, color: IL.bg1,
                                borderRadius: 6, fontSize: 12, fontWeight: 600,
                                textDecoration: 'none', whiteSpace: 'nowrap',
                            }}
                        >
                            Página completa →
                        </a>
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        style={{
                            background: 'transparent', border: 'none',
                            color: IL.ink2, cursor: 'pointer',
                            fontSize: 22, lineHeight: 1,
                            padding: 4,
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '18px 20px' }}>{children}</div>

                {/* Footer hint */}
                <div style={{
                    padding: '10px 20px', borderTop: `1px solid ${IL.border}`,
                    fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                    Esc fecha · click fora fecha
                </div>
            </div>
        </>
    );
}
