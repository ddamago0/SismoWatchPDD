import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, AuthResponse } from '../types';

export const PRESET_CREDENTIALS = {
  admin: {
    username: 'admin',
    password: '9qwtK_dVjef-ex5qgrHnlJRr6u8',
  },
  viewer: {
    username: 'viewer',
    password: '-D5x4648Zh-EJsYBqhAp74-b6wk',
  },
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  quickLogin: (role: 'admin' | 'viewer') => Promise<void>;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sismowatch_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sismowatch_user');
    const savedToken = localStorage.getItem('sismowatch_token');
    if (saved && savedToken) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Escuchar eventos de sesión expirada emitidos por el interceptor de api.ts
  useEffect(() => {
    const handleSessionExpired = () => {
      setToken(null);
      setUser(null);
      setAuthError('Tu sesión ha expirado o no es válida. Por favor ingresa de nuevo.');
      setShowLoginModal(true);
    };

    window.addEventListener('sismowatch:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('sismowatch:session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (username: string, password: string) => {
    setAuthError(null);
    const res: AuthResponse = await api.login(username, password);
    const userData: User = { username: res.username, role: res.role };

    localStorage.setItem('sismowatch_token', res.access_token);
    localStorage.setItem('sismowatch_user', JSON.stringify(userData));

    setToken(res.access_token);
    setUser(userData);
    setShowLoginModal(false);
  };

  const quickLogin = async (role: 'admin' | 'viewer') => {
    const creds = PRESET_CREDENTIALS[role];
    await login(creds.username, creds.password);
  };

  const logout = () => {
    localStorage.removeItem('sismowatch_token');
    localStorage.removeItem('sismowatch_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        login,
        quickLogin,
        logout,
        showLoginModal,
        setShowLoginModal,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
