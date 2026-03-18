import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https://rbdowvzyqnxmnazxnhvo.supabase.co;
const supabaseAnonKey = process.env.sb_publishable_aVgX8OpLckGWaKC8LU75sQ_IR7kpN0e;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throw early so misconfig is obvious during dev.
  throw new Error(
    'Missing Supabase env vars. Set https://rbdowvzyqnxmnazxnhvo.supabase.co and sb_publishable_aVgX8OpLckGWaKC8LU75sQ_IR7kpN0e.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

