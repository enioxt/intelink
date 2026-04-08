import { useState, useCallback } from 'react';

export interface CheckpointState {
  step: number;
  total: number;
  label: string;
  done: boolean;
}

export function useProcessingCheckpoint(total: number) {
  const [checkpoint, setCheckpoint] = useState<CheckpointState>({ step: 0, total, label: '', done: false });

  const advance = useCallback((label: string) => {
    setCheckpoint(prev => ({
      ...prev,
      step: prev.step + 1,
      label,
      done: prev.step + 1 >= total,
    }));
  }, [total]);

  const reset = useCallback(() => {
    setCheckpoint({ step: 0, total, label: '', done: false });
  }, [total]);

  const saveCheckpoint = useCallback((label: string) => advance(label), [advance]);
  const clearCheckpoint = useCallback(() => reset(), [reset]);

  return { checkpoint, advance, reset, saveCheckpoint, clearCheckpoint };
}
