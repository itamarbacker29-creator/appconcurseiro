import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { anthropic, MODELO_PRINCIPAL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: edital }, { data: habilidades }] = await Promise.all([
    supabase.from('editais').select('orgao,cargo,banca,materias').eq('id', id).single(),
    supabase.from('habilidade_usuario')
      .select('materia,theta,total_respondidas')
      .eq('user_id', user.id)
      .order('theta', { ascending: true })
      .limit(10),
  ]);

  if (!edital) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const materias: string[] = edital.materias ?? [];
  if (materias.length === 0) {
    return NextResponse.json({ recomendacao: null });
  }

  let habContext = 'Candidato sem histórico de simulados ainda.';
  if (habilidades && habilidades.length > 0) {
    const linhas = habilidades.map(h => {
      const pct = Math.round(((h.theta + 3) / 6) * 100);
      return `${h.materia}: ${pct}% (${h.total_respondidas} questões respondidas)`;
    });
    habContext = linhas.join('\n');
  }

  const prompt = `Você é um coach de concursos públicos brasileiro. Analise o perfil abaixo e dê uma recomendação específica e motivadora em exatamente 2 frases.

Edital: ${edital.orgao} — ${edital.cargo}${edital.banca ? ` (Banca: ${edital.banca})` : ''}
Matérias cobradas: ${materias.join(', ')}

Desempenho atual do candidato (do mais fraco ao mais forte):
${habContext}

Recomendação (2 frases: 1ª indica a matéria prioritária e o motivo; 2ª dá uma ação concreta para esta semana):`;

  try {
    const response = await anthropic.messages.create({
      model: MODELO_PRINCIPAL,
      max_tokens: 180,
      messages: [{ role: 'user', content: prompt }],
    });
    const recomendacao = (response.content[0] as { text: string }).text.trim();
    return NextResponse.json({ recomendacao });
  } catch {
    return NextResponse.json({ recomendacao: null });
  }
}
