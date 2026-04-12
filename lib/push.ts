import webpush from 'web-push';
import { IDENTIDADE } from '@/config/identidade';

webpush.setVapidDetails(
  `mailto:${IDENTIDADE.emailContato}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function enviarPush(
  subscription: webpush.PushSubscription,
  payload: { titulo: string; corpo: string; url?: string; icone?: string }
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.titulo,
        body: payload.corpo,
        icon: payload.icone ?? '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: { url: payload.url ?? '/editais' },
        actions: [
          { action: 'abrir', title: 'Ver agora' },
          { action: 'fechar', title: 'Fechar' },
        ],
      })
    );
  } catch (err) {
    console.error('Erro ao enviar push:', err);
  }
}
