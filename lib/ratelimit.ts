import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const limitadores = {
  gerarQuestao: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:questao',
  }),
  gerarPlano: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '24 h'),
    prefix: 'rl:plano',
  }),
  buscarEditais: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:editais',
  }),
  tutorMensagem: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(150, '30 d'),
    prefix: 'rl:tutor',
  }),
  uploadPdf: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '30 d'),
    prefix: 'rl:pdf',
  }),
  global: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:global',
  }),
};

export async function verificarLimite(
  limitador: Ratelimit,
  userId: string
): Promise<{ permitido: boolean; restante: number }> {
  const { success, remaining } = await limitador.limit(userId);
  return { permitido: success, restante: remaining };
}
