'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { IL } from '@/lib/design/tokens';

type NavId = 'dash' | 'invest' | 'central' | 'reports';

interface Props { active?: NavId; }

const NAV: { id: NavId; label: string; href: string }[] = [
  { id: 'dash',    label: 'Início',     href: '/' },
  { id: 'invest',  label: 'Operações',  href: '/' },
  { id: 'central', label: 'Central',    href: '/central' },
  { id: 'reports', label: 'Relatórios', href: '/reports' },
];

const MENU_ITEMS = [
  { label: 'Meu Perfil',       href: '/profile',          icon: '👤' },
  { label: 'Minhas Atividades',href: '/activity',          icon: '📊' },
  { label: 'Alterar Senha',    href: '/settings/security', icon: '🔐' },
  { label: 'Configurações',    href: '/settings/pin',      icon: '⚙️'  },
];

export function ILHeader({ active }: Props) {
  const { member, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = member?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'IL';

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const openSearch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__ilOpenSearch?.();
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 28,
      padding: '14px 32px', borderBottom: `1px solid ${IL.border}`,
      background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${IL.cyan}, ${IL.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: IL.bg1 }}>IL</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: IL.ink, letterSpacing: '-0.01em' }}>Intelink</div>
          <div style={{ fontSize: 9, color: IL.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inteligência Policial</div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
        {NAV.map(n => (
          <Link key={n.id} href={n.href} style={{ padding: '6px 12px', fontSize: 13, color: active === n.id ? IL.cyan : IL.ink2, textDecoration: 'none', borderRadius: 6, background: active === n.id ? 'rgba(6,182,212,0.10)' : 'transparent' }}>{n.label}</Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <button onClick={openSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'transparent', border: `1px solid ${IL.border}`, borderRadius: 8, color: IL.ink2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
        <span>Buscar</span>
        <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 3, color: IL.ink2 }}>Ctrl+K</kbd>
      </button>

      {/* User menu */}
      {member && (
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: IL.ink, fontWeight: 500 }}>{member.name?.split(' ')[0]}</div>
              <div style={{ fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{member.system_role}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: menuOpen ? IL.cyan : IL.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: menuOpen ? IL.bg1 : IL.cyan, fontFamily: 'var(--font-mono)', border: `1px solid ${menuOpen ? IL.cyan : IL.border}`, transition: 'all 150ms' }}>
              {initials}
            </div>
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 100 }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${IL.border}`, background: IL.bg2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: IL.ink }}>{member.name}</div>
                <div style={{ fontSize: 11, color: IL.ink2, marginTop: 2 }}>{member.system_role === 'super_admin' ? 'Super Admin' : member.system_role}</div>
              </div>

              {/* Items */}
              <div style={{ padding: '6px 0' }}>
                {MENU_ITEMS.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', color: IL.ink, fontSize: 13, textDecoration: 'none', transition: 'background 100ms' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(6,182,212,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Separator + logout */}
              <div style={{ borderTop: `1px solid ${IL.border}`, padding: '6px 0' }}>
                <button onClick={() => { setMenuOpen(false); logout(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', width: '100%', color: IL.red, fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 100ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                  <span style={{ fontSize: 14 }}>🚪</span>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
