import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy: evita crash na build do Vercel quando NEXT_PUBLIC_ ainda não estão disponíveis
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars não configuradas');
    _client = createClient(url, key);
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getClient() as any)[prop];
  },
});
