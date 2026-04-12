export function calcularChanceAprovacao(
  thetaUsuario: number,
  distribuicaoAprovados: number[]
): { percentil: number; chanceEstimada: number; descricao: string } {
  if (distribuicaoAprovados.length === 0) {
    return { percentil: 50, chanceEstimada: 50, descricao: 'Dados insuficientes para calcular.' };
  }

  const abaixo = distribuicaoAprovados.filter(t => t <= thetaUsuario).length;
  const percentil = Math.round((abaixo / distribuicaoAprovados.length) * 100);

  const media = distribuicaoAprovados.reduce((a, b) => a + b, 0) / distribuicaoAprovados.length;
  const chanceEstimada = Math.round(100 / (1 + Math.exp(-(thetaUsuario - media) * 1.5)));

  const descricao =
    percentil >= 75
      ? 'Você está entre os candidatos mais bem preparados para este concurso.'
      : percentil >= 50
      ? 'Desempenho acima da média. Continue focando nas matérias prioritárias.'
      : 'Ainda há espaço relevante para crescer. O plano de estudo está calibrado para isso.';

  return { percentil, chanceEstimada, descricao };
}
