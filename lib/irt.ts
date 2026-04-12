/**
 * Motor IRT — Teoria de Resposta ao Item (modelo de 3 parâmetros)
 */

export function probabilidadeAcerto(
  theta: number,
  a: number,
  b: number,
  c: number = 0.2
): number {
  return c + (1 - c) / (1 + Math.exp(-1.7 * a * (theta - b)));
}

export function atualizarTheta(
  thetaAtual: number,
  acertou: boolean,
  a: number,
  b: number,
  c: number = 0.2
): number {
  const p = probabilidadeAcerto(thetaAtual, a, b, c);
  const u = acertou ? 1 : 0;
  const gradiente = a * (u - p);
  const novoTheta = thetaAtual + 0.3 * gradiente;
  return Math.max(-3, Math.min(3, novoTheta));
}

export function selecionarProximaQuestao(
  theta: number,
  questoesDisponiveis: Array<{ id: string; nivel: number; materia: string }>,
  questoesRespondidas: string[]
): string | null {
  const naoRespondidas = questoesDisponiveis.filter(
    q => !questoesRespondidas.includes(q.id)
  );
  if (naoRespondidas.length === 0) return null;

  const thetaAlvo = theta;
  const ordenadas = [...naoRespondidas].sort((a, b_q) => {
    const bA = (a.nivel - 3) * 0.8;
    const bB = (b_q.nivel - 3) * 0.8;
    return Math.abs(bA - thetaAlvo) - Math.abs(bB - thetaAlvo);
  });

  return ordenadas[0]?.id ?? null;
}

export function thetaParaPercentual(theta: number): number {
  return Math.round(((theta + 3) / 6) * 100);
}

export function nivelParaTheta(nivel: number): number {
  return (nivel - 3) * 0.8;
}

export function thetaParaNivel(theta: number): number {
  return Math.round(Math.max(1, Math.min(5, theta / 0.8 + 3)));
}
