'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOffline: boolean;
  serviceWorkerReady: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isOffline: false,
    serviceWorkerReady: false,
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState(prev => ({ ...prev, isInstalled: true }));
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, canInstall: true }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
    };

    // Listen for online/offline
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] SW registered:', registration);
          setState(prev => ({ ...prev, serviceWorkerReady: true }));
        })
        .catch((err) => {
          console.error('[PWA] SW registration failed:', err);
        });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_READY') {
          setState(prev => ({ ...prev, serviceWorkerReady: true }));
        }
      });
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline state
    setState(prev => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }
    
    setDeferredPrompt(null);
    setState(prev => ({ ...prev, canInstall: false }));
  }, [deferredPrompt]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  return {
    ...state,
    install,
    requestNotificationPermission,
  };
}
