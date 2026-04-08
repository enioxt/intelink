import { useState, useCallback } from 'react';

export interface GuardianAnalysisResult {
  riskScore: number;
  flags: string[];
  recommendation: string;
}

export function useGuardianAnalysis() {
  const [result, setResult] = useState<GuardianAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (content: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/guardian/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, analyze };
}
