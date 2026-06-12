import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const syncOfflineChanges = useCallback(async (showSuccessToast = false) => {
    if (syncingRef.current) return;
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await api.syncOfflineDiary();
      setPendingCount(result.pendingCount);
      if (showSuccessToast && result.syncedCount > 0) {
        Toast.show({ type: 'success', text1: `Synced ${result.syncedCount} offline change${result.syncedCount === 1 ? '' : 's'}` });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not sync offline changes yet' });
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const count = await api.getOfflineQueueLength();
      setPendingCount(count);
    };
    init();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline) syncOfflineChanges(true);
    });
    return unsubscribe;
  }, [syncOfflineChanges]);

  const value = useMemo(() => ({ online, syncing, pendingCount, syncOfflineChanges }), [online, syncing, pendingCount, syncOfflineChanges]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetworkStatus = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetworkStatus must be used within NetworkProvider');
  return ctx;
};
