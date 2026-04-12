export const limitesPorPlano = {
  free: {
    questoesPorDia: 10,
    simuladosPorDia: 3,
    editaisMonitorados: 1,
    gabaritoExplicado: false,
    planoEstudo: false,
    modoOffline: false,
    tutorMensagens: 0,
    uploadPdf: false,
    flashcards: false,
    raioX: false,
    resolucaoDuvidas: 0,
    linksLegislacao: false,
  },
  premium: {
    questoesPorDia: Infinity,
    simuladosPorDia: Infinity,
    editaisMonitorados: Infinity,
    gabaritoExplicado: true,
    planoEstudo: true,
    modoOffline: true,
    tutorMensagens: 0,
    uploadPdf: false,
    flashcards: false,
    raioX: true,
    resolucaoDuvidas: 30,
    linksLegislacao: true,
  },
  elite: {
    questoesPorDia: Infinity,
    simuladosPorDia: Infinity,
    editaisMonitorados: Infinity,
    gabaritoExplicado: true,
    planoEstudo: true,
    modoOffline: true,
    tutorMensagens: 150,
    uploadPdf: true,
    flashcards: true,
    raioX: true,
    resolucaoDuvidas: Infinity,
    linksLegislacao: true,
  },
  avulso: {
    questoesPorDia: Infinity,
    simuladosPorDia: Infinity,
    editaisMonitorados: 1,
    gabaritoExplicado: true,
    planoEstudo: true,
    modoOffline: true,
    tutorMensagens: 0,
    uploadPdf: false,
    flashcards: false,
    raioX: true,
    resolucaoDuvidas: 30,
    linksLegislacao: true,
  },
} as const;

export type Plano = keyof typeof limitesPorPlano;

export function verificarAcesso(plano: Plano, feature: keyof (typeof limitesPorPlano)['free']): boolean {
  const limite = limitesPorPlano[plano][feature];
  if (typeof limite === 'boolean') return limite;
  if (typeof limite === 'number') return limite > 0;
  return false;
}
