import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// Offset visual: simula vagas já preenchidas antes do lançamento público
const OFFSET_INICIAL = 47;

export async function GET() {
  const admin = createAdminClient();
  const { count } = await admin
    .from('lista_espera')
    .select('id', { count: 'exact', head: true });
  const real = count ?? 0;
  return NextResponse.json({ count: real + OFFSET_INICIAL, real }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
