import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { gerarTextoGemini } from '@/lib/gemini';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaNivel } from '@/lib/irt';

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

function extrairJSON(texto: string): string {
  // Remove blocos markdown
  texto = texto.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  // Extrai primeiro objeto JSON encontrado
  const match = texto.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  return texto;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { editalId, materia } = body as { editalId: string; materia: string };

  if (!materia) return NextResponse.json({ error: 'Matéria obrigatória' }, { status: 400 });

  // Rate limit
  const { permitido, restante } = await verificarLimite(limitadores.gerarQuestao, user.id);
  if (!permitido) {
    return NextResponse.json(
      { error: 'Limite de questões atingido. Atualize para Premium para questões ilimitadas.', restante: 0 },
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

  let questoesQuery = adminClient
    .from('questoes')
    .select('*')
    .eq('materia', materia)
    .eq('nivel', nivel)
    .eq('ativo', true);

  if (idsRespondidos.length > 0) {
    questoesQuery = questoesQuery.not('id', 'in', `(${idsRespondidos.join(',')})`);
  }

  const { data: questoesCache } = await questoesQuery.limit(20);

  if (questoesCache && questoesCache.length >= 1) {
    const questao = questoesCache[Math.floor(Math.random() * questoesCache.length)];
    const { explicacao, gabarito, ...questaoSemGabarito } = questao;
    void explicacao; void gabarito;
    return NextResponse.json({ questao: questaoSemGabarito, restante });
  }

  // Buscar dados do edital
  const { data: edital } = editalId
    ? await adminClient.from('editais').select('banca, materias').eq('id', editalId).single()
    : { data: null };

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Serviço de IA não configurado. Contate o suporte.' }, { status: 503 });
  }

  try {
    const prompt = PROMPT_QUESTAO
      .replace(/{banca}/g, edital?.banca ?? 'CESPE/CEBRASPE')
      .replace('{materia}', materia)
      .replace('{topico}', materia)
      .replace(/{nivel}/g, String(nivel));

    const textoResposta = extrairJSON(await gerarTextoGemini(prompt));
    const novaQuestao = JSON.parse(textoResposta);

    // Usa admin client para inserir (sem restrições de RLS)
    const { data: salva, error: errInsert } = await adminClient.from('questoes').insert({
      edital_id: editalId ?? null,
      materia,
      nivel,
      banca: edital?.banca ?? null,
      enunciado: novaQuestao.enunciado,
      opcoes: novaQuestao.opcoes,
      gabarito: novaQuestao.gabarito,
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
