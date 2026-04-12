import { createClient } from '@supabase/supabase-js';

// Client com service role — usar APENAS em server-side (API routes, Server Components)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
