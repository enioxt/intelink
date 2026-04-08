
import React from 'react';
import { Image, FileAudio, FileText, FileArchive, File as FileIcon } from 'lucide-react';
import { RAGMessage } from '@/hooks/useRAGChatbot';
import { usePoliceHints } from '@/hooks/usePoliceHints';

// ==========================
// UI Helpers
// ==========================

export function fileIconByType(mime: string) {
  const type = (mime || '').toLowerCase();
  if (type.startsWith('image/')) return React.createElement(Image, { className: "w-5 h-5" });
  if (type.startsWith('audio/')) return React.createElement(FileAudio, { className: "w-5 h-5" });
  if (type === 'application/pdf' || type.startsWith('text/')) return React.createElement(FileText, { className: "w-5 h-5" });
  if (type.includes('zip')) return React.createElement(FileArchive, { className: "w-5 h-5" });
  return React.createElement(FileIcon, { className: "w-5 h-5" });
}

export function bytes(n: number) {
  if (typeof n !== 'number') return '';
  const units = ['B','KB','MB','GB'];
  let v = n; let i = 0;
  while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
  return `${v.toFixed(v<10?1:0)} ${units[i]}`;
}


// ==========================
// Markdown & Rendering
// ==========================

function formatInline(s: string) {
  const out: Array<string | { t: 'b'|'i'|'c'; v: string }> = [];
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: 'b', v: tok.slice(2, -2) });
    else if (tok.startsWith('*')) out.push({ t: 'i', v: tok.slice(1, -1) });
    else out.push({ t: 'c', v: tok.slice(1, -1) });
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out.map((p, i) => typeof p === 'string'
    ? React.createElement('span', { key: i }, p)
    : p.t === 'b' ? React.createElement('strong', { key: i }, p.v)
    : p.t === 'i' ? React.createElement('em', { key: i }, p.v)
    : React.createElement('code', { key: i, className: "px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800" }, p.v)
  );
}

function renderParagraphBlock(text: string, key: number) {
  const parts = String(text || '').split(/\n\n+/);
  return (
    React.createElement('div', { key: `p-${key}`, className: "space-y-2" },
      parts.map((p, i) => (
        React.createElement('p', { key: `p-${key}-${i}`, className: "whitespace-pre-wrap" }, formatInline(p))
      ))
    )
  );
}

export function renderAssistant(text: string): React.ReactNode {
  const s = String(text || '');
  const out: React.ReactNode[] = [];
  const fileRe = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let last = 0; let m: RegExpExecArray | null; let idx = 0;
  while ((m = fileRe.exec(s)) !== null) {
    const before = s.slice(last, m.index);
    if (before.trim()) out.push(renderParagraphBlock(before, idx++));
    const name = m[1].trim();
    const content = m[2];
    out.push(
      React.createElement('div', { key: `file-${idx++}`, className: "p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs" },
        React.createElement('div', { className: "flex items-center justify-between mb-2" },
          React.createElement('div', { className: "font-mono font-semibold text-slate-800 dark:text-slate-200 truncate" }, name),
          React.createElement('button',
            {
              className: "px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700",
              onClick: () => downloadTextAsFile(name, content),
              title: "Baixar arquivo gerado"
            },
            "Baixar"
          )
        ),
        React.createElement('pre', { className: "whitespace-pre-wrap text-slate-700 dark:text-slate-300" }, content)
      )
    );
    last = m.index + m[0].length;
  }
  const tail = s.slice(last);
  if (tail.trim()) out.push(renderParagraphBlock(tail, idx++));
  return React.createElement('div', { className: "space-y-2 text-sm" }, out);
}


// ==========================
// File Download Helpers
// ==========================

