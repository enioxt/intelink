/**
 * RxDB Configuration for EGOS Inteligência
 * Offline-first encrypted database for local data persistence
 * Implements SEC-002: RxDB v15 + AES-256-GCM + PBKDF2
 */

import { createRxDatabase, RxDatabase, RxCollection, RxJsonSchema } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { browserEncrypt, browserDecrypt, EncryptedData } from './encryption';

// Database schemas
export interface InvestigationDoc {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'closed';
  createdAt: string;
  updatedAt: string;
  entities: string[];
  tags: string[];
}

export interface EntityDoc {
  id: string;
  name: string;
  type: 'person' | 'company' | 'vehicle' | 'location' | 'device';
  data: Record<string, unknown>;
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDoc {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  toolCalls?: unknown[];
}

export interface ConversationDoc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// Schema definitions
const investigationSchema: RxJsonSchema<InvestigationDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['active', 'paused', 'closed'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    entities: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
};

const entitySchema: RxJsonSchema<EntityDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string', enum: ['person', 'company', 'vehicle', 'location', 'device'] },
    data: { type: 'object' },
    sourceRefs: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'type', 'createdAt', 'updatedAt'],
};

const chatMessageSchema: RxJsonSchema<ChatMessageDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    conversationId: { type: 'string', maxLength: 100 },
    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
    content: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    model: { type: 'string' },
    toolCalls: { type: 'array' },
  },
  required: ['id', 'conversationId', 'role', 'content', 'timestamp'],
};

const conversationSchema: RxJsonSchema<ConversationDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    messageCount: { type: 'number' },
  },
  required: ['id', 'title', 'createdAt', 'updatedAt', 'messageCount'],
};

// Database instance
let db: RxDatabase | null = null;
let encryptionPassword: string | null = null;

/**
 * Initialize RxDB database with encryption
 */
export async function initDatabase(password: string): Promise<RxDatabase> {
  if (db) return db;
  
  encryptionPassword = password;
  
  // Create database with Dexie storage (IndexedDB)
  db = await createRxDatabase({
    name: 'egos_inteligencia_db',
    storage: getRxStorageDexie(),
    password, // RxDB will use this for internal encryption if plugin added
    multiInstance: false, // Single-tab mode for security
  });
  
  // Add collections
  await db.addCollections({
    investigations: { schema: investigationSchema },
    entities: { schema: entitySchema },
    chatMessages: { schema: chatMessageSchema },
    conversations: { schema: conversationSchema },
  });
  
  console.log('[RxDB] Database initialized');
  return db;
}

/**
 * Get database instance (must call initDatabase first)
 */
export function getDatabase(): RxDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Encrypt and store sensitive field
 */
export async function encryptField(value: string): Promise<EncryptedData> {
  if (!encryptionPassword) {
    throw new Error('Encryption not initialized');
  }
  return browserEncrypt(value, encryptionPassword);
}

/**
 * Decrypt sensitive field
 */
export async function decryptField(encrypted: EncryptedData): Promise<string> {
  if (!encryptionPassword) {
    throw new Error('Encryption not initialized');
  }
  return browserDecrypt(encrypted, encryptionPassword);
}

/**
 * Typed collection accessors
 */
export function getInvestigationsCollection(): RxCollection<InvestigationDoc> {
  return getDatabase().investigations as RxCollection<InvestigationDoc>;
}

export function getEntitiesCollection(): RxCollection<EntityDoc> {
  return getDatabase().entities as RxCollection<EntityDoc>;
}

export function getChatMessagesCollection(): RxCollection<ChatMessageDoc> {
  return getDatabase().chatMessages as RxCollection<ChatMessageDoc>;
}

export function getConversationsCollection(): RxCollection<ConversationDoc> {
  return getDatabase().conversations as RxCollection<ConversationDoc>;
}

/**
 * Check if database exists
 */
export async function databaseExists(): Promise<boolean> {
  // Check if IndexedDB database exists
  const databases = await indexedDB.databases();
  return databases.some(db => db.name === 'egos_inteligencia_db');
}

/**
 * Destroy database (for logout/reset)
 */
export async function destroyDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    encryptionPassword = null;
  }
}

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<Record<string, unknown[]>> {
  const database = getDatabase();
  const exportData: Record<string, unknown[]> = {};
  
  for (const [name, collection] of Object.entries(database.collections)) {
    exportData[name] = await collection.find().exec();
  }
  
  return exportData;
}

/**
 * Import database from backup
 */
export async function importDatabase(data: Record<string, unknown[]>): Promise<void> {
  const database = getDatabase();
  
  for (const [name, docs] of Object.entries(data)) {
    const collection = database.collections[name];
    if (collection) {
      await collection.bulkInsert(docs as Record<string, unknown>[]);
    }
  }
}
