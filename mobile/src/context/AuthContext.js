import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import {
  getCachedUser,
  getToken,
  removeCachedUser,
  removeToken,
  setCachedUser,
  setStorageUser,
  setToken,
} from '../utils/storage';
import { isDarkModeEnabled } from '../utils/theme';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      await setStorageUser(null);
      setLoading(false);
      return;
    }
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      await setStorageUser(cachedUser.id);
      setUser(cachedUser);
      setLoading(false);
    }
    try {
      const userData = await api.me();
      await setStorageUser(userData.id);
      setUser(userData);
      await setCachedUser(userData);
    } catch (err) {
      if (err?.status === 401) {
        await Promise.all([removeToken(), removeCachedUser()]);
        await setStorageUser(null);
        setUser(null);
      }
      // Other failures keep a valid cached session available during backend outages.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.login({ email: email.trim().toLowerCase(), password });
    await setToken(data.access_token);
    const userData = await api.me();
    await setStorageUser(userData.id);
    setUser(userData);
    await setCachedUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const data = await api.register({
      email: email.trim().toLowerCase(),
      password,
      name: name?.trim() || null,
    });
    await setToken(data.access_token);
    const userData = await api.me();
    await setStorageUser(userData.id);
    setUser(userData);
    await setCachedUser(userData);
    return userData;
  };

  const logout = async () => {
    await Promise.all([removeToken(), removeCachedUser()]);
    await setStorageUser(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    setCachedUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
      await setCachedUser(userData);
      return userData;
    } catch {}
  };

  const toggleDarkMode = async () => {
    if (!user) return;
    const newMode = isDarkModeEnabled(user.dark_mode) ? 0 : 1;
    const previousUser = user;
    const optimisticUser = { ...user, dark_mode: newMode };
    setUser(optimisticUser);
    await setCachedUser(optimisticUser);
    try {
      const updated = await api.updateProfile({ dark_mode: newMode });
      setUser(updated);
      await setCachedUser(updated);
      return updated;
    } catch (error) {
      setUser(previousUser);
      await setCachedUser(previousUser);
      throw error;
    }
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
