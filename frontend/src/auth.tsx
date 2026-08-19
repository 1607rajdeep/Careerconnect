import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Role = 'job_seeker' | 'employer' | 'admin';

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_approved: boolean;
  photo_path?: string | null;
  company_name?: string | null;
  company_logo_path?: string | null;
  bio?: string | null;
  location?: string | null;
  experience_level?: string | null;
  resume_path?: string | null;
};

const KEY = 'cc_access_token';

const storage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(KEY);
    }
    return SecureStore.getItemAsync(KEY);
  },
  set: async (v: string) => {
    if (Platform.OS === 'web') { localStorage.setItem(KEY, v); return; }
    return SecureStore.setItemAsync(KEY, v);
  },
  clear: async () => {
    if (Platform.OS === 'web') { localStorage.removeItem(KEY); return; }
    return SecureStore.deleteItemAsync(KEY);
  },
};

export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type Ctx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; role: Role; company_name?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const boot = useCallback(async () => {
    try {
      const t = await storage.get();
      if (t) {
        setToken(t);
        const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) setUser(await res.json());
        else await storage.clear();
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { boot(); }, [boot]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    await storage.set(data.access_token); setToken(data.access_token); setUser(data.user);
    return data.user;
  };

  const register = async (payload: any) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Register failed');
    await storage.set(data.access_token); setToken(data.access_token); setUser(data.user);
    return data.user;
  };

  const logout = async () => { await storage.clear(); setToken(null); setUser(null); };

  const refresh = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUser(await res.json());
  };

  return <AuthCtx.Provider value={{ user, token, loading, login, register, logout, refresh, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}

export async function api<T = any>(path: string, opts: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text }; }
  if (!res.ok) throw new Error((data && data.detail) || 'Request failed');
  return data as T;
}

export function fileUrl(path: string | null | undefined, token: string | null): string | undefined {
  if (!path || !token) return undefined;
  return `${API_URL}/api/files/${path}?token=${encodeURIComponent(token)}`;
}
