import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const refreshHandlerRef = useRef(null);

  const register = useCallback((handler) => {
    refreshHandlerRef.current = handler;

    return () => {
      if (refreshHandlerRef.current === handler) {
        refreshHandlerRef.current = null;
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof refreshHandlerRef.current === 'function') {
      await refreshHandlerRef.current();
      return true;
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
      return true;
    }

    return false;
  }, []);

  const value = useMemo(() => ({ register, refresh }), [register, refresh]);
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
};

export const useRefreshController = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshController must be used within RefreshProvider');
  }
  return context;
};

export const useRefreshRegistration = (handler) => {
  const { register } = useRefreshController();

  useEffect(() => {
    if (!handler) return undefined;
    return register(handler);
  }, [handler, register]);
};
