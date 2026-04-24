import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { enviarPush } from '@/lib/push';

// Endpoint chamado pelo GitHub Actions todo dia às 8h (horário de Brasília)
// Protegido por CRON_SECRET para evitar chamadas não autorizadas
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Buscar todos os usuários com push_subscription ativa
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nome, push_subscription, plano')
    .not('push_subscription', 'is', null);

  if (error || !profiles?.length) {
    return NextResponse.json({ enviados: 0, erro: error?.message });
  }

  const hoje = new Date().toISOString().split('T')[0];
  let enviados = 0;
  let falhas = 0;

  for (const profile of profiles) {
    const sub = profile.push_subscription;
    if (!sub?.endpoint) continue;

    // Checar se tem flashcards para revisar hoje
    const { count: flashcardsPendentes } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .lte('proxima_revisao', hoje);

    // Checar novos editais para o perfil (últimas 24h)
    const ontemISO = new Date(Date.now() - 86400000).toISOString();
    const { count: novosEditais } = await supabase
      .from('editais_salvos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('criado_em', ontemISO);

    // Montar mensagem personalizada
    const partes: string[] = [];
    if ((flashcardsPendentes ?? 0) > 0) {
      partes.push(`${flashcardsPendentes} flashcard${flashcardsPendentes === 1 ? '' : 's'} para revisar`);
    }
    if ((novosEditais ?? 0) > 0) {
      partes.push(`${novosEditais} novo${novosEditais === 1 ? '' : 's'} edital${novosEditais === 1 ? '' : 'is'}`);
    }

    const corpo = partes.length > 0
      ? `Hoje você tem: ${partes.join(' e ')}. Não perca o ritmo!`
      : 'Mantenha o ritmo! Faça pelo menos um simulado hoje.';

    const nome = profile.nome ? profile.nome.split(' ')[0] : 'Concurseiro';

    try {
      await enviarPush(sub, {
        titulo: `Bom dia, ${nome}! ☀️`,
        corpo,
        url: flashcardsPendentes ? '/flashcards' : '/simulado',
        icone: '/icons/icon-192.png',
      });
      enviados++;
    } catch {
      falhas++;
      // Remover subscription inválida
      if (falhas > 0) {
        await supabase
          .from('profiles')
          .update({ push_subscription: null })
          .eq('id', profile.id);
      }
    }
  }

  return NextResponse.json({ enviados, falhas, total: profiles.length });
}
