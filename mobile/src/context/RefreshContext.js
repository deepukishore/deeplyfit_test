import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const refreshHandlerRef = useRef(null);

  const register = useCallback((handler) => {
    refreshHandlerRef.current = handler;
    return () => { if (refreshHandlerRef.current === handler) refreshHandlerRef.current = null; };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof refreshHandlerRef.current === 'function') {
      await refreshHandlerRef.current();
      return true;
    }
    return false;
  }, []);

  const value = useMemo(() => ({ register, refresh }), [register, refresh]);
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
};

export const useRefreshController = () => {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefreshController must be used within RefreshProvider');
  return ctx;
};

export const useRefreshRegistration = (handler) => {
  const { register } = useRefreshController();
  React.useEffect(() => {
    if (!handler) return undefined;
    return register(handler);
  }, [handler, register]);
};
