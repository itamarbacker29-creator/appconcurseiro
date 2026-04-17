import { createServerClient } from '@/lib/supabase-server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { thetaParaPercentual } from '@/lib/irt';
import Link from 'next/link';

// Logistic function: gives ~50% at score=65, ~80% at score=80, ~95% at score=90
function calcularProbabilidade(mediaPct: number): number {
  return Math.round(100 / (1 + Math.exp(-0.12 * (mediaPct - 65))));
}

function labelProbabilidade(prob: number): { texto: string; variant: 'success' | 'warning' | 'danger' } {
  if (prob >= 75) return { texto: 'Alta chance de aprovação', variant: 'success' };
  if (prob >= 50) return { texto: 'Aprovação possível', variant: 'warning' };
  return { texto: 'Precisa evoluir mais', variant: 'danger' };
}

// Estimate weeks to reach target assuming ~2% gain per week of study
function semanasParaMeta(pctAtual: number, meta = 70): number | null {
  if (pctAtual >= meta) return null;
  return Math.ceil((meta - pctAtual) / 2);
}

export default async function EstimativaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: habilidades }, { data: profile }, { data: respostas }] = await Promise.all([
    supabase.from('habilidade_usuario').select('*').eq('user_id', user!.id),
    supabase.from('profiles').select('data_prova, plano').eq('id', user!.id).single(),
    supabase.from('respostas').select('correta, respondida_em').eq('user_id', user!.id).order('respondida_em', { ascending: false }).limit(200),
  ]);

  const META_APROVACAO = 70; // typical passing threshold

  const totalRespondidas = respostas?.length ?? 0;

  // Compute per-matéria pct from theta
  const materiasPct = (habilidades ?? []).map(h => ({
    materia: h.materia,
    pct: thetaParaPercentual(h.theta),
    totalRespondidas: h.total_respondidas,
    totalAcertos: h.total_acertos,
    theta: h.theta,
  })).sort((a, b) => b.pct - a.pct);

  const mediaPct = materiasPct.length > 0
    ? Math.round(materiasPct.reduce((s, m) => s + m.pct, 0) / materiasPct.length)
    : 0;

  const prob = calcularProbabilidade(mediaPct);
  const { texto: labelProb, variant: variantProb } = labelProbabilidade(prob);

  const acimaDaMeta = materiasPct.filter(m => m.pct >= META_APROVACAO);
  const abaixoDaMeta = materiasPct.filter(m => m.pct < META_APROVACAO).sort((a, b) => a.pct - b.pct);

  // Days remaining
  const diasRestantes = profile?.data_prova
    ? Math.max(0, Math.ceil((new Date(profile.data_prova).getTime() - Date.now()) / 86400000))
    : null;

  // Trend: compare last 30 vs previous 30 answers
  const ultimas30 = (respostas ?? []).slice(0, 30);
  const anteriores30 = (respostas ?? []).slice(30, 60);
  const taxaUltimas = ultimas30.length > 0 ? Math.round((ultimas30.filter(r => r.correta).length / ultimas30.length) * 100) : null;
  const taxaAnteriores = anteriores30.length > 0 ? Math.round((anteriores30.filter(r => r.correta).length / anteriores30.length) * 100) : null;
  const tendencia = taxaUltimas !== null && taxaAnteriores !== null ? taxaUltimas - taxaAnteriores : null;

  // SVG circle
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (prob / 100) * circ;
  const probColor = prob >= 75 ? 'var(--teal)' : prob >= 50 ? 'var(--warning)' : 'var(--danger)';

  if (totalRespondidas < 5) {
    return (
      <div className="p-4 md:p-6 max-w-[700px] mx-auto">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-(--ink)">Estimativa de Sucesso</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">Previsão de aprovação com base no seu desempenho.</p>
        </div>
        <Card padding="lg" className="text-center flex flex-col items-center gap-4 py-12">
          <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 48 }}>insights</span>
          <div>
            <p className="text-[16px] font-semibold text-(--ink)">Dados insuficientes</p>
            <p className="text-[13px] text-(--ink-3) mt-1 max-w-xs mx-auto">
              Responda pelo menos 5 questões nos simulados para ver sua estimativa de aprovação.
            </p>
          </div>
          <Link href="/simulado">
            <button className="px-5 py-2.5 bg-(--accent) text-white text-[14px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
              Iniciar simulado
            </button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[700px] mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-(--ink)">Estimativa de Sucesso</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Previsão de aprovação com base no seu desempenho.</p>
      </div>

      {/* Hero — probabilidade */}
      <Card padding="md" className="flex flex-col md:flex-row items-center gap-6">
        {/* SVG gauge */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={r}
              fill="none"
              stroke={probColor}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
            />
            <text x="64" y="60" textAnchor="middle" className="font-black" style={{ fontSize: 22, fill: 'var(--ink)', fontWeight: 900 }}>
              {prob}%
            </text>
            <text x="64" y="76" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink-3)' }}>
              aprovação
            </text>
          </svg>
        </div>

        <div className="flex flex-col gap-3 flex-1 w-full">
          <Badge variant={variantProb} className="self-start">{labelProb}</Badge>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-(--ink-3) font-semibold uppercase tracking-wide">Média geral</p>
              <p className={`text-[24px] font-black ${mediaPct >= META_APROVACAO ? 'text-(--teal)' : mediaPct >= 50 ? 'text-(--warning)' : 'text-(--danger)'}`}>
                {mediaPct}%
              </p>
            </div>
            <div>
              <p className="text-[11px] text-(--ink-3) font-semibold uppercase tracking-wide">Meta de aprovação</p>
              <p className="text-[24px] font-black text-(--ink)">{META_APROVACAO}%</p>
            </div>
            {diasRestantes !== null && (
              <div>
                <p className="text-[11px] text-(--ink-3) font-semibold uppercase tracking-wide">Dias restantes</p>
                <p className="text-[24px] font-black text-(--accent)">{diasRestantes}</p>
              </div>
            )}
            {tendencia !== null && (
              <div>
                <p className="text-[11px] text-(--ink-3) font-semibold uppercase tracking-wide">Tendência</p>
                <p className={`text-[24px] font-black ${tendencia > 0 ? 'text-(--teal)' : tendencia < 0 ? 'text-(--danger)' : 'text-(--ink)'}`}>
                  {tendencia > 0 ? `+${tendencia}%` : `${tendencia}%`}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Matérias abaixo da meta */}
      {abaixoDaMeta.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-(--danger)" style={{ fontSize: 18 }}>warning</span>
            <h2 className="text-[14px] font-bold text-(--ink)">Matérias abaixo da meta</h2>
            <Badge variant="danger" className="ml-auto">{abaixoDaMeta.length}</Badge>
          </div>
          <div className="flex flex-col gap-4">
            {abaixoDaMeta.map(m => {
              const gap = META_APROVACAO - m.pct;
              const semanas = semanasParaMeta(m.pct);
              return (
                <div key={m.materia} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-(--ink) truncate">{m.materia}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {semanas && (
                        <span className="text-[11px] text-(--ink-3)">~{semanas} sem.</span>
                      )}
                      <span className="text-[12px] font-bold text-(--danger)">falta {gap}%</span>
                    </div>
                  </div>
                  <div className="relative">
                    <ProgressBar value={m.pct} color="danger" size="sm" />
                    {/* meta marker */}
                    <div
                      className="absolute top-0 w-0.5 h-full bg-(--ink-3)/50"
                      style={{ left: `${META_APROVACAO}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-(--ink-3)">
                    <span>{m.pct}% atual</span>
                    <span>{m.totalRespondidas} questões</span>
                    <span>{META_APROVACAO}% meta</span>
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/simulado" className="mt-4 block">
            <button className="w-full py-2.5 bg-(--danger)/10 text-(--danger) text-[13px] font-semibold rounded-(--radius-sm) hover:bg-(--danger)/20 transition-colors">
              Treinar matérias fracas
            </button>
          </Link>
        </Card>
      )}

      {/* Matérias acima da meta */}
      {acimaDaMeta.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-(--teal)" style={{ fontSize: 18 }}>verified</span>
            <h2 className="text-[14px] font-bold text-(--ink)">Matérias acima da meta</h2>
            <Badge variant="success" className="ml-auto">{acimaDaMeta.length}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {acimaDaMeta.map(m => (
              <div key={m.materia} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-(--ink) truncate">{m.materia}</span>
                  <span className="text-[12px] font-bold text-(--teal)">{m.pct}%</span>
                </div>
                <ProgressBar value={m.pct} color="teal" size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dica baseada na probabilidade */}
      <Card padding="md" className={`border-l-4 ${prob >= 75 ? 'border-(--teal)' : prob >= 50 ? 'border-(--warning)' : 'border-(--danger)'}`}>
        <div className="flex items-start gap-3">
          <span className={`material-symbols-outlined filled shrink-0 ${prob >= 75 ? 'text-(--teal)' : prob >= 50 ? 'text-(--warning)' : 'text-(--danger)'}`} style={{ fontSize: 20 }}>
            {prob >= 75 ? 'emoji_events' : prob >= 50 ? 'trending_up' : 'school'}
          </span>
          <div>
            <p className="text-[13px] font-semibold text-(--ink)">
              {prob >= 75
                ? 'Você está no caminho certo!'
                : prob >= 50
                ? 'Progresso consistente te levará lá.'
                : 'Foco no básico primeiro.'}
            </p>
            <p className="text-[12px] text-(--ink-3) mt-0.5">
              {prob >= 75
                ? `${acimaDaMeta.length} matéria${acimaDaMeta.length !== 1 ? 's' : ''} acima da meta. Mantenha a regularidade e revise ${abaixoDaMeta[0]?.materia ?? 'as mais fracas'}.`
                : prob >= 50
                ? `Concentre-se em ${abaixoDaMeta.slice(0, 2).map(m => m.materia).join(' e ')} para elevar sua média rapidamente.`
                : `Comece pelas matérias com mais questões na prova. ${abaixoDaMeta[0]?.materia ?? 'Estude'} é sua prioridade número 1.`}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/plano" className="flex-1">
          <button className="w-full py-2.5 bg-(--accent) text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
            Ver plano de estudos
          </button>
        </Link>
        <Link href="/desempenho" className="flex-1">
          <button className="w-full py-2.5 border border-(--border) text-(--ink-2) text-[13px] font-semibold rounded-(--radius-sm) hover:bg-(--surface-3) transition-colors">
            Desempenho detalhado
          </button>
        </Link>
      </div>
    </div>
  );
}
