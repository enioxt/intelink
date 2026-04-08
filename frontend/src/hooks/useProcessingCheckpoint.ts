import { useState, useCallback } from 'react';

const CHECKPOINT_STORAGE_KEY = 'egos-processing-checkpoints';

export function getAllCheckpoints(): Record<string, CheckpointState> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CHECKPOINT_STORAGE_KEY) ?? '{}');
  } catch { return {}; }
}

export interface CheckpointState {
  step: number;
  total: number;
  label: string;
  done: boolean;
  data?: Record<string, unknown>;
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

  const hasUnfinishedWork = !checkpoint.done && checkpoint.step > 0;
  return { checkpoint, advance, reset, saveCheckpoint, clearCheckpoint, hasUnfinishedWork };
}
