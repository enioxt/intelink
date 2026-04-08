'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface IntelinkFocusContextType {
  focusedEntityId: string | null;
  setFocusedEntityId: (id: string | null) => void;
}

const IntelinkFocusContext = createContext<IntelinkFocusContextType | null>(null);

export function IntelinkFocusProvider({ children }: { children: ReactNode }) {
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);
  return (
    <IntelinkFocusContext.Provider value={{ focusedEntityId, setFocusedEntityId }}>
      {children}
    </IntelinkFocusContext.Provider>
  );
}

export function useIntelinkFocus() {
  const ctx = useContext(IntelinkFocusContext);
  if (!ctx) throw new Error('useIntelinkFocus must be used within IntelinkFocusProvider');
  return ctx;
}

export default IntelinkFocusContext;
