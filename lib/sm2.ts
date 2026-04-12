/**
 * Algoritmo SM-2 para revisão espaçada (mesmo do Anki)
 */
export function calcularProximaRevisao(
  easeFactor: number,
  intervalo: number,
  qualidade: number
): { novoIntervalo: number; novoEaseFactor: number } {
  if (qualidade < 3) {
    return { novoIntervalo: 1, novoEaseFactor: Math.max(1.3, easeFactor - 0.2) };
  }
  const novoEaseFactor = easeFactor + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
  const novoIntervalo =
    intervalo === 0 ? 1 : intervalo === 1 ? 6 : Math.round(intervalo * novoEaseFactor);
  return { novoIntervalo, novoEaseFactor: Math.max(1.3, novoEaseFactor) };
}
