import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { ErrosList } from './ErrosList';

export default async function ErrosPage({
  searchParams,
}: {
  searchParams: Promise<{ materia?: string }>;
}) {
  const { materia } = await searchParams;
  if (!materia) redirect('/desempenho');

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: respostas } = await supabase
    .from('respostas')
    .select('resposta_dada, respondida_em, questoes!inner(id, enunciado, opcoes, gabarito, materia, subtopico)')
    .eq('user_id', user.id)
    .eq('correta', false)
    .eq('questoes.materia', materia)
    .order('respondida_em', { ascending: false })
    .limit(50) as unknown as { data: import('./ErrosList').ErroItem[] | null };

  return <ErrosList materia={materia} respostas={respostas ?? []} />;
}
