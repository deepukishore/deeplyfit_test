import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(api.getOfflineQueueLength());

  const syncOfflineChanges = useCallback(async (showSuccessToast = false) => {
    if (syncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    setSyncing(true);
    try {
      const result = await api.syncOfflineDiary();
      setPendingCount(result.pendingCount);
      if (showSuccessToast && result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} offline change${result.syncedCount === 1 ? '' : 's'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not sync offline changes yet');
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncOfflineChanges(true);
    };

    const handleOffline = () => {
      setOnline(false);
    };

    const handleQueueChanged = () => {
      setPendingCount(api.getOfflineQueueLength());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('deeplyfit:offline-queue-changed', handleQueueChanged);

    if (navigator.onLine && api.getOfflineQueueLength() > 0) {
      syncOfflineChanges(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('deeplyfit:offline-queue-changed', handleQueueChanged);
    };
  }, [syncOfflineChanges]);

  const value = useMemo(() => ({
    online,
    syncing,
    pendingCount,
    syncOfflineChanges,
  }), [online, syncing, pendingCount, syncOfflineChanges]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetworkStatus = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkProvider');
  }
  return context;
};
