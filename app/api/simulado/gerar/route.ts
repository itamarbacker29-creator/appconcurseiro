import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { geminiFlash } from '@/lib/gemini';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { thetaParaNivel } from '@/lib/irt';

const PROMPT_QUESTAO = `Você é um especialista em concursos públicos brasileiros, treinado nas provas da banca {banca}.
Gere UMA questão de múltipla escolha sobre o tópico "{topico}" da matéria "{materia}".
Nível de dificuldade: {nivel}/5 (1=muito fácil, 5=muito difícil).
Siga rigorosamente o padrão de redação da banca {banca}.

Responda APENAS em JSON válido, sem markdown:
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
  "explicacao": "explicação detalhada de por que a alternativa correta está correta e por que as demais são incorretas",
  "referencia": "Art. XX da Lei XXXX/XX (se aplicável, caso contrário null)"
}`;

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
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

  const { data: questoesCache } = await supabase
    .from('questoes')
    .select('*')
    .eq('materia', materia)
    .eq('nivel', nivel)
    .eq('ativo', true)
    .not('id', 'in', idsRespondidos.length > 0 ? `(${idsRespondidos.join(',')})` : '(null)')
    .limit(20);

  if (questoesCache && questoesCache.length > 3) {
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

    const resultado = await geminiFlash.generateContent(prompt);
    let textoResposta = resultado.response.text().trim();
    if (textoResposta.startsWith('```')) {
      textoResposta = textoResposta.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const novaQuestao = JSON.parse(textoResposta);

    const { data: salva } = await supabase.from('questoes').insert({
      edital_id: editalId ?? null,
      materia,
      nivel,
      banca: edital?.banca ?? null,
      enunciado: novaQuestao.enunciado,
      opcoes: novaQuestao.opcoes,
      gabarito: novaQuestao.gabarito,
      explicacao: novaQuestao.explicacao,
      origem: 'ia',
    }).select().single();

    if (!salva) throw new Error('Erro ao salvar questão');

    const { explicacao, gabarito, ...questaoSemGabarito } = salva;
    void explicacao; void gabarito;
    return NextResponse.json({ questao: questaoSemGabarito, restante });
  } catch (err) {
    console.error('Erro ao gerar questão:', err);
    return NextResponse.json({ error: 'Falha ao gerar questão' }, { status: 500 });
  }
}
