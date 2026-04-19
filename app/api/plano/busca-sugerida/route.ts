import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { gerarTexto } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const materia  = req.nextUrl.searchParams.get('materia') ?? '';
  const topico   = req.nextUrl.searchParams.get('topico') ?? '';
  const formatos = req.nextUrl.searchParams.get('formatos') ?? '';

  if (!materia || !topico) return NextResponse.json({ busca: null });

  // Tenta retornar do cache (ignora formatos no cache — resultado reutilizável)
  const { data: cached } = await supabase
    .from('busca_sugerida_cache')
    .select('busca')
    .eq('materia', materia)
    .eq('topico', topico)
    .maybeSingle();

  if (cached?.busca) return NextResponse.json({ busca: cached.busca });

  // Gera com IA e salva no cache
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plano')
      .eq('id', user.id)
      .single();

    const formatosStr = formatos
      ? `Formato preferido pelo candidato: ${formatos}. Priorize esse formato na sugestão.`
      : '';

    const prompt = `Sugira um recurso de estudo específico para concursos públicos:\n- Matéria: ${materia}\n- Tópico: ${topico}\n${formatosStr}\n\nRetorne APENAS uma frase curta (até 12 palavras) indicando onde e como buscar o conteúdo. Exemplo: "Busque no YouTube 'Ato Administrativo CESPE 2024' — Gran Concursos". Sem explicação extra.`;

    const busca = (await gerarTexto(prompt, (profile?.plano ?? 'free') as 'free' | 'premium' | 'elite')).trim();

    await supabase
      .from('busca_sugerida_cache')
      .upsert({ materia, topico, busca }, { onConflict: 'materia,topico' });

    return NextResponse.json({ busca });
  } catch {
    return NextResponse.json({ busca: `${topico} ${materia} concurso público aula` });
  }
}
