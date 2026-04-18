'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Module-level singletons — one per environment
let _clientSingleton: SupabaseClient | null = null;
let _serverSingleton: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    // Server-side: module-level singleton (safe — each request gets same module instance)
    if (typeof window === 'undefined') {
        if (!_serverSingleton) {
            _serverSingleton = createClient(url, key);
        }
        return _serverSingleton;
    }

    // Client-side: single instance for the entire browser session
    if (!_clientSingleton) {
        _clientSingleton = createClient(url, key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'intelink-auth-token',
            },
        });
    }
    return _clientSingleton;
}

export const getSupabase = getSupabaseClient;

export function isSupabaseReady(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
