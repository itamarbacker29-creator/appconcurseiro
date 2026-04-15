import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { gerarTexto, type PlanoIA } from '@/lib/ai';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaPercentual } from '@/lib/irt';

const PROMPT_PLANO = `Você é um especialista em preparação para concursos públicos brasileiros.

Dados do candidato:
- Concurso alvo: {concurso}
- Data da prova: {dataProva}
- Dias restantes: {diasRestantes}
- Disponibilidade: ~{questoesPorDia} questões/dia
- Desempenho atual por matéria (percentual de acerto):
{desempenho}

Gere um plano de estudo semanal para as próximas 4 semanas em JSON:
{
  "diagnostico": "análise em 2-3 frases do perfil do candidato",
  "prioridades": ["matéria 1", "matéria 2", "matéria 3"],
  "semanas": [
    {
      "semana": 1,
      "foco": "nome da matéria principal",
      "dias": [
        {
          "dia": "Segunda",
          "materia": "Direito Administrativo",
          "topico": "Ato Administrativo",
          "questoes": 15,
          "tipo": "novo_conteudo"
        }
      ]
    }
  ],
  "dica_semana": "dica motivacional e prática"
}

Priorize matérias com menor desempenho E maior importância nos concursos.
Alterne matérias diferentes a cada dia.
Reserve a última semana para revisão.
Retorne APENAS o JSON, sem markdown.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Verificar plano (apenas premium+)
  const { data: profile } = await supabase.from('profiles').select('plano, data_prova').eq('id', user.id).single();
  if (profile?.plano === 'free') {
    return NextResponse.json({ error: 'Plano de estudo disponível apenas para assinantes Premium.' }, { status: 403 });
  }

  const { permitido } = await verificarLimite(limitadores.gerarPlano, user.id);
  if (!permitido) return NextResponse.json({ error: 'Limite de geração de planos atingido.' }, { status: 429 });

  const { editalId, questoesPorDia = 15 } = await req.json();

  const { data: habilidades } = await supabase.from('habilidade_usuario').select('materia, theta').eq('user_id', user.id);

  let edital = null;
  if (editalId) {
    const { data } = await supabase.from('editais').select('orgao, cargo, materias, banca').eq('id', editalId).single();
    edital = data;
  }

  const diasRestantes = profile?.data_prova
    ? Math.max(1, Math.ceil((new Date(profile.data_prova).getTime() - Date.now()) / 86400000))
    : 90;

  const desempenhoTexto = habilidades?.map(h =>
    `  - ${h.materia}: ${thetaParaPercentual(h.theta)}%`
  ).join('\n') ?? '  (sem dados ainda)';

  try {
    const prompt = PROMPT_PLANO
      .replace('{concurso}', edital ? `${edital.orgao} — ${edital.cargo}` : 'Concurso público geral')
      .replace('{dataProva}', profile?.data_prova ?? 'Não definida')
      .replace('{diasRestantes}', String(diasRestantes))
      .replace('{questoesPorDia}', String(questoesPorDia))
      .replace('{desempenho}', desempenhoTexto);

    const raw = await gerarTexto(prompt, (profile?.plano ?? 'free') as PlanoIA);
    const textoResposta = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const planoGerado = JSON.parse(textoResposta);

    // Salvar plano no banco
    await supabase.from('planos_estudo').update({ ativo: false }).eq('user_id', user.id);
    await supabase.from('planos_estudo').insert({
      user_id: user.id,
      edital_id: editalId ?? null,
      data_prova: profile?.data_prova ?? null,
      dias_restantes: diasRestantes,
      cronograma: planoGerado,
      ativo: true,
    });

    return NextResponse.json({ plano: planoGerado });
  } catch (err) {
    console.error('Erro ao gerar plano:', err);
    return NextResponse.json({ error: 'Falha ao gerar plano' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: plano } = await supabase
    .from('planos_estudo')
    .select('*')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .single();

  return NextResponse.json({ plano });
}
