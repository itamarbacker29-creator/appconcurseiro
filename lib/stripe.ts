import Stripe from 'stripe';
import { IDENTIDADE } from '@/config/identidade';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export const STRIPE_SKUS = {
  premium_mensal: `${IDENTIDADE.stripePrefix}premium_mensal`,
  elite_mensal:   `${IDENTIDADE.stripePrefix}elite_mensal`,
  avulso:         `${IDENTIDADE.stripePrefix}avulso`,
} as const;
