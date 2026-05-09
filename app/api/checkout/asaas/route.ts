import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { PLANOS } from '@/lib/pricing';

const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

export async function POST(req: NextRequest) {
  try {
    const { plano, cpf } = await req.json();

    if (!plano || !['premium', 'elite'].includes(plano)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }
    const cpfDigitos = (cpf ?? '').replace(/\D/g, '');
    if (cpfDigitos.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Pagamento indisponível' }, { status: 503 });

    // Usa o cliente SSR com a sessão do usuário logado (sem precisar de service role)
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nome, asaas_customer_id, plano')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[checkout/asaas] perfil:', profileError);
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    const headers = { 'access_token': apiKey, 'Content-Type': 'application/json' };

    // Cria ou reutiliza cliente no Asaas
    let customerId: string = profile.asaas_customer_id ?? '';

    if (!customerId) {
      const searchResp = await fetch(`${ASAAS_BASE_URL}/customers?externalReference=${user.id}`, { headers });
      const searchData = await searchResp.json();

      if (searchData.data?.length > 0) {
        customerId = searchData.data[0].id;
      } else {
        const createResp = await fetch(`${ASAAS_BASE_URL}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: profile.nome || user.email!.split('@')[0],
            email: user.email,
            cpfCnpj: cpfDigitos,
            externalReference: user.id,
          }),
        });
        const customer = await createResp.json();
        if (!customer.id) {
          console.error('[checkout/asaas] criar cliente:', customer);
          return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
        }
        customerId = customer.id;
      }
      await supabase.from('profiles').update({ asaas_customer_id: customerId }).eq('id', user.id);
    } else {
      await fetch(`${ASAAS_BASE_URL}/customers/${customerId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cpfCnpj: cpfDigitos }),
      });
    }

    const valor = PLANOS[plano as 'premium' | 'elite'].preco_mensal;
    const today = new Date().toISOString().split('T')[0];

    const subResp = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: valor,
        nextDueDate: today,
        cycle: 'MONTHLY',
        description: `O Tutor ${PLANOS[plano as 'premium' | 'elite'].nome} — Plano Mensal`,
        externalReference: `${user.id}|${plano}`,
      }),
    });
    const subscription = await subResp.json();

    if (!subscription.id) {
      console.error('[checkout/asaas] criar assinatura:', subscription);
      return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
    }

    await supabase.from('profiles').update({ asaas_subscription_id: subscription.id }).eq('id', user.id);

    const paymentsResp = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscription.id}/payments`, { headers });
    const paymentsData = await paymentsResp.json();
    const checkoutUrl = paymentsData.data?.[0]?.invoiceUrl;

    if (!checkoutUrl) {
      console.error('[checkout/asaas] sem invoiceUrl:', paymentsData);
      return NextResponse.json({ error: 'Erro ao obter link de pagamento' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error('[checkout/asaas] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
