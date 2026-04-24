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
  premium_anual:  `${IDENTIDADE.stripePrefix}premium_anual`,
  elite_mensal:   `${IDENTIDADE.stripePrefix}elite_mensal`,
  elite_anual:    `${IDENTIDADE.stripePrefix}elite_anual`,
  avulso:         `${IDENTIDADE.stripePrefix}avulso`,
} as const;

// Price IDs do Stripe — preencher após criar os produtos no Dashboard
// STRIPE_PREMIUM_MENSAL_PRICE_ID, STRIPE_PREMIUM_ANUAL_PRICE_ID
// STRIPE_ELITE_MENSAL_PRICE_ID,   STRIPE_ELITE_ANUAL_PRICE_ID
export function getStripePriceId(
  plano: 'premium' | 'elite',
  periodo: 'mensal' | 'anual'
): string {
  const envKey = `STRIPE_${plano.toUpperCase()}_${periodo.toUpperCase()}_PRICE_ID`;
  const id = process.env[envKey];
  if (!id) throw new Error(`${envKey} não configurada`);
  return id;
}
