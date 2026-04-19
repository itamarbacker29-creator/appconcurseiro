import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { atualizarTheta } from '@/lib/irt';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { questaoId, editalId, respostaDada, tempoSegundos } = await req.json();

  if (!questaoId || !respostaDada) {
    return NextResponse.json({ error: 'questaoId e respostaDada são obrigatórios' }, { status: 400 });
  }

  // Buscar questão (gabarito e nível)
  const { data: questao } = await supabase
    .from('questoes')
    .select('gabarito, explicacao, nivel, materia')
    .eq('id', questaoId)
    .single();

  if (!questao) return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 });

  const correta = respostaDada.toUpperCase() === questao.gabarito.toUpperCase();

  // Salvar resposta
  await supabase.from('respostas').insert({
    user_id: user.id,
    questao_id: questaoId,
    edital_id: editalId ?? null,
    resposta_dada: respostaDada,
    correta,
    tempo_segundos: tempoSegundos ?? null,
  });

  // Atualizar habilidade IRT
  const { data: hab } = await supabase
    .from('habilidade_usuario')
    .select('theta, total_respondidas, total_acertos')
    .eq('user_id', user.id)
    .eq('materia', questao.materia)
    .single();

  const thetaAtual = hab?.theta ?? 0;
  const a = 1.0; // discriminação padrão
  const b = (questao.nivel - 3) * 0.8; // dificuldade mapeada do nível
  const novoTheta = atualizarTheta(thetaAtual, correta, a, b);

  const { error: errTheta } = await supabase.from('habilidade_usuario').upsert({
    user_id: user.id,
    materia: questao.materia,
    theta: novoTheta,
    total_respondidas: (hab?.total_respondidas ?? 0) + 1,
    total_acertos: (hab?.total_acertos ?? 0) + (correta ? 1 : 0),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'user_id,materia' });
  if (errTheta) console.error('[simulado/responder] Falha ao atualizar theta IRT:', errTheta);

  // Criar flashcard automático se errou pela 2ª vez
  if (!correta) {
    const { data: erros } = await supabase
      .from('respostas')
      .select('id')
      .eq('user_id', user.id)
      .eq('questao_id', questaoId)
      .eq('correta', false);

    if (erros && erros.length >= 2) {
      const { data: q } = await supabase
        .from('questoes')
        .select('enunciado, opcoes, gabarito, explicacao, materia')
        .eq('id', questaoId)
        .single();

      if (q) {
        const jaExiste = await supabase
          .from('flashcards')
          .select('id')
          .eq('user_id', user.id)
          .eq('frente', q.enunciado)
          .single();

        if (!jaExiste.data) {
          await supabase.from('flashcards').insert({
            user_id: user.id,
            frente: q.enunciado,
            verso: `Gabarito: ${q.gabarito}\n\n${q.explicacao ?? ''}`,
            origem: 'simulado',
            materia: q.materia,
          });
        }
      }
    }
  }

  return NextResponse.json({
    correta,
    gabarito: questao.gabarito,
    explicacao: questao.explicacao,
    novoTheta,
  });
}
