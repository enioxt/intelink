/**
 * AUTH-012: Generate RS256 key pair for JWT signing.
 * Run once on VPS: bun scripts/gen-jwt-keys.ts
 * Add output to /opt/intelink-nextjs/.env.production
 */

import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('RS256', { modulusLength: 2048 });

const privateKeyPem = await exportPKCS8(privateKey);
const publicKeyPem  = await exportSPKI(publicKey);

// Encode newlines so the PEM fits in a single env var line
const encodeEnv = (pem: string) => pem.replace(/\n/g, '\\n');

console.log('# Add these to your .env.production:');
console.log(`JWT_PRIVATE_KEY="${encodeEnv(privateKeyPem)}"`);
console.log(`JWT_PUBLIC_KEY="${encodeEnv(publicKeyPem)}"`);
console.log('');
console.log('# Remove JWT_SECRET once RS256 is confirmed working.');
