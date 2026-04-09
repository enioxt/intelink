/**
 * Audit Log System with Merkle Tree Verification
 * Implements SEC-003: Audit log append-only + Merkle tree
 * 
 * Features:
 * - Append-only log entries
 * - Cryptographic chain (hash of previous entry)
 * - Merkle tree for batch verification
 * - Tamper detection
 */

import { hashData } from './encryption';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
  signature?: string;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  entry?: AuditLogEntry;
}

export interface AuditBatch {
  rootHash: string;
  entries: AuditLogEntry[];
  timestamp: string;
  signature?: string;
}

class AuditLog {
  private entries: AuditLogEntry[] = [];
  private merkleTree: MerkleNode | null = null;
  private lastHash: string = '0'.repeat(64); // Genesis hash

  /**
   * Add a new audit log entry
   * Automatically chains to previous entry
   */
  addEntry(
    action: string,
    actor: string,
    resource: string,
    details: Record<string, unknown> = {}
  ): AuditLogEntry {
    const entry: Omit<AuditLogEntry, 'hash'> = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      resource,
      details,
      previousHash: this.lastHash,
    };

    // Calculate hash of this entry
    const hash = this.calculateEntryHash(entry as AuditLogEntry);
    const fullEntry: AuditLogEntry = { ...entry, hash };

    this.entries.push(fullEntry);
    this.lastHash = hash;

    // Rebuild Merkle tree
    this.rebuildMerkleTree();

