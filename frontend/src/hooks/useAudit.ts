import { useCallback } from 'react';

export interface AuditEvent {
  action: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export function useAudit() {
  const logEvent = useCallback(async (event: AuditEvent) => {
    try {
      await fetch('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, timestamp: new Date().toISOString() }),
      });
    } catch {
      // audit failures must never block the user
    }
  }, []);

  const logBreakTheGlass = useCallback(async (reason: string, entityId?: string) => {
    await logEvent({ action: 'break_the_glass', entityId, metadata: { reason } });
  }, [logEvent]);

  const logSearch = useCallback(async (query: string, results?: number) => {
    await logEvent({ action: 'search', metadata: { query, results } });
  }, [logEvent]);

  return { logEvent, logBreakTheGlass, logSearch };
}
