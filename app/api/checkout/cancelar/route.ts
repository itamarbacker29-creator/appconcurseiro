import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
const DIAS_ARREPENDIMENTO = 7;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('asaas_subscription_id, plano, plano_iniciado_em, plano_expira_em')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    if (profile.plano === 'free') return NextResponse.json({ error: 'Sem assinatura ativa' }, { status: 400 });

    const headers = { 'access_token': apiKey, 'Content-Type': 'application/json' };

    const dentroDoArrependimento = profile.plano_iniciado_em
      ? (Date.now() - new Date(profile.plano_iniciado_em).getTime()) < DIAS_ARREPENDIMENTO * 24 * 60 * 60 * 1000
      : false;

    let reembolsado = false;

    if (dentroDoArrependimento && profile.asaas_subscription_id) {
      const paymentsResp = await fetch(
        `${ASAAS_BASE_URL}/subscriptions/${profile.asaas_subscription_id}/payments?status=CONFIRMED`,
        { headers }
      );
      const paymentsData = await paymentsResp.json();

      for (const payment of paymentsData.data ?? []) {
        const refundResp = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/refund`, {
          method: 'POST',
          headers,
        });
        if (refundResp.ok) {
          reembolsado = true;
          console.log('[checkout/cancelar] reembolso:', payment.id);
        } else {
          console.error('[checkout/cancelar] erro reembolso:', await refundResp.text());
        }
      }
    }

    // Cancela assinatura no Asaas (para futuras cobranças)
    if (profile.asaas_subscription_id) {
      const resp = await fetch(`${ASAAS_BASE_URL}/subscriptions/${profile.asaas_subscription_id}`, {
        method: 'DELETE',
        headers,
      });
      if (!resp.ok && resp.status !== 404) {
        console.error('[checkout/cancelar] Asaas error:', await resp.text());
        return NextResponse.json({ error: 'Erro ao cancelar no Asaas' }, { status: 500 });
      }
    }

    if (dentroDoArrependimento) {
      // Dentro de 7 dias: remove acesso imediatamente (já reembolsado)
      await admin
        .from('profiles')
        .update({ plano: 'free', plano_expira_em: null, asaas_subscription_id: null, plano_iniciado_em: null })
        .eq('id', user.id);
    } else {
      // Após 7 dias: mantém acesso até plano_expira_em, só remove renovação
      await admin
        .from('profiles')
        .update({ asaas_subscription_id: null })
        .eq('id', user.id);
    }

    console.log('[checkout/cancelar] cancelado:', user.id, '| reembolsado:', reembolsado);
    return NextResponse.json({
      success: true,
      reembolsado,
      acesso_ate: dentroDoArrependimento ? null : profile.plano_expira_em,
    });
  } catch (err) {
    console.error('[checkout/cancelar] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
