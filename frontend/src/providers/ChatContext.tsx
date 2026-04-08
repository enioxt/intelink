'use client';
import { createContext, useContext, useState, useRef, ReactNode, RefObject } from 'react';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Investigation {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  relationship_count?: number;
  evidence_count?: number;
  entity_count?: number;
  incomplete?: boolean;
  reasons?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  masp?: string;
}

interface ChatContextType {
  // Session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  currentSessionId: string | null;
  chatSessions: unknown[];
  sharedSessions: unknown[];
  historyTab: 'mine' | 'shared';
  setHistoryTab: (tab: 'mine' | 'shared') => void;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  // Messages
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  loading: boolean;
  input: string;
  setInput: (v: string | ((prev: string) => string)) => void;
  sendMessage: (text?: string) => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  // Investigations
  investigations: Investigation[];
  loadingInvestigations: boolean;
  selectedInv: string | null;
  handleSelectInvestigation: (inv: string | null) => void;
  isCentralMode: boolean;
  // History actions
  deleteSession: (id: string) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  startNewChat: () => void;
  // Export
  copied: boolean;
  copyToClipboard: () => void;
  exportAsTxt: () => void;
  exportAsMd: () => void;
  exportAsHtml: () => void;
  exportAsPdf: () => void;
  // Share
  teamMembers: TeamMember[];
  shareableMembers: TeamMember[];
  shareWithMember: (memberId: string) => Promise<void>;
  showShareModal: boolean;
  setShowShareModal: (v: boolean) => void;
  selectedMembersToShare: string[];
  setSelectedMembersToShare: (ids: string[]) => void;
  toggleMemberSelection: (id: string) => void;
  shareCanInteract: boolean;
  setShareCanInteract: (v: boolean) => void;
  shareInternally: () => Promise<void>;
  sharingInProgress: boolean;
  // Guardian / AI analysis
  hasUnfinishedWork: boolean;
  aiAnalysis: unknown | null;
  context: string;
  contextSize: number;
}

const noop = () => { };
const asyncNoop = async () => { };

const defaultCtx: ChatContextType = {
  sessionId: null, setSessionId: noop,
  currentSessionId: null,
  chatSessions: [], sharedSessions: [],
  historyTab: 'mine', setHistoryTab: noop,
  showHistory: false, setShowHistory: noop,
  messages: [], setMessages: noop,
  loading: false, input: '', setInput: noop,
  sendMessage: asyncNoop,
  messagesEndRef: { current: null },
  investigations: [], loadingInvestigations: false,
  selectedInv: null, handleSelectInvestigation: noop,
  isCentralMode: false,
  deleteSession: asyncNoop, loadChatHistory: asyncNoop,
  startNewChat: noop,
  copied: false, copyToClipboard: noop,
  exportAsTxt: noop, exportAsMd: noop,
  exportAsHtml: noop, exportAsPdf: noop,
  teamMembers: [], shareableMembers: [],
  shareWithMember: asyncNoop,
  showShareModal: false, setShowShareModal: noop,
  selectedMembersToShare: [], setSelectedMembersToShare: noop,
  toggleMemberSelection: noop,
  shareCanInteract: false, setShareCanInteract: noop,
  shareInternally: asyncNoop, sharingInProgress: false,
  hasUnfinishedWork: false, aiAnalysis: null,
  context: '', contextSize: 0,
};

const ChatContext = createContext<ChatContextType>(defaultCtx);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInputRaw] = useState('');
  const setInput = (v: string | ((prev: string) => string)) =>
    setInputRaw(prev => typeof v === 'function' ? v(prev) : v);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'mine' | 'shared'>('mine');
  const [selectedInv, setSelectedInv] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMembersToShare, setSelectedMembersToShare] = useState<string[]>([]);
  const [shareCanInteract, setShareCanInteract] = useState(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim()) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content }]);
    setInput('');
    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, investigation_id: selectedInv?.id }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response ?? '' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a API.' }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const exportAsTxt = () => {
    const text = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'conversa.txt'; a.click();
  };

  const exportAsMd = () => {
    const md = messages.map(m => `**${m.role}:** ${m.content}`).join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'conversa.md'; a.click();
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMembersToShare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const value: ChatContextType = {
    ...defaultCtx,
    sessionId, setSessionId,
    currentSessionId: sessionId,
    messages, setMessages,
    input, setInput, loading,
    sendMessage, messagesEndRef,
    showHistory, setShowHistory,
    historyTab, setHistoryTab,
    selectedInv, handleSelectInvestigation: setSelectedInv as (v: string | null) => void,
    showShareModal, setShowShareModal,
    selectedMembersToShare, setSelectedMembersToShare,
    toggleMemberSelection,
    shareCanInteract, setShareCanInteract,
    sharingInProgress, copied, copyToClipboard,
    exportAsTxt, exportAsMd,
    exportAsHtml: exportAsTxt,
    exportAsPdf: exportAsTxt,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  return useContext(ChatContext);
}

export const useChat = useChatContext;

export default ChatContext;
