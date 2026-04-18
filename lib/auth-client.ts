/**
 * JWT Authentication — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Token management and auth state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  points: number;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  getToken: () => string | null;
  getAuthHeaders: () => Record<string, string>;
  clearError: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            set({ isLoading: false, error: error.detail || 'Login failed' });
            return false;
          }

          const data = await response.json();

          // Fetch user profile
          const userResponse = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` },
          });

          let user = null;
          if (userResponse.ok) {
            user = await userResponse.json();
          }

          set({
            token: data.access_token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          return false;
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) {
            // Token expired or invalid
            set({ token: null, user: null, isAuthenticated: false });
            return false;
          }

          const data = await response.json();
          set({ token: data.access_token });
          return true;
        } catch (err) {
          set({ token: null, user: null, isAuthenticated: false });
          return false;
        }
      },

      getToken: () => get().token,

      getAuthHeaders: (): Record<string, string> => {
        const { token } = get();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'egos-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook for protected routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    isReady: !isLoading,
  };
}

// Axios/fetch interceptor helper
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuth.getState().getToken();

  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token expiration
  if (response.status === 401) {
    const refreshed = await useAuth.getState().refreshToken();
    if (refreshed) {
      // Retry with new token
      const newToken = useAuth.getState().getToken();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
    }
  }

  return response;
}
