// Stub para supabaseClient - será implementado com integração real
import { createClient } from '@supabase/supabase-js';

// Lazy client creation to avoid build-time errors
let clientInstance: any = null;

// Create a mock client for build time when env vars are not available
const createMockClient = () => ({
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Not configured') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Not configured') }),
        signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        eq: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
    }),
});

const getClient = () => {
    if (clientInstance) return clientInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Only create real client if we have both URL and key
    if (supabaseUrl && supabaseKey) {
        clientInstance = createClient(supabaseUrl, supabaseKey);
    } else {
        clientInstance = createMockClient();
    }

    return clientInstance;
};

export const supabaseClient = getClient();
export const getBrowserClient = () => getClient();
export default supabaseClient;
