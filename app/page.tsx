'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IL } from '@/lib/design/tokens';
import { ILCard } from '@/components/il/ILCard';
import { ILTag } from '@/components/il/ILTag';
import { ILHeader } from '@/components/il/ILHeader';
import { GlobalSearch } from '@/components/il/GlobalSearch';
import { PublicLanding } from '@/components/landing/PublicLanding';
import type { Investigation } from '@/lib/utils/formatters';

interface Stats { investigations: number; entities: number; relationships: number; evidence: number; }
interface Alert { id: number; severity: 'high' | 'medium' | 'low'; text: string; }
interface Member { id: string; name: string; role: string; system_role: string; }

const STARTERS = [
  'Quem tem mais vínculos no sistema?',
  'Últimas ocorrências de homicídio',
  'Pessoas em múltiplas operações',
  'Análise de centralidade da rede',
  'Fotos não vinculadas recentes',
  'Cruzamento por veículo',
];

export default function IntelinkHome() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [stats, setStats] = useState<Stats>({ investigations: 0, entities: 0, relationships: 0, evidence: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chatInput, setChatInput] = useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/v2/auth/verify', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.member) {
            setMember(data.member);
            const [statsRes, invRes] = await Promise.all([
              fetch('/api/stats', { credentials: 'include' }),
              fetch('/api/investigations?limit=6', { credentials: 'include' }),
            ]);
            if (statsRes.ok) {
              const s = await statsRes.json();
              setStats({ investigations: s.investigations || 0, entities: s.entities || 0, relationships: s.relationships || 0, evidence: s.evidence || 0 });
            }
            if (invRes.ok) {
              const iv = await invRes.json();
              setInvestigations((iv.investigations || []).sort((a: Investigation, b: Investigation) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              ).slice(0, 6));
            }
            setIsCheckingAuth(false);
            return;
          }
        }
      } catch { /* show public */ }
      localStorage.removeItem('intelink_member_id');
      localStorage.removeItem('intelink_role');
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (member) setTimeout(() => searchRef.current?.focus(), 100);
  }, [member]);

  if (isCheckingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1}, ${IL.bg0})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${IL.cyan}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!member) return <PublicLanding />;

  const firstName = member.name?.split(' ')[0] ?? 'Investigador';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1}, ${IL.bg0})`, color: IL.ink }}>
      <ILHeader active="dash" />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px 64px' }}>
        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: IL.cyan, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>{today}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>{greeting}, {firstName}.</h1>
        </div>

        {/* Search hero */}
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto 36px' }}>
          <span style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: IL.ink2, fontSize: 18 }}>⌕</span>
          <input
            ref={searchRef}
            readOnly
            placeholder="Buscar pessoas, CPFs, placas, telefones, ocorrências..."
            onClick={() => (window as any).__ilOpenSearch?.()}
            style={{
              width: '100%', padding: '20px 22px 20px 56px',
              background: IL.surf, border: `1px solid ${IL.border}`,
              borderRadius: 14, color: IL.ink, fontSize: 15,
              fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          />
          <kbd style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 8px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 4, color: IL.ink2, pointerEvents: 'none' }}>Ctrl+K</kbd>
        </div>

        {/* Chat + Atalhos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Chat card */}
          <ILCard hover={false} style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: IL.cyan, boxShadow: `0 0 8px ${IL.cyan}` }} />
                <span style={{ fontSize: 11, color: IL.cyan, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Chat IA</span>
              </div>
              <Link href="/chat" style={{ fontSize: 11, color: IL.ink2, textDecoration: 'none' }}>Maximizar →</Link>
            </div>
            <p style={{ fontSize: 13, color: IL.ink2, margin: '0 0 14px', lineHeight: 1.6 }}>Pergunte sobre pessoas, operações, vínculos. As respostas citam REDS, documentos e fotos como fonte.</p>

            {/* Starters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {STARTERS.map((s, i) => (
                <button key={i} onClick={() => router.push('/chat?q=' + encodeURIComponent(s))} style={{
                  padding: '7px 12px', fontSize: 12, color: IL.ink,
                  background: IL.surf, border: `1px solid ${IL.border}`, borderRadius: 999,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chatInput.trim()) router.push('/chat?q=' + encodeURIComponent(chatInput)); } }}
                placeholder="Pergunte algo... (Enter para enviar)"
                rows={2}
                style={{
                  flex: 1, padding: '10px 14px', background: IL.bg2,
                  border: `1px solid ${IL.border}`, borderRadius: 10,
                  color: IL.ink, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', resize: 'none',
                }}
              />
              <button
                onClick={() => { if (chatInput.trim()) router.push('/chat?q=' + encodeURIComponent(chatInput)); }}
                style={{ padding: '10px 18px', background: IL.cyan, color: IL.bg1, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end' }}
              >Enviar</button>
            </div>
          </ILCard>

          {/* Right column: atalhos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/investigation/new" style={{
              padding: '14px 18px', background: `linear-gradient(135deg, ${IL.cyan}, ${IL.blue})`, color: IL.bg1,
              borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none',
            }}>
              <span>+ Nova operação</span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Ctrl+N</span>
            </Link>

            {/* Operações */}
            <ILCard hover={false} style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Operações ativas</span>
                <ILTag color={IL.cyan}>{stats.investigations}</ILTag>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {investigations.length === 0 && (
                  <p style={{ fontSize: 12, color: IL.dim, margin: 0 }}>Nenhuma operação. Crie a primeira.</p>
                )}
                {investigations.map(inv => (
                  <Link key={inv.id} href={`/investigation/${inv.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 6, color: IL.ink, fontSize: 12, textDecoration: 'none',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: inv.status === 'active' ? IL.cyan : IL.dim, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.title}</span>
                    <span style={{ color: IL.dim, fontSize: 10, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {(inv as unknown as Record<string, number>).entities_count ?? 0}E
                    </span>
                  </Link>
                ))}
              </div>
            </ILCard>

            {/* Alertas placeholder */}
            {alerts.length > 0 && (
              <ILCard hover={false} style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: IL.amber, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Alertas</span>
                  <ILTag color={IL.amber}>{alerts.length}</ILTag>
                </div>
                {alerts.map(a => (
                  <div key={a.id} style={{ padding: '6px 0', borderTop: `1px solid ${IL.border}`, fontSize: 12, color: IL.ink2, lineHeight: 1.5 }}>
                    <span style={{ color: a.severity === 'high' ? IL.red : a.severity === 'medium' ? IL.amber : IL.dim, fontSize: 9, fontFamily: 'var(--font-mono)', marginRight: 6 }}>●</span>
                    {a.text}
                  </div>
                ))}
              </ILCard>
            )}

            <Link href="/central?tab=fotos&filter=unlinked" style={{
              padding: '12px 14px', background: IL.surf, border: `1px solid ${IL.border}`,
              borderRadius: 10, fontSize: 12, color: IL.ink2, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Fotos não vinculadas</span>
              <ILTag color={IL.purple}>ver todas</ILTag>
            </Link>
          </div>
        </div>

        {/* Resumo do dia */}
        <div style={{
          padding: '14px 18px', background: IL.surf, border: `1px solid ${IL.border}`,
          borderRadius: 10, display: 'flex', gap: 32, fontSize: 13, color: IL.ink2,
          fontFamily: 'var(--font-mono)', flexWrap: 'wrap',
        }}>
          <span style={{ color: IL.dim, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>Sistema</span>
          <span><span style={{ color: IL.ink, fontWeight: 600 }}>{stats.investigations}</span> operações</span>
          <span><span style={{ color: IL.cyan, fontWeight: 600 }}>{stats.entities.toLocaleString('pt-BR')}</span> entidades</span>
          <span><span style={{ color: IL.blue, fontWeight: 600 }}>{stats.relationships.toLocaleString('pt-BR')}</span> vínculos</span>
          <span style={{ marginLeft: 'auto', fontSize: 11 }}>Neo4j: 16.140 pessoas · 2.092 REDS · 2.718 fotos</span>
        </div>
      </main>

      <GlobalSearch />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
