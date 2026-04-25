'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { IL } from '@/lib/design/tokens';

type NavId = 'dash' | 'invest' | 'central' | 'reports';

interface Props {
  active?: NavId;
}

const NAV: { id: NavId; label: string; href: string }[] = [
  { id: 'dash',    label: 'Início',     href: '/' },
  { id: 'invest',  label: 'Operações',  href: '/#operacoes' },
  { id: 'central', label: 'Central',    href: '/central' },
  { id: 'reports', label: 'Relatórios', href: '/reports' },
];

export function ILHeader({ active }: Props) {
  const { member, logout } = useAuth();
  const initials = member?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'IL';

  const openSearch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__ilOpenSearch?.();
  };

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 28,
        padding: '14px 32px', borderBottom: `1px solid ${IL.border}`,
        background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${IL.cyan}, ${IL.blue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: IL.bg1,
        }}>IL</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: IL.ink, letterSpacing: '-0.01em' }}>Intelink</div>
          <div style={{ fontSize: 9, color: IL.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inteligência Policial</div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
        {NAV.map(n => (
          <Link key={n.id} href={n.href} style={{
            padding: '6px 12px', fontSize: 13,
            color: active === n.id ? IL.cyan : IL.ink2,
            textDecoration: 'none', borderRadius: 6,
            background: active === n.id ? 'rgba(6,182,212,0.10)' : 'transparent',
          }}>{n.label}</Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Search trigger */}
      <button onClick={openSearch} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
        background: 'transparent', border: `1px solid ${IL.border}`, borderRadius: 8,
        color: IL.ink2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <span>Buscar</span>
        <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 3, color: IL.ink2 }}>Ctrl+K</kbd>
      </button>

      {/* User */}
      {member && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: IL.ink }}>{member.name}</div>
            <div style={{ fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)' }}>{member.system_role}</div>
          </div>
          <button
            onClick={logout}
            title="Sair"
            style={{
              width: 32, height: 32, borderRadius: '50%', background: IL.bg2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: IL.cyan, fontFamily: 'var(--font-mono)',
              border: `1px solid ${IL.border}`, cursor: 'pointer',
            }}
          >{initials}</button>
        </div>
      )}
    </header>
  );
}
