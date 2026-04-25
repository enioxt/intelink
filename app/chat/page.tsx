'use client';

// Chat IA — fullscreen, scroll interno, conectado ao /api/chat com SSE real

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IL } from '@/lib/design/tokens';
import { ConfBadge } from '@/components/il/ConfBadge';
import { ILTag } from '@/components/il/ILTag';
import { GlobalSearch } from '@/components/il/GlobalSearch';
import type { ConfidenceKind } from '@/lib/design/tokens';

interface InlineEntity {
  type: string; id: string; name: string;
  confidence?: ConfidenceKind; rho?: number; href: string;
}
interface Citation { type: string; label: string; }
interface Message {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  citations?: Citation[];
  inlineEntities?: InlineEntity[];
  toolUsed?: string;
}

const SLASH_COMMANDS = [
  { cmd: '/grafo',    desc: 'Grafo de uma operação ou pessoa' },
  { cmd: '/buscar',   desc: 'Busca densa em REDS, fotos, documentos' },
  { cmd: '/comparar', desc: 'Comparar duas pessoas ou casos' },
  { cmd: '/analisar', desc: 'Análise de centralidade / Rho score' },
  { cmd: '/timeline', desc: 'Reconstruir cronologia de eventos' },
];

const STARTERS = [
  'Quem tem mais vínculos no sistema?',
  'Últimas ocorrências de homicídio em Patos de Minas',
  'Pessoas em múltiplas operações ativas',
  '/analisar centralidade da rede',
  'Fotos não vinculadas há mais de 30 dias',
  '/comparar duas pessoas por ocorrências',
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [toolLabel, setToolLabel] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll apenas dentro do container de mensagens
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setShowSlash(false);
    setStreaming(true);
    setToolLabel('');
    setMessages(m => [...m, { role: 'assistant', text: '', streaming: true }]);

    // Build conversation history for context
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
    history.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          message: text,           // new-style simple field
          mode: 'central',         // all investigations context
          stream: true,
          saveHistory: false,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', text: 'Erro ao conectar com o assistente.' }; return n; });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === 'delta' && event.content) {
              acc += event.content;
              setMessages(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', text: acc, streaming: true }; return n; });
            } else if (event.type === 'tool_start' && event.tools) {
              setToolLabel('Usando: ' + event.tools.join(', '));
            } else if (event.type === 'tool_end') {
              setToolLabel('');
            } else if (event.type === 'done') {
              // May include citations / history metadata
            } else if (event.type === 'error') {
              acc = event.error ?? 'Erro desconhecido.';
            } else if (event.choices?.[0]?.delta?.content) {
              // OpenAI compat fallback
              acc += event.choices[0].delta.content;
              setMessages(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', text: acc, streaming: true }; return n; });
            }
          } catch { /* ignore malformed events */ }
        }
      }

      setMessages(m => {
        const n = [...m];
        n[n.length - 1] = { role: 'assistant', text: acc || 'Sem resposta.', streaming: false };
        return n;
      });
    } catch {
      setMessages(m => { const n = [...m]; n[n.length - 1] = { role: 'assistant', text: 'Falha na conexão. Tente novamente.' }; return n; });
    } finally {
      setStreaming(false);
      setToolLabel('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [streaming, messages]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialQ) sendMessage(initialQ); }, []);

  const slashFiltered = SLASH_COMMANDS.filter(s => s.cmd.startsWith(input.trim()));

  return (
    // Fullscreen fixo — sem scroll externo, layout em grid
    <div style={{
      position: 'fixed', inset: 0,
      display: 'grid', gridTemplateColumns: '260px 1fr',
      background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1})`,
      color: IL.ink,
      overflow: 'hidden', // nunca rola a página inteira
    }}>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside style={{ borderRight: `1px solid ${IL.border}`, display: 'flex', flexDirection: 'column', background: 'rgba(2,6,23,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${IL.border}`, flexShrink: 0 }}>
          <Link href="/" style={{ fontSize: 12, color: IL.ink2, textDecoration: 'none', display: 'block', marginBottom: 10 }}>← Início</Link>
          <button onClick={() => { setMessages([]); setInput(''); }} style={{ width: '100%', padding: '10px 14px', background: IL.cyan, color: IL.bg1, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Nova conversa</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <div style={{ fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '8px 10px' }}>Comandos</div>
          {SLASH_COMMANDS.map(s => (
            <button key={s.cmd} onClick={() => { setInput(s.cmd + ' '); inputRef.current?.focus(); }} style={{ display: 'block', width: '100%', padding: '8px 10px', borderRadius: 6, background: 'transparent', border: 'none', textAlign: 'left', color: IL.ink2, fontSize: 12, cursor: 'pointer', marginBottom: 2 }}>
              <span style={{ color: IL.cyan, fontFamily: 'var(--font-mono)' }}>{s.cmd}</span>
              <span style={{ color: IL.dim, fontSize: 11, marginLeft: 6 }}>{s.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 16px', borderTop: `1px solid ${IL.border}`, fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          16.140 pessoas · 2.092 REDS · 19.711 vínculos
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${IL.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: IL.cyan, boxShadow: `0 0 8px ${IL.cyan}` }} />
          <span style={{ fontSize: 14, color: IL.ink, fontWeight: 500 }}>Chat IA · Inteligência</span>
          {toolLabel && (
            <span style={{ fontSize: 11, color: IL.amber, fontFamily: 'var(--font-mono)', marginLeft: 8, animation: 'pulse 1s infinite' }}>⚙ {toolLabel}</span>
          )}
          <button onClick={() => (window as any).__ilOpenSearch?.()} style={{ marginLeft: 'auto', padding: '5px 12px', background: 'transparent', border: `1px solid ${IL.border}`, borderRadius: 6, color: IL.ink2, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Ctrl+K</button>
        </div>

        {/* Messages — scroll INTERNO aqui */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 40px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '15vh' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${IL.cyan}, ${IL.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, color: IL.bg1, margin: '0 auto 16px' }}>IL</div>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>Como posso ajudar?</h2>
              <p style={{ color: IL.ink2, fontSize: 14, marginBottom: 28 }}>Tenho acesso a 16.140 pessoas, 2.092 REDS, documentos e vínculos.</p>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, maxWidth: 640, margin: '0 auto' }}>
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{ padding: '9px 14px', fontSize: 13, color: IL.ink, background: IL.surf, border: `1px solid ${IL.border}`, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = IL.borderHover}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = IL.border}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 24, display: 'flex', gap: 14, maxWidth: 860, margin: '0 auto 24px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? IL.bg2 : `linear-gradient(135deg, ${IL.cyan}, ${IL.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: m.role === 'user' ? IL.ink2 : IL.bg1, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {m.role === 'user' ? 'EU' : 'IL'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {m.role === 'user' ? 'Investigador' : 'Intelink IA'}
                </div>
                <div style={{ fontSize: 14, color: IL.ink, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.text}
                  {m.streaming && <span style={{ display: 'inline-block', width: 8, height: 14, background: IL.cyan, marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.8s infinite' }} />}
                </div>
                {m.toolUsed && <div style={{ marginTop: 6, fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>⚙ {m.toolUsed}</div>}
                {m.inlineEntities && m.inlineEntities.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {m.inlineEntities.map((e, j) => (
                      <a key={j} href={e.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: IL.surf, border: `1px solid ${IL.border}`, borderRadius: 8, color: IL.ink, fontSize: 12, textDecoration: 'none' }}>
                        <span style={{ color: IL.cyan, fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase' }}>{e.type}</span>
                        <span style={{ fontWeight: 500 }}>{e.name}</span>
                        {e.rho != null && <ILTag color={IL.amber}>ρ {e.rho.toFixed(2)}</ILTag>}
                        {e.confidence && <ConfBadge kind={e.confidence} />}
                      </a>
                    ))}
                  </div>
                )}
                {m.citations && m.citations.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.citations.map((c, j) => (
                      <span key={j} style={{ fontSize: 10, color: IL.ink2, fontFamily: 'var(--font-mono)', padding: '2px 6px', background: IL.bg2, borderRadius: 4 }}>[{j + 1}] {c.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input — fixo na base */}
        <div style={{ padding: '14px 40px 20px', borderTop: `1px solid ${IL.border}`, position: 'relative', flexShrink: 0 }}>
          {showSlash && slashFiltered.length > 0 && (
            <div style={{ position: 'absolute', bottom: '100%', left: 40, right: 40, marginBottom: 4, background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 10, overflow: 'hidden', zIndex: 10 }}>
              {slashFiltered.map(s => (
                <div key={s.cmd} onClick={() => { setInput(s.cmd + ' '); setShowSlash(false); inputRef.current?.focus(); }} style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(6,182,212,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <span style={{ color: IL.cyan, fontFamily: 'var(--font-mono)' }}>{s.cmd}</span>
                  <span style={{ color: IL.ink2 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 860, margin: '0 auto' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowSlash(e.target.value.startsWith('/')); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Pergunte algo... use / para comandos (Enter = enviar, Shift+Enter = nova linha)"
              rows={2}
              style={{ flex: 1, padding: '12px 16px', background: IL.surf, border: `1px solid ${IL.border}`, borderRadius: 12, color: IL.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none' }}
              onFocus={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = IL.borderHover}
              onBlur={e => (e.currentTarget as HTMLTextAreaElement).style.borderColor = IL.border}
            />
            <button onClick={() => sendMessage(input)} disabled={streaming || !input.trim()} style={{ padding: '12px 24px', background: (streaming || !input.trim()) ? IL.bg2 : IL.cyan, color: (streaming || !input.trim()) ? IL.dim : IL.bg1, border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer', alignSelf: 'flex-end' }}>
              {streaming ? '…' : 'Enviar'}
            </button>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)', maxWidth: 860, margin: '8px auto 0' }}>
            <span>↵ enviar</span><span>shift+↵ nova linha</span><span>/ comandos</span><span>Ctrl+K busca global</span>
          </div>
        </div>
      </div>

      <GlobalSearch />
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.15); border-radius: 3px; }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: IL.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: IL.cyan, fontFamily: 'monospace', fontSize: 13 }}>Carregando…</div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