function downloadTextAsFile(filename: string, content: string) {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'arquivo.txt';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (e) {
    console.error('downloadTextAsFile failed', e);
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function downloadConversation(messages: RAGMessage[], format: 'json'|'md'|'txt'|'html') {
  let blob: Blob;
  if (format === 'json') {
    blob = new Blob([JSON.stringify({ messages }, null, 2)], { type: 'application/json' });
  } else {
    const lines = messages.map(m => (m.role === 'user' ? `Usuário: ${m.content}` : `Assistente: ${m.content}`));
    if (format === 'md') {
      const md = lines.join('\n\n');
      blob = new Blob([`# Conversa Intelink\n\n${md}\n`], { type: 'text/markdown' });
    } else if (format === 'txt') {
      const txt = lines.join('\n');
      blob = new Blob([txt + '\n'], { type: 'text/plain' });
    } else {
      const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Conversa Intelink</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:24px;background:#fff;color:#111} .u{color:#0b5} .a{color:#036}</style></head><body><h1>Conversa Intelink</h1>${messages.map(m=>`<p class="${m.role==='user'?'u':'a'}"><strong>${m.role==='user'?'Usuário':'Assistente'}:</strong> ${escapeHtml(m.content)}</p>`).join('')} </body></html>`;
      blob = new Blob([html], { type: 'text/html' });
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'json' ? 'conversa.json' : (format === 'md' ? 'conversa.md' : (format === 'txt' ? 'conversa.txt' : 'conversa.html'));
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadConversationDocx(messages: RAGMessage[]) {
  try {
    const docx = await import('docx');
    const { saveAs } = await import('file-saver');

    const paragraphs = messages.map((m) =>
      new docx.Paragraph({
        children: [
          new docx.TextRun({ text: m.role === 'user' ? 'Usuário: ' : 'Assistente: ', bold: true }),
          new docx.TextRun({ text: m.content })
        ]
      })
    );

    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: [
            new docx.Paragraph({
              children: [new docx.TextRun({ text: 'Conversa Intelink', bold: true, size: 28 })],
              spacing: { after: 200 }
            }),
            ...paragraphs
          ]
        }
      ]
    });

    const blob: Blob = await docx.Packer.toBlob(doc);
    saveAs(blob, 'conversa.docx');
  } catch (e) {
    console.error('DOCX export failed', e);
    throw e;
  }
}

// ==========================
// Mic & Transcription
// ==========================

export function startMic(
  setRec: (v:boolean)=>void,
  setMsg: (arg: string | ((prev:string)=>string))=>void,
  mediaRecRef: React.MutableRefObject<any>,
  mediaChunksRef: React.MutableRefObject<Blob[]>
) {
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (SR) return startSpeech(setRec, setMsg);
  return startMediaRecording(setRec, setMsg, mediaRecRef, mediaChunksRef);
}

function startSpeech(setRec: (v:boolean)=>void, setMsg: (arg: string | ((prev:string)=>string))=>void) {
  try {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    (window as any).__intelink_rec = rec;
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setMsg((prev:string)=> (prev ? (prev + ' ') : '') + String(t));
    };
    rec.onend = () => { setRec(false); };
    setRec(true);
    rec.start();
  } catch (_e) {
    setRec(false);
  }
}

export function stopMic(setRec: (v:boolean)=>void, mediaRecRef: React.MutableRefObject<any>) {
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (SR) return stopSpeech(setRec);
  return stopMediaRecording(setRec, mediaRecRef);
}

function stopSpeech(setRec: (v:boolean)=>void) {
  try {
    const rec = (window as any).__intelink_rec;
    if (rec && typeof rec.stop === 'function') rec.stop();
  } finally {
    setRec(false);
  }
}

async function startMediaRecording(
  setRec: (v:boolean)=>void,
  setMsg: (arg: string | ((prev:string)=>string))=>void,
  mediaRecRef: React.MutableRefObject<any>,
  mediaChunksRef: React.MutableRefObject<Blob[]>
) {
  try {
    if (!navigator.mediaDevices || !(window as any).MediaRecorder) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr: any = new (window as any).MediaRecorder(stream);
    mediaRecRef.current = mr;
    mediaChunksRef.current = [];
    mr.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data); };
    mr.onstop = async () => {
      try {
        const blob = new Blob(mediaChunksRef.current, { type: 'audio/webm' });
        const text = await callTranscribe(blob);
        if (text) setMsg((prev:string)=> prev ? (prev + ' ' + String(text)) : String(text));
      } catch (e) { console.error('media transcribe failed', e); }
      finally { stream.getTracks().forEach(t => t.stop()); setRec(false); }
    };
    mr.start();
    setRec(true);
  } catch (_e) { setRec(false); }
}

function stopMediaRecording(setRec: (v:boolean)=>void, mediaRecRef: React.MutableRefObject<any>) {
  try {
    const mr = mediaRecRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  } catch { /* noop */ }
  finally { setRec(false); }
}

async function callTranscribe(audio: Blob): Promise<string> {
  const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8042/api/v1/intelink';
  const fd = new FormData();
  fd.append('file', audio, 'audio.webm');
  const res = await fetch(`${API_URL}/audio/transcribe`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`transcribe ${res.status}`);
  const data = await res.json();
  return data?.text || '';
}

export async function submitSuggestions(hints: ReturnType<typeof usePoliceHints>['hints']) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8042/api/v1/intelink';
    await Promise.all(hints.slice(0,4).map(async (h: any) => {
      const payload = { term: h.phrase, suggestion: h.suggestion, severity: h.severity };
      await fetch(`${API_URL}/suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }));
  } catch (e) {
    console.error('submitSuggestions failed', e);
  }
}
