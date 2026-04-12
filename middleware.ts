import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROTAS_PROTEGIDAS = ['/dashboard', '/simulado', '/editais', '/desempenho', '/plano', '/conta', '/tutor', '/flashcards', '/onboarding'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Supabase auth — renova sessão automaticamente via cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Rate limiting via Upstash
  const rateLimitUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (rateLimitUrl) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown';
    const key = `rl:global:${ip}`;
    const limitResp = await fetch(`${rateLimitUrl}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    }).catch(() => null);

    if (limitResp?.ok) {
      const { result } = await limitResp.json();
      if (result === 1) {
        await fetch(`${rateLimitUrl}/expire/${key}/60`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        }).catch(() => null);
      }
      if (result > 120) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    }
  }

  // Auth guard
  const pathname = req.nextUrl.pathname;
  const protegida = ROTAS_PROTEGIDAS.some(r => pathname.startsWith(r));

  if (protegida && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Security headers
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|auth).*)'],
};
