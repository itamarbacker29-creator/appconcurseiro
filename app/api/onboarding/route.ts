import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { escolaridade, formacao, areas_interesse, estados_interesse, data_prova, concurso_alvo_nome } = body;

  const { error } = await supabase
    .from('profiles')
    .update({
      escolaridade,
      formacao: formacao || null,
      areas_interesse,
      estados_interesse,
      data_prova: data_prova || null,
      concurso_alvo_nome: concurso_alvo_nome || null,
      onboarding_completo: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[onboarding] erro:', error);
    return NextResponse.json({ error: 'Falha ao salvar perfil. Tente novamente.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
