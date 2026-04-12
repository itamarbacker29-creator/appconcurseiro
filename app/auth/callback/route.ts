import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Em produção no Vercel, usa o host real (não o interno)
      const forwardedHost = req.headers.get('x-forwarded-host');
      const redirectBase = forwardedHost
        ? `https://${forwardedHost}`
        : origin;
      return NextResponse.redirect(`${redirectBase}${next}`);
    }

    console.error('[auth/callback] erro:', error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
