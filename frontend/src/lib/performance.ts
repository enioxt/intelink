/**
 * Performance Helpers — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Performance optimization utilities
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoize expensive calculations
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Measure function execution time
export function measurePerformance<T extends (...args: any[]) => any>(
  name: string,
  func: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  }) as T;
}

// Lazy load component (dynamic import)
export function lazyLoad<T>(loader: () => Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    loader(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Load timeout')), timeoutMs)
    ),
  ]);
}

// Preload image
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return [ref as React.RefObject<HTMLElement>, isIntersecting];
}

// Hook for window size
export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    updateSize();
    window.addEventListener('resize', throttle(updateSize, 100));
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

// Hook for scroll position
export function useScrollPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      setPosition({ x: window.scrollX, y: window.scrollY });
    };
    
    window.addEventListener('scroll', throttle(updatePosition, 50));
    return () => window.removeEventListener('scroll', updatePosition);
  }, []);

  return position;
}

// Virtual list helper (for large datasets)
export interface VirtualListConfig {
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

export function calculateVisibleRange(
  scrollTop: number,
  totalItems: number,
  config: VirtualListConfig
): { start: number; end: number } {
  const { itemHeight, overscan, containerHeight } = config;
  
  const startIdx = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const start = Math.max(0, startIdx - overscan);
  const end = Math.min(totalItems, startIdx + visibleCount + overscan);
  
  return { start, end };
}

// Web Worker helper for heavy computations
export function createWorker<T, R>(
  workerFunction: (data: T) => R
): { execute: (data: T) => Promise<R>; terminate: () => void } {
  const workerCode = `
    self.onmessage = function(e) {
      const result = (${workerFunction.toString()})(e.data);
      self.postMessage(result);
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  
  return {
    execute: (data: T): Promise<R> => {
      return new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage(data);
      });
    },
    terminate: () => worker.terminate(),
  };
}

// Bundle size analyzer (development only)
export function analyzeBundleSize(): void {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore
  const modules = window.webpackModules || {};
  const sizes = Object.entries(modules).map(([id, mod]: [string, any]) => ({
    id,
    size: mod?.toString()?.length || 0,
  }));
  
  const sorted = sizes.sort((a, b) => b.size - a.size);
  console.table(sorted.slice(0, 20));
}

export default {
  debounce,
  throttle,
  memoize,
  measurePerformance,
  lazyLoad,
  preloadImage,
  useIntersectionObserver,
  useWindowSize,
  useScrollPosition,
  calculateVisibleRange,
  createWorker,
  analyzeBundleSize,
};
