import { useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  masp: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) { setLoading(false); return; }
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, isAuthenticated: !!user };
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      window.location.href = '/intelink/auth/login';
    }
  }, [user, loading]);
  return { user, loading };
}

export function useRequireAdmin() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user?.role !== 'admin' && typeof window !== 'undefined') {
      window.location.href = '/intelink';
    }
  }, [user, loading]);
  return { user, loading };
}
