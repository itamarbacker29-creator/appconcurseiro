interface IsencaoTaxa {
  disponivel: boolean;
  periodo?: { inicio?: string; fim?: string };
  criterios?: string[];
}

interface Cotas {
  pcd?: number;
  racial?: number;
  indigena?: number;
  quilombola?: number;
}

interface ResumoEditalProps {
  taxa_inscricao: number | null;
  isencao_taxa: IsencaoTaxa | null;
  cotas: Cotas | null;
  data_prova: string | null;
  data_inscricao_inicio: string | null;
  data_inscricao_fim: string | null;
  etapas: string[] | null;
  local_prova: string[] | null;
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

export function ResumoEdital({
  taxa_inscricao, isencao_taxa, cotas, data_prova,
  data_inscricao_inicio, data_inscricao_fim, etapas, local_prova,
}: ResumoEditalProps) {
  const temCotas = cotas && Object.values(cotas).some(v => v && v > 0);
  const temEtapas = etapas && etapas.length > 0;
  const temLocal = local_prova && local_prova.length > 0;

  // Só renderiza se há pelo menos um dado útil
  if (!taxa_inscricao && !temCotas && !temEtapas && !temLocal && !data_prova) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* Datas e taxa */}
      {(taxa_inscricao || data_prova || data_inscricao_inicio || data_inscricao_fim) && (
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-5">
          <h4 className="text-[14px] font-bold text-(--ink) mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 18 }}>calendar_today</span>
            Datas e taxas
          </h4>
          <div className="flex flex-col gap-3">
            {data_inscricao_inicio && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Início das inscrições</span>
                <span className="text-[13px] font-semibold text-(--ink)">{fmt(data_inscricao_inicio)}</span>
              </div>
            )}
            {data_inscricao_fim && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Fim das inscrições</span>
                <span className="text-[13px] font-semibold text-(--ink)">{fmt(data_inscricao_fim)}</span>
              </div>
            )}
            {taxa_inscricao && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Taxa de inscrição</span>
                <span className="text-[13px] font-semibold text-(--ink)">
                  R$ {taxa_inscricao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {data_prova && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Data da prova</span>
                <span className="text-[13px] font-semibold text-(--accent)">{fmt(data_prova)}</span>
              </div>
            )}
            {isencao_taxa?.disponivel && (
              <div className="bg-(--teal-light) rounded-(--radius-sm) p-3 flex gap-2 mt-1">
                <span className="material-symbols-outlined text-(--teal) shrink-0 mt-0.5" style={{ fontSize: 16 }}>savings</span>
                <div>
                  <p className="text-[11px] font-bold text-(--teal)">Isenção de taxa disponível</p>
                  {isencao_taxa.criterios && isencao_taxa.criterios.length > 0 && (
                    <p className="text-[11px] text-(--ink-3) mt-0.5">
                      {isencao_taxa.criterios.join(', ')}
                      {isencao_taxa.periodo?.inicio && ` · Solicitar até ${fmt(isencao_taxa.periodo.fim)}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cotas */}
      {temCotas && (
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-5">
          <h4 className="text-[14px] font-bold text-(--ink) mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 18 }}>diversity_3</span>
            Reserva de vagas
          </h4>
          <div className="flex flex-col gap-2">
            {cotas!.pcd && cotas!.pcd > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Pessoas com Deficiência (PcD)</span>
                <span className="text-[13px] font-bold text-(--teal)">{cotas!.pcd}%</span>
              </div>
            )}
            {cotas!.racial && cotas!.racial > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-(--ink-3)">Cotas raciais</span>
                <span className="text-[13px] font-bold text-(--teal)">{cotas!.racial}%</span>
              </div>
            )}
            {cotas!.indigena && cotas!.indigena > 0 && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-[12px] text-(--ink-3)">↳ Indígenas</span>
                <span className="text-[12px] font-semibold text-(--ink-3)">{cotas!.indigena}%</span>
              </div>
            )}
            {cotas!.quilombola && cotas!.quilombola > 0 && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-[12px] text-(--ink-3)">↳ Quilombolas</span>
                <span className="text-[12px] font-semibold text-(--ink-3)">{cotas!.quilombola}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Etapas e locais */}
      {(temEtapas || temLocal) && (
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-5">
          <h4 className="text-[14px] font-bold text-(--ink) mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 18 }}>route</span>
            Etapas do concurso
          </h4>
          {temEtapas && (
            <ol className="flex flex-col gap-2 mb-3">
              {etapas!.map((etapa, i) => (
                <li key={i} className="flex items-center gap-3 text-[13px] text-(--ink-2)">
                  <span className="w-6 h-6 rounded-full bg-(--accent-light) text-(--accent) text-[11px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="capitalize">{etapa}</span>
                </li>
              ))}
            </ol>
          )}
          {temLocal && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {local_prova!.map(l => (
                <span key={l} className="px-2 py-0.5 bg-(--surface-2) rounded text-[11px] text-(--ink-3)">{l}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
