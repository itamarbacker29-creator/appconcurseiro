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
  // Simulados: free = 5 sessões/mês
  simuladoFree:  criarLimitador(Ratelimit.slidingWindow(5,   '30 d'), 'rl:simulado:free'),
  gerarQuestao:  criarLimitador(Ratelimit.slidingWindow(200, '1 h'),  'rl:questao'),

  // Tutor IA: free = 1/dia, premium = 30/mês, elite = ilimitado
  tutorFree:     criarLimitador(Ratelimit.slidingWindow(1,   '24 h'), 'rl:tutor:free'),
  tutorPremium:  criarLimitador(Ratelimit.slidingWindow(30,  '30 d'), 'rl:tutor:premium'),
  tutorMensagem: criarLimitador(Ratelimit.slidingWindow(30,  '30 d'), 'rl:tutor'),

  // Upload PDF: free = 1/mês, premium = 5/mês
  uploadFree:    criarLimitador(Ratelimit.slidingWindow(1,   '30 d'), 'rl:pdf:free'),
  uploadPremium: criarLimitador(Ratelimit.slidingWindow(5,   '30 d'), 'rl:pdf:premium'),
  uploadPdf:     criarLimitador(Ratelimit.slidingWindow(5,   '30 d'), 'rl:pdf'),

  // Raio-X: free = 1/mês
  raioxFree:     criarLimitador(Ratelimit.slidingWindow(1,   '30 d'), 'rl:raiox:free'),

  // Auth: máx 10 tentativas de login por minuto por IP
  loginIp:       criarLimitador(Ratelimit.slidingWindow(10,  '1 m'),  'rl:login:ip'),

  gerarPlano:    criarLimitador(Ratelimit.slidingWindow(5,   '24 h'), 'rl:plano'),
  buscarEditais: criarLimitador(Ratelimit.slidingWindow(30,  '1 m'),  'rl:editais'),
  global:        criarLimitador(Ratelimit.slidingWindow(60,  '1 m'),  'rl:global'),
};

export async function verificarLimite(
  limitador: Ratelimit | null,
  userId: string,
  { falharFechado = false }: { falharFechado?: boolean } = {}
): Promise<{ permitido: boolean; restante: number }> {
  if (!limitador) {
    // Se Redis não está configurado e o chamador pediu falha fechada, bloqueia
    if (falharFechado) {
      console.warn('[ratelimit] Redis indisponível — bloqueando por segurança');
      return { permitido: false, restante: 0 };
    }
    return { permitido: true, restante: 999 };
  }
  try {
    const { success, remaining } = await limitador.limit(userId);
    return { permitido: success, restante: remaining };
  } catch (e) {
    console.error('[ratelimit] Erro ao verificar limite:', e);
    if (falharFechado) return { permitido: false, restante: 0 };
    return { permitido: true, restante: 999 };
  }
}
