import { LIMITES, type PlanoId, type RecursoLimitado } from './pricing';

// Lazy Redis — não falha no build se env vars ausentes
let _redis: import('@upstash/redis').Redis | null = null;
async function getRedis() {
  if (_redis) return _redis;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      _redis = Redis.fromEnv();
    }
  } catch {
    // sem Redis — limites desativados
  }
  return _redis;
}

function periodoAtual(recurso: RecursoLimitado): string {
  const hoje = new Date();
  if (recurso === 'tutor_msgs_dia') {
    return hoje.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return hoje.toISOString().slice(0, 7); // YYYY-MM
}

export async function verificarLimitePlano(
  userId: string,
  plano: PlanoId,
  recurso: RecursoLimitado
): Promise<{ permitido: boolean; restante: number; limite: number }> {
  const limite = LIMITES[plano][recurso] as number;

  if (limite === Infinity) {
    return { permitido: true, restante: Infinity, limite: Infinity };
  }

  const redis = await getRedis();
  if (!redis) {
    // sem Redis = sem rastreio = permitir (fail open)
    return { permitido: true, restante: limite, limite };
  }

  const chave = `uso:${recurso}:${userId}:${periodoAtual(recurso)}`;
  const usoAtual = parseInt((await redis.get<string>(chave)) ?? '0');

  return {
    permitido: usoAtual < limite,
    restante: Math.max(limite - usoAtual, 0),
    limite,
  };
}

export async function incrementarUso(
  userId: string,
  recurso: RecursoLimitado
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  const chave = `uso:${recurso}:${userId}:${periodoAtual(recurso)}`;
  // TTL de 35 dias para limpeza automática
  await redis.incr(chave);
  await redis.expire(chave, 60 * 60 * 24 * 35);
}
