import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if ('concurso_alvo_nome' in body) update.concurso_alvo_nome = body.concurso_alvo_nome || null;
  if ('data_prova' in body) update.data_prova = body.data_prova || null;
  if ('estilos_aprendizado' in body) update.estilos_aprendizado = body.estilos_aprendizado;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
