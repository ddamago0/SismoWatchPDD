import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sismowatch_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sismowatch_token');
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      // Default to viewer session if none stored, or prompt login
      setUser({ username: 'viewer', role: 'viewer' });
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const res: AuthResponse = await api.login(username, password);
    const userData: User = { username: res.username, role: res.role };
    localStorage.setItem('sismowatch_token', res.access_token);
    localStorage.setItem('sismowatch_user', JSON.stringify(userData));
    setToken(res.access_token);
    setUser(userData);
    setShowLoginModal(false);
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
        isAdmin: user?.role === 'admin',
        login,
        logout,
        showLoginModal,
        setShowLoginModal,
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
