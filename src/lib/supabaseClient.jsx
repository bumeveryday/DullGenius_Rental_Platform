
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY

console.log('Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) : 'N/A',
    envMode: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Key is missing! Check your .env file or Vite config envPrefix.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
