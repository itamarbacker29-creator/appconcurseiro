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
  // Elegibilidade
  if ('formacao' in body) update.formacao = body.formacao || null;
  if ('registros_conselho' in body) update.registros_conselho = body.registros_conselho;
  if ('pcd' in body) update.pcd = !!body.pcd;
  if ('elegivel_cota_racial' in body) update.elegivel_cota_racial = !!body.elegivel_cota_racial;
  if ('elegivel_cota_indigena' in body) update.elegivel_cota_indigena = !!body.elegivel_cota_indigena;
  if ('elegivel_cota_quilombola' in body) update.elegivel_cota_quilombola = !!body.elegivel_cota_quilombola;
  if ('elegivel_isencao_taxa' in body) update.elegivel_isencao_taxa = !!body.elegivel_isencao_taxa;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) {
    console.error('[conta] erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Falha ao atualizar perfil. Tente novamente.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
