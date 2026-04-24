'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';

/**
 * Auth provider — single source of truth is /api/v2/auth/verify (reads
 * httpOnly intelink_access cookie). No more localStorage tokens, no more
 * chat_id, no more v1 flow. Only thing in localStorage is `intelink_member_id`
 * which is a convenience cache for components that need it synchronously.
 */

interface Member {
    id: string;
    name: string;
    role: string;
    system_role: string;
    unit_id?: string;
}

interface AuthContextType {
    member: Member | null;
    loading: boolean;
    isAuthenticated: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    member: null,
    loading: true,
    isAuthenticated: false,
    refresh: async () => {},
    logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const refresh = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            const res = await fetch('/api/v2/auth/verify', { credentials: 'include' });
            if (!res.ok) {
                setMember(null);
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (data.valid && data.member) {
                const m: Member = {
                    id: data.member.id,
                    name: data.member.name,
                    role: data.member.role || 'member',
                    system_role: data.member.systemRole || 'member',
                    unit_id: data.member.unitId,
                };
                setMember(m);
                localStorage.setItem('intelink_member_id', m.id);
                localStorage.setItem('intelink_role', m.system_role);
            } else {
                setMember(null);
            }
        } catch {
            setMember(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-bridge: if Supabase session exists but v2 doesn't, call bridge once.
    const autoBridge = useCallback(async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email || !session.access_token) return;

        try {
            await fetch('/api/auth/bridge', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ email: session.user.email }),
            });
        } catch { /* best-effort */ }
    }, []);

    useEffect(() => {
        (async () => {
            await refresh();
            // If not authenticated after first refresh, try bridging once
            if (typeof window !== 'undefined' && !localStorage.getItem('intelink_member_id')) {
                await autoBridge();
                await refresh();
            }
        })();
    }, [refresh, autoBridge]);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'include' });
        } catch {}
        try {
            const supabase = getSupabaseClient();
            await supabase?.auth.signOut({ scope: 'local' });
        } catch {}

        localStorage.removeItem('intelink_member_id');
        localStorage.removeItem('intelink_role');
        setMember(null);
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                member,
                loading,
                isAuthenticated: !!member,
                refresh,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
