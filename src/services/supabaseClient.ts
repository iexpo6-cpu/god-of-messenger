import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
    return Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl.startsWith('https://') &&
        supabaseAnonKey.length > 20
    );
};

export const getSupabaseClient = (): SupabaseClient | null => {
    if (!isSupabaseConfigured()) return null;
    if (!cachedClient && supabaseUrl && supabaseAnonKey) {
        cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    }
    return cachedClient;
};
