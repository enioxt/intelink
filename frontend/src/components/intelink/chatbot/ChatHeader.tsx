
import { MessageCircle, X, Minimize2, Maximize2, Layers, Download } from 'lucide-react';
import { RAGMessage } from '@/hooks/useRAGChatbot';
import { ChatbotSize } from './types';
import { downloadConversation, downloadConversationDocx } from './helpers';
import { useState, useRef, useEffect } from 'react';

type Props = {
  size: ChatbotSize;
  setSize: (size: ChatbotSize) => void;
  onClose: () => void;
  messages: RAGMessage[];
}

export function ChatHeader({ size, setSize, onClose, messages }: Props) {
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dlOpen) return;
    function onDown(e: MouseEvent) {
      if (!dlRef.current) return;
      const target = e.target as Node;
      if (!dlRef.current.contains(target)) setDlOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDlOpen(false);
    }
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [dlOpen]);


  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Assistente Intelink</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={dlRef}>
          <button
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
            title="Baixar conversa"
            onClick={() => setDlOpen((v) => !v)}
          >
            <Download className="h-5 w-5" />
          </button>
          {dlOpen && (
            <div className="absolute right-0 top-10 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-md min-w-[160px] p-1">
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded" onClick={() => { setDlOpen(false); downloadConversation(messages, 'md'); }}>Markdown (.md)</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded" onClick={() => { setDlOpen(false); downloadConversation(messages, 'json'); }}>JSON (.json)</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded" onClick={() => { setDlOpen(false); downloadConversation(messages, 'txt'); }}>Texto (.txt)</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded" onClick={() => { setDlOpen(false); downloadConversation(messages, 'html' as any); }}>HTML (.html)</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded" onClick={() => { setDlOpen(false); downloadConversationDocx(messages).catch(()=>alert('DOCX indisponível (instale a lib docx)')); }}>DOCX (.docx)</button>
            </div>
          )}
        </div>
        <button
          onClick={() => setSize('small')}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${size==='small'?'text-blue-600':'text-slate-600 dark:text-slate-400'}`}
          title="Modo compacto"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSize('medium')}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${size==='medium'?'text-blue-600':'text-slate-600 dark:text-slate-400'}`}
          title="Metade da tela"
        >
          <Layers className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSize(size==='full'?'medium':'full')}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${size==='full'?'text-blue-600':'text-slate-600 dark:text-slate-400'}`}
          title="Tela cheia"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
