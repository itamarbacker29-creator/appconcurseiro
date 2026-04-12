import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook inválido:', err);
    return new NextResponse('Webhook Error', { status: 400 });
  }

  const supabase = await createServerClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single();

      if (profile) {
        const plano = session.mode === 'subscription' ? 'premium' : 'avulso';
        await supabase.from('profiles').update({ plano }).eq('id', profile.id);

        if (plano === 'avulso' && session.metadata?.edital_id) {
          await supabase.from('acessos_avulso').insert({
            user_id: profile.id,
            edital_id: session.metadata.edital_id,
            stripe_payment_intent: session.payment_intent as string,
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await supabase.from('profiles').update({ plano: 'free' }).eq('stripe_customer_id', customerId);
      break;
    }

    case 'invoice.payment_failed': {
      // Em produção: enviar e-mail de notificação
      console.log('Pagamento falhou:', event.data.object);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
