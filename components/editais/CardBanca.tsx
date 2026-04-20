interface Caracteristicas {
  estilo: string;
  pegadinhas: string;
  legislacao_literal: boolean;
  jurisprudencia: string | boolean;
  atualidades: string;
  interdisciplinaridade: string;
}

interface CardBancaProps {
  nome: string;
  perfilResumido: string;
  caracteristicas: Caracteristicas;
  dicaEstudo: string;
  nivelDificuldade: string;
}

const NIVEL_STYLE: Record<string, string> = {
  alto:  'bg-(--danger-light) text-(--danger)',
  médio: 'bg-(--warning-light) text-(--warning)',
  baixo: 'bg-(--teal-light) text-(--teal)',
};

export function CardBanca({ nome, perfilResumido, caracteristicas, dicaEstudo, nivelDificuldade }: CardBancaProps) {
  const nivelStyle = NIVEL_STYLE[nivelDificuldade] ?? 'bg-(--surface-2) text-(--ink-3)';

  const chips = [
    { label: 'Estilo',      valor: caracteristicas.estilo },
    { label: 'Pegadinhas',  valor: caracteristicas.pegadinhas },
    { label: 'Atualidades', valor: caracteristicas.atualidades },
    { label: 'Lei literal', valor: caracteristicas.legislacao_literal ? 'Sim' : 'Não' },
  ];

  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-(--accent-light) rounded-(--radius-sm) flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 20 }}>gavel</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">Banca Examinadora</p>
            <h4 className="text-[16px] font-bold text-(--ink)">{nome}</h4>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${nivelStyle}`}>
          Dificuldade {nivelDificuldade}
        </span>
      </div>

      {/* Perfil resumido */}
      <p className="text-[13px] text-(--ink-2) leading-relaxed mb-4">{perfilResumido}</p>

      {/* Características */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {chips.map(c => (
          <div key={c.label} className="bg-(--surface-2) rounded-(--radius-sm) px-3 py-2">
            <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{c.label}</p>
            <p className="text-[13px] font-semibold text-(--ink) mt-0.5 capitalize">{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Dica */}
      <div className="bg-(--teal-light) rounded-(--radius-sm) p-4 flex gap-3">
        <span className="material-symbols-outlined text-(--teal) shrink-0 mt-0.5" style={{ fontSize: 18 }}>tips_and_updates</span>
        <div>
          <p className="text-[10px] font-bold text-(--teal) uppercase tracking-wide mb-1">Dica para essa banca</p>
          <p className="text-[13px] text-(--ink-2) leading-relaxed">{dicaEstudo}</p>
        </div>
      </div>
    </div>
  );
}
