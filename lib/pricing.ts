export const PLANOS = {
  free: {
    nome: 'Free',
    preco_mensal: 0,
    preco_anual_total: 0,
    preco_anual_mensal: 0,
    economia_anual: 0,
    desconto_pct: 0,
  },
  premium: {
    nome: 'Premium',
    preco_mensal: 19.90,
    preco_anual_total: 178.80,
    preco_anual_mensal: 14.90,
    economia_anual: 60.00,
    desconto_pct: 25,
  },
  elite: {
    nome: 'Elite',
    preco_mensal: 29.90,
    preco_anual_total: 274.80,
    preco_anual_mensal: 22.90,
    economia_anual: 84.00,
    desconto_pct: 23,
  },
} as const;

export const LIMITES = {
  free: {
    simulados_mes: 3,
    questoes_por_simulado: 10,
    tutor_msgs_dia: 1,
    tutor_msgs_mes: 1,    // alias para compatibilidade
    raio_x_mes: 1,
    pdfs_mes: 1,
    flashcards_por_pdf: 5,
  },
  premium: {
    simulados_mes: Infinity,
    questoes_por_simulado: Infinity,
    tutor_msgs_dia: Infinity,
    tutor_msgs_mes: 30,
    raio_x_mes: Infinity,
    pdfs_mes: 5,
    flashcards_por_pdf: Infinity,
  },
  elite: {
    simulados_mes: Infinity,
    questoes_por_simulado: Infinity,
    tutor_msgs_dia: Infinity,
    tutor_msgs_mes: Infinity,
    raio_x_mes: Infinity,
    pdfs_mes: Infinity,
    flashcards_por_pdf: Infinity,
  },
} as const;

export type PlanoId = keyof typeof PLANOS;
export type RecursoLimitado = keyof (typeof LIMITES)['free'];
