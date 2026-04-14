import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Para Server Components, layouts e Route Handlers — lê/escreve sessão via cookie
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component não pode setar cookies — ignorar
          }
        },
      },
    }
  );
}

// Para operações admin (service role) — sem sessão de usuário
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );
}
