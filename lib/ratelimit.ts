import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis pode não estar configurado em alguns ambientes — inicializa com segurança
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  console.warn('[ratelimit] Redis não configurado — limites desativados');
}

function criarLimitador(limiter: Ratelimit['limiter'], prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter, prefix });
}

export const limitadores = {
  gerarQuestao: criarLimitador(Ratelimit.slidingWindow(10, '1 h'), 'rl:questao'),
  gerarPlano:   criarLimitador(Ratelimit.slidingWindow(5, '24 h'),  'rl:plano'),
  buscarEditais: criarLimitador(Ratelimit.slidingWindow(30, '1 m'), 'rl:editais'),
  tutorMensagem: criarLimitador(Ratelimit.slidingWindow(150, '30 d'), 'rl:tutor'),
  uploadPdf:    criarLimitador(Ratelimit.slidingWindow(10, '30 d'), 'rl:pdf'),
  global:       criarLimitador(Ratelimit.slidingWindow(60, '1 m'),  'rl:global'),
};

export async function verificarLimite(
  limitador: Ratelimit | null,
  userId: string
): Promise<{ permitido: boolean; restante: number }> {
  if (!limitador) return { permitido: true, restante: 999 }; // sem Redis = sem limite
  try {
    const { success, remaining } = await limitador.limit(userId);
    return { permitido: success, restante: remaining };
  } catch (e) {
    console.error('[ratelimit] Erro ao verificar limite:', e);
    return { permitido: false, restante: 0 };
  }
}
