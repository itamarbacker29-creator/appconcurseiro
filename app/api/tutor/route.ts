import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { streamHaiku } from '@/lib/ai';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import { IDENTIDADE } from '@/config/identidade';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_TUTOR = `Você é o Tutor do ${IDENTIDADE.nomeApp} — especialista em concursos públicos brasileiros.
Tom: técnico, preciso, didático. Direto ao ponto — o candidato tem tempo limitado.

Regras:
- Explique com base em lei, doutrina ou jurisprudência quando aplicável
- Use exemplos práticos do cotidiano do servidor público
- Se a dúvida for sobre uma questão, analise o enunciado e cada alternativa
- Nunca invente informações jurídicas — se não souber, diga explicitamente
- Respostas em português brasileiro, sem gírias ou informalidade
- Quando citar lei, inclua o número e artigo (ex: "art. 37 da CF/88")`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Verificar plano — tutor só para premium/elite
  const { data: profile } = await supabase
    .from('profiles')
    .select('plano')
    .eq('id', user.id)
    .single();

  const plano = profile?.plano ?? 'free';

  // Rate limit por plano
  if (plano === 'free') {
    const { permitido } = await verificarLimite(limitadores.tutorFree, user.id);
    if (!permitido) {
      return NextResponse.json(
        { error: 'Você atingiu o limite de 1 pergunta por dia no plano gratuito. Faça upgrade para Premium para 30 perguntas/mês.' },
        { status: 429 }
      );
    }
  } else if (plano === 'premium') {
    const { permitido } = await verificarLimite(limitadores.tutorPremium, user.id);
    if (!permitido) {
      return NextResponse.json(
        { error: 'Limite de 30 mensagens/mês atingido. Faça upgrade para Elite para acesso ilimitado.' },
        { status: 429 }
      );
    }
  }
  // elite: sem limite

  const { mensagens } = await req.json() as {
    mensagens: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!mensagens?.length) {
    return NextResponse.json({ error: 'Mensagens obrigatórias' }, { status: 400 });
  }

  const stream = streamHaiku(mensagens, SYSTEM_TUTOR);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  });
}
