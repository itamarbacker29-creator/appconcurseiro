import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { nivel, materia } = await req.json();

  if (!['dificil', 'ok', 'tranquilo'].includes(nivel)) {
    return NextResponse.json({ error: 'Nível inválido' }, { status: 400 });
  }

  const hoje = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('checkins').upsert(
    { user_id: user.id, data: hoje, nivel, materia: materia ?? null },
    { onConflict: 'user_id,data' }
  );

  if (error) {
    console.error('[plano/checkin] Erro ao salvar check-in:', error);
    return NextResponse.json({ error: 'Falha ao registrar check-in' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
