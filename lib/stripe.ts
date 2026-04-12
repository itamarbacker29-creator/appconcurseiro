import Stripe from 'stripe';
import { IDENTIDADE } from '@/config/identidade';

// Lazy — só instancia quando chamado (evita erro de build sem STRIPE_SECRET_KEY)
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

// Mantém compatibilidade com imports existentes (uso em runtime, não em build)
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const STRIPE_SKUS = {
  premium_mensal: `${IDENTIDADE.stripePrefix}premium_mensal`,
  elite_mensal:   `${IDENTIDADE.stripePrefix}elite_mensal`,
  avulso:         `${IDENTIDADE.stripePrefix}avulso`,
} as const;
