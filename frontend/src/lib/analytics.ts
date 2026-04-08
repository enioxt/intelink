/**
 * Analytics — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Track user interactions and system metrics
 */

import { useEffect } from 'react';

// Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

// Simple in-memory analytics queue (would be sent to backend)
const eventQueue: AnalyticsEvent[] = [];

// Track event
export function trackEvent(name: string, properties?: Record<string, any>) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  eventQueue.push(event);

  // Send to backend in batches (or use beacon API on unload)
  if (eventQueue.length >= 10) {
    flushEvents();
  }
}

// Flush events to backend
export async function flushEvents() {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue.length = 0;

  try {
    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ events })],
        { type: 'application/json' }
      );
      navigator.sendBeacon('/api/v1/analytics/events', blob);
    } else {
      // Fallback to fetch
      await fetch('/api/v1/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    }
  } catch (err) {
    // Re-queue on failure
    eventQueue.push(...events);
  }
}

// Get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Hook for page view tracking
export function usePageView(pageName: string) {
  useEffect(() => {
    trackEvent('page_view', { page: pageName });
  }, [pageName]);
}

// Hook for tracking specific events
export function useAnalytics() {
  return {
    track: trackEvent,
    trackClick: (elementName: string, properties?: Record<string, any>) => {
      trackEvent('click', { element: elementName, ...properties });
    },
    trackSearch: (query: string, resultsCount: number) => {
      trackEvent('search', { query, results_count: resultsCount });
    },
    trackEntityView: (entityId: string, entityType: string) => {
      trackEvent('entity_view', { entity_id: entityId, entity_type: entityType });
    },
    trackGraphExpand: (entityId: string, depth: number) => {
      trackEvent('graph_expand', { entity_id: entityId, depth });
    },
    trackExport: (format: string, entityCount: number) => {
      trackEvent('export', { format, entity_count: entityCount });
    },
    trackChatMessage: (messageType: 'user' | 'assistant') => {
      trackEvent('chat_message', { type: messageType });
    },
  };
}

// Track performance metrics
export function trackPerformance(metric: string, value: number) {
  trackEvent('performance', { metric, value });
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });
}

export default {
  trackEvent,
  flushEvents,
  usePageView,
  useAnalytics,
  trackPerformance,
};
