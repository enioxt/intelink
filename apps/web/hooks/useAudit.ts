'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  getAuditLog, 
  logAction, 
  AuditLogEntry, 
  AuditBatch,
  AuditActions 
} from '@/lib/db/audit';

interface UseAuditReturn {
  entries: AuditLogEntry[];
  addEntry: (action: string, actor: string, resource: string, details?: Record<string, unknown>) => AuditLogEntry;
  verifyIntegrity: () => { valid: boolean; violations: string[] };
  merkleRoot: string | null;
  summary: {
    totalEntries: number;
    merkleRoot: string | null;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    integrity: { valid: boolean; violations: string[] };
  };
  exportBatch: (start?: Date, end?: Date) => AuditBatch;
  filterByActor: (actor: string) => AuditLogEntry[];
  filterByResource: (resource: string) => AuditLogEntry[];
  filterByTimeRange: (start: Date, end: Date) => AuditLogEntry[];
}

export function useAudit(): UseAuditReturn {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const auditLog = getAuditLog();

  // Sync with audit log
  useEffect(() => {
    const syncEntries = () => {
      const currentEntries = auditLog.getEntries();
      setEntries(currentEntries);
      setMerkleRoot(auditLog.getMerkleRoot());
    };

    syncEntries();
    
    // Set up interval to sync
    const interval = setInterval(syncEntries, 1000);
    return () => clearInterval(interval);
  }, [auditLog]);

  const addEntry = useCallback(
    (action: string, actor: string, resource: string, details?: Record<string, unknown>) => {
      const entry = logAction(action, actor, resource, details);
      setEntries(auditLog.getEntries());
      setMerkleRoot(auditLog.getMerkleRoot());
      return entry;
    },
    [auditLog]
  );

  const verifyIntegrity = useCallback(() => {
    return auditLog.verifyIntegrity();
  }, [auditLog]);

  const summary = {
    totalEntries: entries.length,
    merkleRoot,
    firstTimestamp: entries[0]?.timestamp || null,
    lastTimestamp: entries[entries.length - 1]?.timestamp || null,
    integrity: verifyIntegrity(),
  };

  const exportBatch = useCallback(
    (start?: Date, end?: Date) => {
      return auditLog.exportBatch(start, end);
    },
    [auditLog]
  );

  const filterByActor = useCallback(
    (actor: string) => {
      return auditLog.getEntriesByActor(actor);
    },
    [auditLog]
  );

  const filterByResource = useCallback(
    (resource: string) => {
      return auditLog.getEntriesByResource(resource);
    },
    [auditLog]
  );

  const filterByTimeRange = useCallback(
    (start: Date, end: Date) => {
      return auditLog.getEntriesByTimeRange(start, end);
    },
    [auditLog]
  );

  return {
    entries,
    addEntry,
    verifyIntegrity,
    merkleRoot,
    summary,
    exportBatch,
    filterByActor,
    filterByResource,
    filterByTimeRange,
  };
}

export { AuditActions };
