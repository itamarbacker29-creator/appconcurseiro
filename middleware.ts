import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ROTAS_PROTEGIDAS = ['/dashboard', '/simulado', '/editais', '/desempenho', '/plano', '/conta', '/tutor', '/flashcards', '/onboarding'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Rate limiting via Upstash (apenas quando a env var existir)
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
        // Primeiro request neste minuto — definir TTL
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

  if (protegida) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const token = req.cookies.get('sb-access-token')?.value
      ?? req.cookies.get(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Security headers
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
