import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { gerarTexto, type PlanoIA } from '@/lib/ai';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaPercentual } from '@/lib/irt';

export const maxDuration = 60;

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
{materias_edital}Alterne matérias diferentes a cada dia.
Reserve a última semana para revisão.
Retorne APENAS o JSON, sem markdown.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { editalId, questoesPorDia = 15 } = await req.json();

  const [{ data: profile }, limitResult, { data: habilidades }] = await Promise.all([
    supabase.from('profiles').select('plano, data_prova, concurso_alvo_nome').eq('id', user.id).single(),
    verificarLimite(limitadores.gerarPlano, user.id),
    supabase.from('habilidade_usuario').select('materia, theta').eq('user_id', user.id),
  ]);

  if (!limitResult.permitido) return NextResponse.json({ error: 'Limite de geração de planos atingido.' }, { status: 429 });

  let edital = null;
  if (editalId) {
    const { data } = await supabase.from('editais').select('orgao, cargo, materias, banca, data_prova').eq('id', editalId).single();
    edital = data;
  }

  const dataProvaFinal = edital?.data_prova ?? profile?.data_prova ?? null;
  const diasRestantes = dataProvaFinal
    ? Math.max(1, Math.ceil((new Date(dataProvaFinal).getTime() - Date.now()) / 86400000))
    : 90;

  const desempenhoTexto = habilidades?.map(h =>
    `  - ${h.materia}: ${thetaParaPercentual(h.theta)}%`
  ).join('\n') ?? '  (sem dados ainda)';

  // Matérias do edital — quando disponíveis, o plano foca exclusivamente nelas
  const materiasEdital: string[] = Array.isArray(edital?.materias) ? edital.materias : [];
  const materiasEditalTexto = materiasEdital.length > 0
    ? `\nIMPORTANTE — Este plano é específico para o edital. Inclua SOMENTE as matérias abaixo no cronograma:\n${materiasEdital.map(m => `  · ${m}`).join('\n')}\nPara matérias sem dado de desempenho do candidato, assuma 50% de acerto.\n\n`
    : '';

  try {
    const prompt = PROMPT_PLANO
      .replace('{concurso}', edital ? `${edital.orgao} — ${edital.cargo}` : (profile?.concurso_alvo_nome ?? 'Concurso público geral'))
      .replace('{dataProva}', dataProvaFinal ?? 'Não definida')
      .replace('{diasRestantes}', String(diasRestantes))
      .replace('{questoesPorDia}', String(questoesPorDia))
      .replace('{desempenho}', desempenhoTexto)
      .replace('{materias_edital}', materiasEditalTexto);

    const raw = await gerarTexto(prompt, (profile?.plano ?? 'free') as PlanoIA, undefined, 4096);
    // Remove markdown fences e extrai o primeiro objeto JSON encontrado
    let textoResposta = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const match = textoResposta.match(/\{[\s\S]*\}/);
    if (match) textoResposta = match[0];
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro ao gerar plano:', msg);
    return NextResponse.json({ error: msg || 'Falha ao gerar plano' }, { status: 500 });
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
