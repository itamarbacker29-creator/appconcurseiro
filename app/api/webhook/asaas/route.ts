import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

const DIAS_EXPIRACAO = 31;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const accessToken = url.searchParams.get('accessToken');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (expectedToken && accessToken !== expectedToken) {
      console.warn('[webhook/asaas] token inválido');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { event, payment, subscription } = body;

    console.log('[webhook/asaas] evento:', event);

    const admin = createAdminClient();

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const externalRef = payment?.externalReference as string | undefined;
      if (!externalRef) {
        console.warn('[webhook/asaas] externalReference ausente');
        return NextResponse.json({ ok: true });
      }

      // Formato: "userId|plano" (ex: "abc-123|premium")
      const [userId, plano] = externalRef.split('|');
      if (!userId || !plano) {
        console.warn('[webhook/asaas] externalReference inválido:', externalRef);
        return NextResponse.json({ ok: true });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DIAS_EXPIRACAO);

      const { data: current } = await admin
        .from('profiles')
        .select('plano_iniciado_em')
        .eq('id', userId)
        .single();

      const update: Record<string, unknown> = {
        plano,
        plano_expira_em: expiresAt.toISOString(),
      };
      // Só registra plano_iniciado_em na primeira ativação (não sobrescreve em renovações)
      if (!current?.plano_iniciado_em) {
        update.plano_iniciado_em = new Date().toISOString();
      }

      const { error } = await admin.from('profiles').update(update).eq('id', userId);
      if (error) console.error('[webhook/asaas] ativar plano:', error);
      else console.log('[webhook/asaas] plano ativado:', userId, plano);
    }

    if (event === 'SUBSCRIPTION_DELETED') {
      const externalRef = subscription?.externalReference as string | undefined;
      if (externalRef) {
        const [userId] = externalRef.split('|');
        if (userId) {
          await admin
            .from('profiles')
            .update({ plano: 'free', plano_expira_em: null, asaas_subscription_id: null })
            .eq('id', userId);
          console.log('[webhook/asaas] plano cancelado:', userId);
        }
      }
    }

    if (event === 'PAYMENT_REFUNDED') {
      const externalRef = payment?.externalReference as string | undefined;
      if (externalRef) {
        const [userId] = externalRef.split('|');
        if (userId) {
          await admin
            .from('profiles')
            .update({ plano: 'free', plano_expira_em: null })
            .eq('id', userId);
          console.log('[webhook/asaas] reembolso processado:', userId);
        }
      }
    }

    if (event === 'PAYMENT_OVERDUE') {
      const externalRef = payment?.externalReference as string | undefined;
      if (externalRef) {
        const [userId] = externalRef.split('|');
        if (userId) {
          await admin
            .from('profiles')
            .update({ plano: 'free', plano_expira_em: null })
            .eq('id', userId);
          console.log('[webhook/asaas] inadimplência:', userId);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/asaas] erro:', err);
    return new NextResponse('error', { status: 500 });
  }
}
