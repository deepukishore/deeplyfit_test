import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);
const THEME_STORAGE_KEY = 'deeply_fit_theme';

const isDarkModeEnabled = (value) => value === 1 || value === '1' || value === true;

const applyTheme = (darkMode) => {
  if (typeof document === 'undefined') {
    return;
  }

  const isDark = isDarkModeEnabled(darkMode);
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }
};

const applyStoredTheme = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light') {
    applyTheme(false);
    return;
  }

  if (storedTheme === 'dark') {
    applyTheme(true);
    return;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('deeply_fit_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await api.me();
      setUser(userData);
      applyTheme(userData.dark_mode);
    } catch (err) {
      localStorage.removeItem('deeply_fit_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyStoredTheme();
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('deeply_fit_token', data.access_token);
    const userData = await api.me();
    setUser(userData);
    applyTheme(userData.dark_mode);
    return userData;
  };

  const register = async (email, password, name) => {
    const data = await api.register({ email, password, name });
    localStorage.setItem('deeply_fit_token', data.access_token);
    const userData = await api.me();
    setUser(userData);
    applyTheme(userData.dark_mode);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('deeply_fit_token');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  const toggleDarkMode = async () => {
    const currentMode = isDarkModeEnabled(user?.dark_mode) ? 1 : 0;
    const nextMode = currentMode ? 0 : 1;
    applyTheme(nextMode);
    if (user) {
      setUser({ ...user, dark_mode: nextMode });
    }
    try {
      const updated = await api.updateProfile({ dark_mode: nextMode });
      setUser(updated);
      applyTheme(updated.dark_mode);
    } catch (err) {
      if (user) {
        setUser({ ...user, dark_mode: currentMode });
      }
      applyTheme(currentMode);
      console.error('Failed to update dark mode', err);
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
