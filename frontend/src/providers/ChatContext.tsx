'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  messages: unknown[];
  setMessages: (msgs: unknown[]) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  return (
    <ChatContext.Provider value={{ sessionId, setSessionId, messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export const useChat = useChatContext;

export default ChatContext;
