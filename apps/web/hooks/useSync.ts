'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getCRDTSync, 
  WebRTCSync,
  SyncMessage,
  DocId 
} from '@/lib/db/sync';

interface SyncStatus {
  peerId: string;
  connected: boolean;
  documents: Array<{
    docId: DocId;
    lastSync: string | null;
    hasChanges: boolean;
  }>;
}

interface UseSyncReturn {
  status: SyncStatus;
  connect: (peerId: string) => Promise<void>;
  disconnect: () => void;
  createDocument: <T>(id: DocId, type: string, data: T) => void;
  changeDocument: <T>(id: DocId, changeFn: (doc: T) => void) => void;
  exportDocument: (id: DocId) => Uint8Array | null;
  syncAll: () => Promise<void>;
  webRTC: {
    createOffer: () => Promise<RTCSessionDescriptionInit>;
    acceptOffer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
    completeConnection: (answer: RTCSessionDescriptionInit) => Promise<void>;
    isReady: boolean;
  } | null;
}

export function useSync(): UseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>({
    peerId: '',
    connected: false,
    documents: [],
  });
  
  const crdtRef = useRef(getCRDTSync());
  const webRTCRef = useRef<WebRTCSync | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const crdt = crdtRef.current;
      const syncStatus = crdt.getSyncStatus();
      
      setStatus(prev => ({
        ...prev,
        documents: syncStatus,
      }));
    };

    intervalRef.current = setInterval(updateStatus, 2000);
    updateStatus();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const connect = useCallback(async (peerId: string) => {
    const crdt = getCRDTSync(peerId);
    await crdt.initialize('default-key'); // TODO: proper key management
    
    crdtRef.current = crdt;
    webRTCRef.current = new WebRTCSync(crdt);
    
    setStatus({
      peerId,
      connected: true,
      documents: [],
    });
  }, []);

  const disconnect = useCallback(() => {
    webRTCRef.current?.close();
    webRTCRef.current = null;
    
    setStatus(prev => ({
      ...prev,
      connected: false,
    }));
  }, []);

  const createDocument = useCallback(<T,>(id: DocId, type: string, data: T) => {
    crdtRef.current.createDocument(id, type as any, data);
  }, []);

  const changeDocument = useCallback(<T,>(id: DocId, changeFn: (doc: T) => void) => {
    crdtRef.current.changeDocument(id, changeFn);
  }, []);

  const exportDocument = useCallback((id: DocId) => {
    return crdtRef.current.exportDocument(id);
  }, []);

  const syncAll = useCallback(async () => {
    await crdtRef.current.syncAll();
  }, []);

  // WebRTC methods
  const webRTCHandlers = webRTCRef.current ? {
    createOffer: async () => {
      if (!webRTCRef.current) throw new Error('WebRTC not initialized');
      return webRTCRef.current.createOffer();
    },
    acceptOffer: async (offer: RTCSessionDescriptionInit) => {
      if (!webRTCRef.current) throw new Error('WebRTC not initialized');
      return webRTCRef.current.acceptOffer(offer);
    },
    completeConnection: async (answer: RTCSessionDescriptionInit) => {
      if (!webRTCRef.current) throw new Error('WebRTC not initialized');
      return webRTCRef.current.completeConnection(answer);
    },
    isReady: !!webRTCRef.current,
  } : null;

  return {
    status,
    connect,
    disconnect,
    createDocument,
    changeDocument,
    exportDocument,
    syncAll,
    webRTC: webRTCHandlers,
  };
}
