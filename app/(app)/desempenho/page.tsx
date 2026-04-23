import { createServerClient } from '@/lib/supabase-server';
import { thetaParaPercentual } from '@/lib/irt';
import { DesempenhoChart } from './DesempenhoChart';

export default async function DesempenhoPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: habilidades }, { data: respostas }] = await Promise.all([
    supabase.from('habilidade_usuario').select('*').eq('user_id', user!.id).order('theta', { ascending: false }),
    supabase.from('respostas')
      .select('correta, respondida_em, questoes(materia)')
      .eq('user_id', user!.id)
      .order('respondida_em', { ascending: false })
      .limit(200),
  ]);

  const totalRespondidas = respostas?.length ?? 0;
  const totalAcertos = respostas?.filter(r => r.correta).length ?? 0;
  const taxaGeral = totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0;

  // Dados do gráfico
  const porDia: Record<string, { total: number; acertos: number }> = {};
  respostas?.forEach(r => {
    const dia = r.respondida_em.split('T')[0];
    if (!porDia[dia]) porDia[dia] = { total: 0, acertos: 0 };
    porDia[dia].total++;
    if (r.correta) porDia[dia].acertos++;
  });

  const chartData = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([dia, dados]) => ({
      data: new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      taxa: Math.round((dados.acertos / dados.total) * 100),
    }));

  // Matérias priorizadas: baixo acerto = foco
  const materiasPriorizadas = (habilidades ?? [])
    .map(h => ({
      ...h,
      taxa: h.total_respondidas > 0 ? Math.round((h.total_acertos / h.total_respondidas) * 100) : 0,
      pct: thetaParaPercentual(h.theta),
    }))
    .sort((a, b) => a.taxa - b.taxa);

  const taxaColor = taxaGeral >= 60 ? 'text-success' : taxaGeral >= 40 ? 'text-warning-2' : 'text-danger-2';
  const taxaBg    = taxaGeral >= 60 ? 'bg-success-bg border-success/20' : taxaGeral >= 40 ? 'bg-warning-bg border-warning-2/20' : 'bg-danger-bg border-danger-2/20';
  const barColor  = taxaGeral >= 60 ? 'bg-success' : 'bg-warning-2';

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-brand-navy">Desempenho</h1>
        <p className="text-[13px] text-text-muted mt-1">Análise completa do seu progresso nos simulados.</p>
      </div>

      {/* Hero — taxa de acerto dominante */}
      <div className={`rounded-(--radius) p-6 border ${taxaBg}`}>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">
          Taxa de acerto geral
        </p>
        <div className="flex items-end gap-4">
          <p className={`font-black leading-none text-[72px] ${taxaColor}`}>{taxaGeral}%</p>
          <div className="mb-2">
            <p className="text-[14px] font-semibold text-text-secondary">Meta: 60% para aprovação</p>
            {taxaGeral < 60 && (
              <p className="text-[12px] text-text-muted">Faltam {60 - taxaGeral}% para a meta</p>
            )}
            {taxaGeral >= 60 && (
              <p className="text-[12px] text-success font-semibold">✓ Acima da meta de aprovação!</p>
            )}
          </div>
        </div>

        {/* Barra de progresso até a meta */}
        <div className="mt-4">
          <div className="h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min((taxaGeral / 60) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>0%</span>
            <span className="font-bold text-success">Meta: 60%</span>
          </div>
        </div>
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-(--surface) rounded-(--radius) p-4 border border-(--border)">
          <p className="text-[11px] text-text-muted uppercase tracking-widest">Respondidas</p>
          <p className="font-black text-[32px] leading-none text-brand-navy mt-1">{totalRespondidas}</p>
        </div>
        <div className="bg-(--surface) rounded-(--radius) p-4 border border-(--border)">
          <p className="text-[11px] text-text-muted uppercase tracking-widest">Matérias</p>
          <p className="font-black text-[32px] leading-none text-brand-navy mt-1">{habilidades?.length ?? 0}</p>
        </div>
      </div>

      {/* Gráfico com linha de meta */}
      <DesempenhoChart dados={chartData} />

      {/* Matérias — ordenadas por prioridade (menor acerto primeiro) */}
      {materiasPriorizadas.length > 0 && (
        <div className="bg-(--surface) rounded-(--radius) p-5 border border-(--border)">
          <h2 className="text-[15px] font-bold text-brand-navy mb-4">Por matéria — prioridade de estudo</h2>
          <div className="flex flex-col gap-3">
            {materiasPriorizadas.map((h, i) => {
              const badge = h.taxa >= 60 ? { label: 'BOM', cls: 'bg-success-bg text-success' }
                : h.taxa >= 40 ? { label: 'MÉDIO', cls: 'bg-warning-bg text-warning-2' }
                : { label: 'FOCO', cls: 'bg-danger-bg text-danger-2' };
              const rankCls = i === 0 ? 'bg-danger-2 text-white' : i === 1 ? 'bg-warning-2 text-white' : 'bg-brand-cream-2 text-brand-navy';
              const barFill = h.taxa >= 60 ? 'bg-success' : h.taxa >= 40 ? 'bg-warning-2' : 'bg-danger-2';

              return (
                <div key={h.materia} className="flex flex-col gap-2 py-2 border-t border-(--border) first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${rankCls}`}>
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-brand-navy truncate">{h.materia}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Barra dupla: meta (fundo) + acerto atual */}
                  <div className="relative h-2 bg-brand-cream-2 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-success/20 rounded-full w-[60%]" />
                    <div className={`absolute h-full ${barFill} rounded-full`} style={{ width: `${h.taxa}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>{h.total_respondidas} questões</span>
                    <span className="font-semibold">{h.taxa}% acerto</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {materiasPriorizadas.length === 0 && (
        <div className="bg-(--surface) rounded-(--radius) p-8 border border-(--border) text-center">
          <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 40 }}>insights</span>
          <p className="text-[15px] font-semibold text-brand-navy mt-2">Nenhum dado de desempenho ainda.</p>
          <p className="text-[13px] text-text-muted mt-1">Faça simulados para ver seu progresso aqui.</p>
        </div>
      )}
    </div>
  );
}
