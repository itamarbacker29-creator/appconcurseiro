import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { gerarTexto, type PlanoIA } from '@/lib/ai';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaNivel } from '@/lib/irt';

export const maxDuration = 60;

const PROMPT_QUESTAO = `Você é um especialista em concursos públicos brasileiros, treinado nas provas da banca {banca}.
Gere UMA questão de múltipla escolha sobre o tópico "{topico}" da matéria "{materia}".
Nível de dificuldade: {nivel}/5 (1=muito fácil, 5=muito difícil).
Siga rigorosamente o padrão de redação da banca {banca}.

Responda APENAS em JSON válido, sem markdown, sem texto antes ou depois:
{
  "enunciado": "texto completo da questão",
  "opcoes": [
    {"letra": "A", "texto": "texto da alternativa"},
    {"letra": "B", "texto": "texto da alternativa"},
    {"letra": "C", "texto": "texto da alternativa"},
    {"letra": "D", "texto": "texto da alternativa"},
    {"letra": "E", "texto": "texto da alternativa"}
  ],
  "gabarito": "B",
  "explicacao": "explicação detalhada de por que a alternativa correta está correta e por que as demais são incorretas"
}`;

/** Embaralha as opcoes e reescreve as letras A-E, atualizando o gabarito. */
function embaralharOpcoes(opcoes: { letra: string; texto: string }[], gabarito: string) {
  const textoCorreto = opcoes.find(o => o.letra.toUpperCase() === gabarito.toUpperCase())?.texto;
  if (!textoCorreto) return { opcoes, gabarito };

  const textos = opcoes.map(o => o.texto);
  // Fisher-Yates
  for (let i = textos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [textos[i], textos[j]] = [textos[j], textos[i]];
  }

  const letras = ['A', 'B', 'C', 'D', 'E'];
  const novasOpcoes = textos.map((texto, i) => ({ letra: letras[i], texto }));
  const novoGabarito = novasOpcoes.find(o => o.texto === textoCorreto)!.letra;
  return { opcoes: novasOpcoes, gabarito: novoGabarito };
}

function extrairJSON(texto: string): string {
  texto = texto.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  const match = texto.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  throw new Error('Resposta da IA não contém JSON válido');
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Buscar plano do usuário
  const { data: profile } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
  const plano = (profile?.plano ?? 'free') as PlanoIA;

  const body = await req.json();
  const { editalId, materia } = body as { editalId: string; materia: string };

  if (!materia) return NextResponse.json({ error: 'Matéria obrigatória' }, { status: 400 });

  // Rate limit por plano
  if (plano === 'free') {
    const { permitido } = await verificarLimite(limitadores.simuladoFree, user.id);
    if (!permitido) {
      return NextResponse.json(
        { error: 'Você atingiu o limite de 5 simulados por mês no plano gratuito. Faça upgrade para Premium para simulados ilimitados.', restante: 0 },
        { status: 429 }
      );
    }
  }
  // Anti-abuse geral para todos os planos
  const { permitido: permitidoGeral } = await verificarLimite(limitadores.gerarQuestao, user.id);
  if (!permitidoGeral) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde alguns minutos.', restante: 0 },
      { status: 429 }
    );
  }

  // Habilidade atual do usuário
  const { data: hab } = await supabase
    .from('habilidade_usuario')
    .select('theta')
    .eq('user_id', user.id)
    .eq('materia', materia)
    .single();

  const theta = hab?.theta ?? 0;
  const nivel = thetaParaNivel(theta);

  // Verificar cache no banco antes de gerar
  const { data: respondidas } = await supabase
    .from('respostas')
    .select('questao_id')
    .eq('user_id', user.id);

  const idsRespondidos = (respondidas ?? []).map(r => r.questao_id).filter(Boolean);

  const adminClient = createAdminClient();

  const baseQuery = () => {
    let q = supabase
      .from('questoes')
      .select('*')
      .eq('materia', materia)
      .eq('nivel', nivel)
      .eq('ativo', true);
    if (idsRespondidos.length > 0) {
      q = q.not('id', 'in', `(${idsRespondidos.join(',')})`);
    }
    return q;
  };

  // Prioritize real questions over AI-generated ones
  const { data: questoesReais } = await baseQuery().eq('origem', 'real').limit(20);

  if (questoesReais && questoesReais.length >= 1) {
    const questao = questoesReais[Math.floor(Math.random() * questoesReais.length)];
    const { explicacao, gabarito, ...questaoSemGabarito } = questao;
    void explicacao; void gabarito;
    return NextResponse.json({ questao: questaoSemGabarito, restante });
  }

  const { data: questoesCache } = await baseQuery().limit(20);

  if (questoesCache && questoesCache.length >= 1) {
    const questao = questoesCache[Math.floor(Math.random() * questoesCache.length)];
    const { explicacao, gabarito, ...questaoSemGabarito } = questao;
    void explicacao; void gabarito;
    return NextResponse.json({ questao: questaoSemGabarito, restante });
  }

  // Buscar dados do edital
  const { data: edital } = editalId
    ? await supabase.from('editais').select('banca, materias').eq('id', editalId).single()
    : { data: null };

  try {
    const prompt = PROMPT_QUESTAO
      .replace(/{banca}/g, edital?.banca ?? 'CESPE/CEBRASPE')
      .replace('{materia}', materia)
      .replace('{topico}', materia)
      .replace(/{nivel}/g, String(nivel));

    const textoResposta = extrairJSON(await gerarTexto(prompt, plano));
    const novaQuestao = JSON.parse(textoResposta);

    // Embaralha opções para evitar viés da IA (que tende a colocar gabarito em B)
    const { opcoes: opcosEmbaralhadas, gabarito: gabaritoFinal } =
      embaralharOpcoes(novaQuestao.opcoes ?? [], novaQuestao.gabarito ?? 'A');

    // Usa admin client para inserir (sem restrições de RLS)
    const { data: salva, error: errInsert } = await adminClient.from('questoes').insert({
      edital_id: editalId ?? null,
      materia,
      nivel,
      banca: edital?.banca ?? null,
      enunciado: novaQuestao.enunciado,
      opcoes: opcosEmbaralhadas,
      gabarito: gabaritoFinal,
      explicacao: novaQuestao.explicacao ?? null,
      origem: 'ia',
    }).select().single();

    if (errInsert || !salva) {
      console.error('[simulado/gerar] Erro ao salvar questão:', errInsert);
      throw new Error(errInsert?.message ?? 'Erro ao salvar questão');
    }

    const { explicacao, gabarito, ...questaoSemGabarito } = salva;
    void explicacao; void gabarito;
    return NextResponse.json({ questao: questaoSemGabarito, restante });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[simulado/gerar] Erro:', msg);

    // Quota / rate limit — mensagem amigável
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('indisponível')) {
      return NextResponse.json(
        { error: 'O serviço de IA está sobrecarregado agora. Aguarde alguns minutos e tente novamente.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Falha ao gerar questão. Tente novamente.' }, { status: 500 });
  }
}
