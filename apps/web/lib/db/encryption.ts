/**
 * RxDB Encryption Layer with AES-256-GCM + PBKDF2
 * Implements SEC-002: Dados locais criptografados
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000; // 100k rounds (OWASP recommendation)
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedData {
  ciphertext: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
  authTag: string; // Base64
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(plaintext: string, password: string): EncryptedData {
  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key from password
  const key = deriveKey(password, salt);
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData, password: string): string {
  const { ciphertext, iv, salt, authTag } = encryptedData;
  
  // Decode from base64
  const ivBuffer = Buffer.from(iv, 'base64');
  const saltBuffer = Buffer.from(salt, 'base64');
  const authTagBuffer = Buffer.from(authTag, 'base64');
  
  // Derive key
  const key = deriveKey(password, saltBuffer);
  
  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  // Decrypt
  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Hash password for storage (not for encryption key derivation)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('base64');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  return `${salt}$${hash.toString('base64')}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split('$');
  if (!salt || !hash) return false;
  
  const computedHash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  return computedHash.toString('base64') === hash;
}

/**
 * Generate secure random key for database encryption
 */
export function generateDatabaseKey(): string {
  return randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Hash data for integrity verification (Merkle tree leaves)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Browser-compatible encryption (for client-side use)
 * Uses Web Crypto API when available
 */
export async function browserEncrypt(plaintext: string, password: string): Promise<EncryptedData> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key using PBKDF2
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    
    // Split ciphertext and auth tag (last 16 bytes)
    const cipherArray = new Uint8Array(ciphertext);
    const authTag = cipherArray.slice(-AUTH_TAG_LENGTH);
    const cipherData = cipherArray.slice(0, -AUTH_TAG_LENGTH);
    
    return {
      ciphertext: btoa(String.fromCharCode(...cipherData)),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt)),
      authTag: btoa(String.fromCharCode(...authTag)),
    };
  }
  
  // Fallback for server-side
  return encrypt(plaintext, password);
}

/**
 * Browser-compatible decryption
 */
export async function browserDecrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(encryptedData.authTag), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
    
    // Combine ciphertext and auth tag
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);
    
    // Derive key
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      combined
    );
    
    return decoder.decode(plaintext);
  }
  
  return decrypt(encryptedData, password);
}
