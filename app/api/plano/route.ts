import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { gerarTexto, type PlanoIA } from '@/lib/ai';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaPercentual } from '@/lib/irt';

export const maxDuration = 60;

const GUIA_BANCA: Record<string, string> = {
  'CESPE':    'Banca CESPE/CEBRASPE: questões certo/errado, interpretação literal, detalhes de jurisprudência.',
  'CEBRASPE': 'Banca CEBRASPE: questões certo/errado, interpretação literal, detalhes de jurisprudência.',
  'FGV':      'Banca FGV: múltipla escolha elaborada, interpretação de texto, raciocínio aplicado.',
  'FCC':      'Banca FCC: gramática normativa, letra de lei, memorização de conceitos.',
  'VUNESP':   'Banca VUNESP: português gramatical, informática, interpretação e raciocínio.',
  'IDECAN':   'Banca IDECAN: lei seca, conceitos diretos, questões objetivas.',
  'IBFC':     'Banca IBFC: lei seca, conceitos básicos, questões objetivas.',
};

const PROMPT_PLANO = `Você é um especialista em preparação para concursos públicos brasileiros.

Dados do candidato:
- Concurso alvo: {concurso}
- Banca organizadora: {banca}
- Data da prova: {dataProva}
- Dias restantes: {diasRestantes}
- Disponibilidade: ~{questoesPorDia} questões/dia
- Formatos de estudo preferidos: {formatos}
- Desempenho atual por matéria (percentual de acerto):
{desempenho}

{urgencia}{guia_banca}
Gere um plano de estudo semanal em JSON para {num_semanas} semanas:
{
  "diagnostico": "análise em 2-3 frases do perfil, urgência e banca do candidato",
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
  "dica_semana": "dica prática específica para a banca e momento do candidato (máx 2 frases)"
}

Priorize matérias com menor desempenho E maior importância nos concursos.
Adapte sugestões de estudo ao formato preferido do candidato ({formatos}).
{materias_edital}Alterne matérias diferentes a cada dia.
{ultima_semana}Retorne APENAS o JSON, sem markdown.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { editalId, questoesPorDia = 15 } = await req.json();

  const [{ data: profile }, limitResult, { data: habilidades }] = await Promise.all([
    supabase.from('profiles').select('plano, data_prova, concurso_alvo_nome, formatos_preferidos').eq('id', user.id).single(),
    verificarLimite(limitadores.gerarPlano, user.id),
    supabase.from('habilidade_usuario').select('materia, theta').eq('user_id', user.id),
  ]);

  if (!limitResult.permitido) return NextResponse.json({ error: 'Limite de geração de planos atingido.' }, { status: 429 });

  let edital: { orgao: string; cargo: string; materias: string[] | null; banca: string | null; data_prova: string | null } | null = null;
  if (editalId) {
    const { data } = await supabase.from('editais').select('orgao, cargo, materias, banca, data_prova').eq('id', editalId).single();
    edital = data;
  }

  const dataProvaFinal = edital?.data_prova ?? profile?.data_prova ?? null;
  const diasRestantes = dataProvaFinal
    ? Math.max(1, Math.ceil((new Date(dataProvaFinal).getTime() - Date.now()) / 86400000))
    : 90;

  // Urgência — < 30 dias foca em revisão intensiva
  const urgencia = diasRestantes <= 30
    ? `⚠️ URGENTE: apenas ${diasRestantes} dias para a prova. Foque 70% do plano em REVISÃO e simulados. Reduza conteúdo novo ao mínimo.\n\n`
    : diasRestantes <= 60
    ? `Atenção: ${diasRestantes} dias restantes. Equilibre conteúdo novo (60%) com revisões (40%).\n\n`
    : '';

  const numSemanas = diasRestantes <= 30 ? 2 : diasRestantes <= 60 ? 3 : 4;
  const ultimaSemana = numSemanas > 1 ? 'Reserve a última semana para revisão geral.\n' : '';

  const bancaNome = edital?.banca ?? '';
  const guiaBanca = GUIA_BANCA[bancaNome.toUpperCase()] ?? (bancaNome ? `Banca: ${bancaNome}.` : 'Banca não especificada — siga o padrão CESPE por ser o mais comum.');

  const formatos: string[] = Array.isArray(profile?.formatos_preferidos) && profile.formatos_preferidos.length > 0
    ? profile.formatos_preferidos
    : ['leitura', 'exercícios'];

  const desempenhoTexto = habilidades?.map(h =>
    `  - ${h.materia}: ${thetaParaPercentual(h.theta)}%`
  ).join('\n') || '  (sem dados ainda)';

  const materiasEdital: string[] = Array.isArray(edital?.materias) ? edital!.materias : [];
  const materiasEditalTexto = materiasEdital.length > 0
    ? `\nIMPORTANTE — Este plano é específico para o edital. Inclua SOMENTE as matérias abaixo:\n${materiasEdital.map(m => `  · ${m}`).join('\n')}\nPara matérias sem dado de desempenho, assuma 50% de acerto.\n\n`
    : '';

  try {
    const prompt = PROMPT_PLANO
      .replace('{concurso}', edital ? `${edital.orgao} — ${edital.cargo}` : (profile?.concurso_alvo_nome ?? 'Concurso público geral'))
      .replace('{banca}', bancaNome || 'Não especificada')
      .replace('{dataProva}', dataProvaFinal ?? 'Não definida')
      .replace('{diasRestantes}', String(diasRestantes))
      .replace('{questoesPorDia}', String(questoesPorDia))
      .replace(/\{formatos\}/g, formatos.join(', '))
      .replace('{desempenho}', desempenhoTexto)
      .replace('{urgencia}', urgencia)
      .replace('{guia_banca}', guiaBanca + '\n\n')
      .replace('{num_semanas}', String(numSemanas))
      .replace('{materias_edital}', materiasEditalTexto)
      .replace('{ultima_semana}', ultimaSemana);

    const raw = await gerarTexto(prompt, (profile?.plano ?? 'free') as PlanoIA, undefined, 4096);
    let textoResposta = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const match = textoResposta.match(/\{[\s\S]*\}/);
    if (match) textoResposta = match[0];
    const planoGerado = JSON.parse(textoResposta);

    await supabase.from('planos_estudo').update({ ativo: false }).eq('user_id', user.id);
    await supabase.from('planos_estudo').insert({
      user_id: user.id,
      edital_id: editalId ?? null,
      data_prova: dataProvaFinal ?? null,
      dias_restantes: diasRestantes,
      cronograma: planoGerado,
      ativo: true,
    });

    return NextResponse.json({ plano: planoGerado, diasRestantes, banca: bancaNome });
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
