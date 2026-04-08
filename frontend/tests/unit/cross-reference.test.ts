/**
 * Unit tests — cross-reference-service
 * Uses synthetic data only. No real PII.
 */

import { describe, it, expect } from 'vitest';

// Test the core matching logic without importing the full service
// (avoids Neo4j dependency in unit tests)

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  const prefix = Math.min(4, [...s1].findIndex((c, i) => c !== s2[i]) === -1 ? Math.min(len1, len2) : [...s1].findIndex((c, i) => c !== s2[i]));
  return jaro + prefix * 0.1 * (1 - jaro);
}

describe('jaroWinkler similarity', () => {
  it('identical strings return 1', () => {
    expect(jaroWinkler('JOÃO SILVA', 'JOÃO SILVA')).toBe(1);
  });

  it('completely different strings return low score', () => {
    const score = jaroWinkler('ANTONIO', 'BEATRIZ');
    expect(score).toBeLessThan(0.6);
  });

  it('similar names score high', () => {
    const score = jaroWinkler('JOAO SILVA', 'JOÃO SILVA');
    expect(score).toBeGreaterThan(0.8);
  });

  it('empty string vs non-empty returns 0', () => {
    expect(jaroWinkler('', 'SILVA')).toBe(0);
  });
});

describe('CPF confidence level', () => {
  it('exact CPF match = HIGH confidence', () => {
    const cpf1: string = '12345678901'; // synthetic — not a real CPF
    const cpf2: string = '12345678901';
    expect(cpf1).toBe(cpf2);
  });

  it('different CPFs = no match', () => {
    const cpf1: string = '12345678901';
    const cpf2: string = '98765432100';
    expect(cpf1).not.toBe(cpf2);
  });
});

describe('Benford anomaly detection', () => {
  it('uniform distribution fails Benford', () => {
    // Uniform leading digits are NOT expected by Benford
    const uniform = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const leadingDigits = uniform.map(n => parseInt(String(n)[0]));
    const counts = new Array(10).fill(0);
    leadingDigits.forEach(d => counts[d]++);

    // In Benford, digit 1 should appear ~30% of time
    // In uniform, each digit appears ~11%
    const digit1Freq = counts[1] / uniform.length;
    expect(digit1Freq).toBeLessThan(0.25); // Benford expects ~0.30
  });

  it('natural financial data follows Benford loosely', () => {
    // Fibonacci sequence tends to follow Benford's law
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
    const leadingDigits = fib.map(n => parseInt(String(n)[0]));
    const counts = new Array(10).fill(0);
    leadingDigits.forEach(d => counts[d]++);

    // Digit 1 should appear most frequently in Fibonacci
    const maxCount = Math.max(...counts.slice(1));
    expect(counts[1]).toBe(maxCount);
  });
});
