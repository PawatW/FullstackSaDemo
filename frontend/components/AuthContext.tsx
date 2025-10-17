'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../lib/config';
import { decodeJwtPayload, isTokenExpired } from '../lib/auth';
import { ApiError } from '../lib/api';

type Role = 'ADMIN' | 'SALES' | 'TECHNICIAN' | 'FOREMAN' | 'WAREHOUSE' | string;

interface AuthContextValue {
  token: string | null;
  staffId: string | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'inventory-auth-token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      const payload = decodeJwtPayload(saved);
      if (payload && !isTokenExpired(payload)) {
        setToken(saved);
        setStaffId(payload.sub);
        setRole((payload.role as Role) || null);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStaffId(null);
    setRole(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    router.push('/');
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new ApiError(message || 'ไม่สามารถเข้าสู่ระบบได้', response.status);
      }

      const data = await response.json();
      const receivedToken = data.token as string;
      const payload = decodeJwtPayload(receivedToken);
      if (!payload || !payload.sub) {
        throw new Error('Token ที่ได้รับไม่ถูกต้อง');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, receivedToken);
      }
      setToken(receivedToken);
      setStaffId(payload.sub);
      setRole((payload.role as Role) || null);
      router.push('/dashboard');
    },
    [router]
  );

  const value = useMemo(
    () => ({
      token,
      staffId,
      role,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, staffId, role, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
