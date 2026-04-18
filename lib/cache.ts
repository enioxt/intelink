/**
 * Cache Utilities — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Local storage and memory caching utilities
 */

import { useState, useEffect, useCallback } from 'react';

// Memory cache
const memoryCache: Map<string, { value: any; expiry: number }> = new Map();

// Cache item with TTL
export function setCache<T>(
  key: string,
  value: T,
  ttlMs: number = 5 * 60 * 1000 // 5 minutes default
): void {
  const expiry = Date.now() + ttlMs;
  memoryCache.set(key, { value, expiry });

  // Also save to localStorage for persistence
  try {
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({ value, expiry })
    );
  } catch {
    // Ignore localStorage errors
  }
}

// Get cached item
export function getCache<T>(key: string): T | null {
  // Check memory first
  const memItem = memoryCache.get(key);
  if (memItem && memItem.expiry > Date.now()) {
    return memItem.value;
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(`cache_${key}`);
    if (stored) {
      const { value, expiry } = JSON.parse(stored);
      if (expiry > Date.now()) {
        // Restore to memory
        memoryCache.set(key, { value, expiry });
        return value;
      }
      // Expired, remove
      localStorage.removeItem(`cache_${key}`);
    }
  } catch {
    // Ignore errors
  }

  return null;
}

// Remove cached item
export function removeCache(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(`cache_${key}`);
  } catch {
    // Ignore errors
  }
}

// Clear all cache
export function clearCache(): void {
  memoryCache.clear();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore errors
  }
}

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(() => getCache<T>(key));
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setCache(key, result, ttlMs);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, key, ttlMs]);

  useEffect(() => {
    if (!data) {
      refresh();
    }
  }, [data, refresh]);

  return { data, isLoading, error, refresh };
}

// Cache for API calls with deduplication
const pendingRequests: Map<string, Promise<any>> = new Map();

export async function cachedApiCall<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  // Check cache first
  const cached = getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Check for pending request (deduplication)
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  // Make request
  const promise = fetcher().then((result) => {
    setCache(key, result, ttlMs);
    pendingRequests.delete(key);
    return result;
  }).catch((err) => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, promise);
  return promise;
}

// LRU Cache implementation
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export default {
  setCache,
  getCache,
  removeCache,
  clearCache,
  useCachedData,
  cachedApiCall,
  LRUCache,
};