    return fullEntry;
  }

  /**
   * Calculate hash of an entry
   */
  private calculateEntryHash(entry: AuditLogEntry): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      details: entry.details,
      previousHash: entry.previousHash,
    });
    return hashData(data);
  }

  /**
   * Generate unique ID for entry
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Rebuild Merkle tree from current entries
   */
  private rebuildMerkleTree(): void {
    if (this.entries.length === 0) {
      this.merkleTree = null;
      return;
    }

    // Create leaf nodes
    let nodes: MerkleNode[] = this.entries.map(entry => ({
      hash: entry.hash,
      entry,
    }));

    // Build tree bottom-up
    while (nodes.length > 1) {
      const level: MerkleNode[] = [];
      
      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = nodes[i + 1] || left; // If odd, duplicate last
        
        const combinedHash = hashData(left.hash + right.hash);
        level.push({
          hash: combinedHash,
          left,
          right,
        });
      }
      
      nodes = level;
    }

    this.merkleTree = nodes[0];
  }

  /**
   * Get Merkle root hash
   */
  getMerkleRoot(): string | null {
    return this.merkleTree?.hash || null;
  }

  /**
   * Get all entries
   */
  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific time range
   */
  getEntriesByTimeRange(start: Date, end: Date): AuditLogEntry[] {
    return this.entries.filter(
      entry => {
        const ts = new Date(entry.timestamp);
        return ts >= start && ts <= end;
      }
    );
  }

  /**
   * Get entries for a specific actor
   */
  getEntriesByActor(actor: string): AuditLogEntry[] {
    return this.entries.filter(entry => entry.actor === actor);
  }

  /**
   * Get entries for a specific resource
   */
  getEntriesByResource(resource: string): AuditLogEntry[] {
    return this.entries.filter(entry => entry.resource === resource);
  }

  /**
   * Verify integrity of entire log
   * Checks:
   * 1. Each entry's hash is correct
   * 2. Previous hash chain is intact
   * 3. Merkle root matches
   */
  verifyIntegrity(): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify entry hash
      const expectedHash = this.calculateEntryHash(entry);
      if (entry.hash !== expectedHash) {
        violations.push(`Entry ${i}: Hash mismatch`);
      }

      // Verify chain (skip first entry)
      if (i > 0) {
        const previousEntry = this.entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          violations.push(`Entry ${i}: Chain broken`);
        }
      } else {
        // First entry should have genesis hash
        if (entry.previousHash !== '0'.repeat(64)) {
          violations.push(`Entry ${i}: Invalid genesis`);
        }
      }
    }

    // Verify Merkle root
    const currentRoot = this.getMerkleRoot();
    this.rebuildMerkleTree();
    const rebuiltRoot = this.getMerkleRoot();
    
    if (currentRoot !== rebuiltRoot) {
      violations.push('Merkle root mismatch');
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Verify a specific entry is in the tree (Merkle proof)
   */
  getMerkleProof(entryHash: string): { path: string[]; valid: boolean } | null {
    const path: string[] = [];
    
    function findPath(node: MerkleNode | null, target: string): boolean {
      if (!node) return false;
      
      if (node.hash === target || node.entry?.hash === target) {
        return true;
      }

      if (node.left && findPath(node.left, target)) {
        path.push(node.right?.hash || node.left.hash);
        return true;
      }

      if (node.right && findPath(node.right, target)) {
        path.push(node.left?.hash || node.right.hash);
        return true;
      }

      return false;
    }

    const found = findPath(this.merkleTree, entryHash);
    
    if (!found) return null;

    return {
      path: path.reverse(),
      valid: true,
    };
  }

  /**
   * Export batch for external verification
   */
  exportBatch(start?: Date, end?: Date): AuditBatch {
    const entries = start && end 
      ? this.getEntriesByTimeRange(start, end)
      : this.entries;

    // Build tree for this batch
    let nodes: MerkleNode[] = entries.map(entry => ({
      hash: entry.hash,
      entry,
    }));

    while (nodes.length > 1) {
      const level: MerkleNode[] = [];
      
      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = nodes[i + 1] || left;
        
        const combinedHash = hashData(left.hash + right.hash);
        level.push({
          hash: combinedHash,
          left,
          right,
        });
      }
      
      nodes = level;
    }

    return {
      rootHash: nodes[0]?.hash || '',
      entries,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import and verify a batch
   */
  importBatch(batch: AuditBatch): { success: boolean; error?: string } {
    // Verify batch integrity
    const tempLog = new AuditLog();
    
    for (const entry of batch.entries) {
      // Verify entry hash
      const expectedHash = this.calculateEntryHash(entry);
      if (entry.hash !== expectedHash) {
        return { success: false, error: `Hash mismatch for entry ${entry.id}` };
      }

      tempLog.entries.push(entry);
    }

    tempLog.rebuildMerkleTree();
    const calculatedRoot = tempLog.getMerkleRoot();

    if (calculatedRoot !== batch.rootHash) {
      return { success: false, error: 'Merkle root mismatch' };
    }

    // Append entries to current log
    for (const entry of batch.entries) {
      this.entries.push(entry);
    }

    this.rebuildMerkleTree();
    
    return { success: true };
  }

  /**
   * Get tamper-evident summary
   */
  getSummary(): {
    totalEntries: number;
    merkleRoot: string | null;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    integrity: { valid: boolean; violations: string[] };
  } {
    return {
      totalEntries: this.entries.length,
      merkleRoot: this.getMerkleRoot(),
      firstTimestamp: this.entries[0]?.timestamp || null,
      lastTimestamp: this.entries[this.entries.length - 1]?.timestamp || null,
      integrity: this.verifyIntegrity(),
    };
  }
}

// Singleton instance
let auditLogInstance: AuditLog | null = null;

export function getAuditLog(): AuditLog {
  if (!auditLogInstance) {
    auditLogInstance = new AuditLog();
  }
  return auditLogInstance;
}

/**
 * Convenience function to log an action
 */
export function logAction(
  action: string,
  actor: string,
  resource: string,
  details?: Record<string, unknown>
): AuditLogEntry {
  return getAuditLog().addEntry(action, actor, resource, details);
}

/**
 * Predefined audit actions
 */
export const AuditActions = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGE: 'auth.password_change',
  
  // Data access
  ENTITY_VIEW: 'entity.view',
  ENTITY_CREATE: 'entity.create',
  ENTITY_UPDATE: 'entity.update',
  ENTITY_DELETE: 'entity.delete',
  
  // OSINT queries
  OSINT_QUERY: 'osint.query',
  OSINT_EXPORT: 'osint.export',
  
  // System
  SETTINGS_CHANGE: 'system.settings_change',
  BACKUP_CREATE: 'system.backup_create',
  BACKUP_RESTORE: 'system.backup_restore',
  
  // Admin
  USER_CREATE: 'admin.user_create',
  USER_UPDATE: 'admin.user_update',
  USER_DELETE: 'admin.user_delete',
} as const;
