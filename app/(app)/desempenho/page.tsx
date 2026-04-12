import { createServerClient } from '@/lib/supabase-server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { thetaParaPercentual } from '@/lib/irt';

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

  // Agrupar por dia para gráfico de evolução
  const porDia: Record<string, { total: number; acertos: number }> = {};
  respostas?.forEach(r => {
    const dia = r.respondida_em.split('T')[0];
    if (!porDia[dia]) porDia[dia] = { total: 0, acertos: 0 };
    porDia[dia].total++;
    if (r.correta) porDia[dia].acertos++;
  });

  const diasOrdenados = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14); // últimas 2 semanas

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">Desempenho</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Análise completa do seu progresso nos simulados.</p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card padding="md">
          <span className="text-[11px] font-semibold text-(--ink-3) uppercase tracking-wide">Total respondidas</span>
          <div className="text-[28px] font-black text-(--ink) mt-1">{totalRespondidas}</div>
        </Card>
        <Card padding="md">
          <span className="text-[11px] font-semibold text-(--ink-3) uppercase tracking-wide">Taxa de acerto</span>
          <div className={`text-[28px] font-black mt-1 ${taxaGeral >= 70 ? 'text-(--teal)' : taxaGeral >= 50 ? 'text-(--warning)' : 'text-(--danger)'}`}>
            {taxaGeral}%
          </div>
        </Card>
        <Card padding="md" className="col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-(--ink-3) uppercase tracking-wide">Matérias estudadas</span>
          <div className="text-[28px] font-black text-(--ink) mt-1">{habilidades?.length ?? 0}</div>
        </Card>
      </div>

      {/* Evolução por dia */}
      {diasOrdenados.length > 0 && (
        <Card padding="md" className="mb-4">
          <h2 className="text-[14px] font-bold text-(--ink) mb-4">Evolução (últimos 14 dias)</h2>
          <div className="flex items-end gap-1 h-24">
            {diasOrdenados.map(([dia, dados]) => {
              const pct = Math.round((dados.acertos / dados.total) * 100);
              const altura = Math.max(8, Math.round((pct / 100) * 80));
              return (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t ${pct >= 70 ? 'bg-(--teal)' : pct >= 50 ? 'bg-(--warning)' : 'bg-(--danger)'}`}
                    style={{ height: `${altura}px` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-(--ink) text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                    {new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: {pct}%
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-(--ink-3) mt-1">
            <span>{diasOrdenados[0] ? new Date(diasOrdenados[0][0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}</span>
            <span>{diasOrdenados[diasOrdenados.length - 1] ? new Date(diasOrdenados[diasOrdenados.length - 1][0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}</span>
          </div>
        </Card>
      )}

      {/* Desempenho por matéria */}
      {habilidades && habilidades.length > 0 ? (
        <Card padding="md">
          <h2 className="text-[14px] font-bold text-(--ink) mb-4">Por matéria</h2>
          <div className="flex flex-col gap-4">
            {habilidades.map(h => {
              const pct = thetaParaPercentual(h.theta);
              const taxa = h.total_respondidas > 0 ? Math.round((h.total_acertos / h.total_respondidas) * 100) : 0;
              const tendencia = h.theta > 0 ? '↑' : h.theta < 0 ? '↓' : '→';
              return (
                <div key={h.materia} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[13px] font-semibold text-(--ink) truncate">{h.materia}</span>
                      <span className={`text-[14px] font-bold shrink-0 ${h.theta > 0 ? 'text-(--teal)' : h.theta < -1 ? 'text-(--danger)' : 'text-(--warning)'}`}>
                        {tendencia}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-(--ink-3)">{h.total_respondidas} questões</span>
                      <span className="text-[12px] font-bold text-(--ink)">{taxa}%</span>
                      <Badge variant={pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'}>
                        Nível {pct >= 70 ? 'Avançado' : pct >= 50 ? 'Intermediário' : 'Básico'}
                      </Badge>
                    </div>
                  </div>
                  <ProgressBar
                    value={pct}
                    color={pct >= 70 ? 'teal' : pct >= 50 ? 'warning' : 'danger'}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum dado de desempenho ainda.</p>
          <p className="text-[13px] text-(--ink-3) mt-1">Faça simulados para ver seu progresso aqui.</p>
        </Card>
      )}
    </div>
  );
}
