'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface JourneyContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const JourneyContext = createContext<JourneyContextType | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  return (
    <JourneyContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourneyContext() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourneyContext must be used within JourneyProvider');
  return ctx;
}

export default JourneyContext;
