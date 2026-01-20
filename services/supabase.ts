
// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Environment variables should be in a .env file:
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

// Using import.meta.env for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const checkSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase.from('patients').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase Connected');
        return true;
    } catch (err) {
        console.error('❌ Supabase Connection Failed:', err);
        return false;
    }
};
