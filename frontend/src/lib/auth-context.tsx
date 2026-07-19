'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('esp_token');
    const storedUser = localStorage.getItem('esp_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    });
    const { user: u, token: t } = res.data!;
    setUser(u);
    setToken(t);
    localStorage.setItem('esp_token', t);
    localStorage.setItem('esp_user', JSON.stringify(u));
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', {
      email,
      password,
      name,
    });
    const { user: u, token: t } = res.data!;
    setUser(u);
    setToken(t);
    localStorage.setItem('esp_token', t);
    localStorage.setItem('esp_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('esp_token');
    localStorage.removeItem('esp_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
