import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { gerarTexto } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const materia = req.nextUrl.searchParams.get('materia') ?? '';
  const topico = req.nextUrl.searchParams.get('topico') ?? '';

  if (!materia || !topico) {
    return NextResponse.json({ busca: null });
  }

  // Tenta retornar do cache
  const { data: cached } = await supabase
    .from('busca_sugerida_cache')
    .select('busca')
    .eq('materia', materia)
    .eq('topico', topico)
    .single();

  if (cached?.busca) {
    return NextResponse.json({ busca: cached.busca });
  }

  // Gera com IA e salva no cache
  try {
    const { data: profile } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
    const prompt = `Sugira uma busca no YouTube de até 8 palavras para estudar "${topico}" de ${materia} para concursos públicos. Retorne apenas a string de busca, sem aspas, sem explicação.`;
    const busca = (await gerarTexto(prompt, (profile?.plano ?? 'free') as 'free' | 'premium' | 'elite')).trim();

    await supabase.from('busca_sugerida_cache').upsert({ materia, topico, busca }, { onConflict: 'materia,topico' });

    return NextResponse.json({ busca });
  } catch {
    return NextResponse.json({ busca: `${topico} ${materia} concurso público aula` });
  }
}
