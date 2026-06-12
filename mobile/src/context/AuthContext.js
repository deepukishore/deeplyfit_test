import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { getToken, setToken, removeToken } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const userData = await api.me();
      setUser(userData);
    } catch {
      await removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    await setToken(data.access_token);
    const userData = await api.me();
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const data = await api.register({ email, password, name });
    await setToken(data.access_token);
    const userData = await api.me();
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
      return userData;
    } catch {}
  };

  const toggleDarkMode = async () => {
    if (!user) return;
    const newMode = user.dark_mode ? 0 : 1;
    try {
      const updated = await api.updateProfile({ dark_mode: newMode });
      setUser(updated);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
