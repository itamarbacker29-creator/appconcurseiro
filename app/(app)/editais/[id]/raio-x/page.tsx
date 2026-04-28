import { createServerClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RecomendacaoIA } from '@/components/editais/RecomendacaoIA';
import { ExtrairCargos } from '@/components/editais/ExtrairCargos';
import { verificarLimite, limitadores } from '@/lib/ratelimit';
import Link from 'next/link';

function matchTheta(
  materia: string,
  habilidades: { materia: string; theta: number }[],
): number | null {
  const m = materia.toLowerCase();
  for (const h of habilidades) {
    const h2 = h.materia.toLowerCase();
    if (m === h2 || m.includes(h2) || h2.includes(m)) return h.theta;
  }
  return null;
}

function matchRef(
  materia: string,
  refs: { materia: string; percentual_medio: number }[],
): number | null {
  const m = materia.toLowerCase();
  for (const r of refs) {
    const r2 = r.materia.toLowerCase();
    if (m === r2 || m.includes(r2) || r2.includes(m)) return r.percentual_medio;
  }
  return null;
}

export default async function RaioXPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cargo?: string }>;
}) {
  const { id } = await params;
  const { cargo: cargoId } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Limite de Raio-X para free: 1/mês
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
    if ((profile?.plano ?? 'free') === 'free') {
      const { permitido } = await verificarLimite(limitadores.raioxFree, user.id, { falharFechado: true });
      if (!permitido) redirect(`/editais/${id}?limite=raiox`);
    }
  }

  const [{ data: edital }, { data: cargos }, { data: habilidades }, { data: refs }] = await Promise.all([
    supabase.from('editais').select('id,orgao,cargo,banca,materias').eq('id', id).single(),
    supabase.from('cargos').select('*').eq('edital_id', id).order('nome'),
    user
      ? supabase.from('habilidade_usuario').select('materia,theta,total_respondidas').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase.from('historico_aprovados').select('materia,percentual_medio').eq('concurso', 'Geral'),
  ]);

  if (!edital) notFound();

  // Se há cargos e nenhum foi selecionado → tela de seleção
  if (cargos && cargos.length > 0 && !cargoId) {
    return (
      <div className="p-4 md:p-6 max-w-[800px] mx-auto">
        <div className="flex items-center gap-2 text-[12px] text-(--ink-3) mb-4 flex-wrap">
          <Link href="/editais" className="hover:text-(--accent)">Editais</Link>
          <span>/</span>
          <Link href={`/editais/${id}`} className="hover:text-(--accent) truncate max-w-[200px]">{edital.orgao}</Link>
          <span>/</span>
          <span className="text-(--ink) font-medium">Raio-X</span>
        </div>
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-(--ink)">Para qual cargo?</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">Selecione o cargo para ver seu Raio-X personalizado.</p>
        </div>
        <div className="flex flex-col gap-3">
          {cargos.map(c => (
            <Link key={c.id} href={`/editais/${id}/raio-x?cargo=${c.id}`}>
              <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 hover:border-(--accent)/50 hover:bg-(--accent-light) transition-all cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-semibold text-(--ink)">{c.nome}</p>
                    {(c.salario || c.vagas) && (
                      <p className="text-[12px] text-(--ink-3) mt-0.5">
                        {c.salario ? `R$ ${c.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                        {c.salario && c.vagas ? ' · ' : ''}
                        {c.vagas ? `${c.vagas} vagas` : ''}
                      </p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-(--ink-3)">chevron_right</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Resolve matérias: do cargo selecionado ou fallback para editais.materias
  const cargoSelecionado = cargos?.find(c => c.id === cargoId) ?? null;
  const materias: string[] = cargoSelecionado?.materias ?? edital.materias ?? [];

  const chartData = materias.map(materia => {
    const theta = matchTheta(materia, habilidades ?? []);
    const userPct = theta !== null ? Math.round(((theta + 3) / 6) * 100) : null;
    const refPct = matchRef(materia, refs ?? []) ?? null;
    const gap = userPct !== null && refPct !== null ? refPct - userPct : null;
    return { materia, userPct, refPct, gap };
  }).sort((a, b) => {
    if (a.gap === null && b.gap === null) return 0;
    if (a.gap === null) return 1;
    if (b.gap === null) return -1;
    return b.gap - a.gap;
  });

  const comDados = chartData.filter(d => d.userPct !== null);
  const mediaGeral = comDados.length > 0
    ? Math.round(comDados.reduce((s, d) => s + d.userPct!, 0) / comDados.length)
    : null;
  const pioreMateria = chartData.find(d => d.gap !== null && d.gap > 0) ?? null;

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-(--ink-3) mb-4 flex-wrap">
        <Link href="/editais" className="hover:text-(--accent)">Editais</Link>
        <span>/</span>
        <Link href={`/editais/${id}`} className="hover:text-(--accent) truncate max-w-[200px]">{edital.orgao}</Link>
        <span>/</span>
        <span className="text-(--ink) font-medium">Raio-X</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[12px] font-semibold text-(--ink-3) uppercase tracking-wide">{edital.orgao}</span>
          {edital.banca && <Badge variant="default">{edital.banca}</Badge>}
          {cargos && cargos.length > 1 && (
            <Link href={`/editais/${id}/raio-x`} className="text-[11px] text-(--accent) hover:underline">
              Trocar cargo ↩
            </Link>
          )}
        </div>
        <h1 className="text-[22px] font-bold text-(--ink)">
          {cargoSelecionado?.nome ?? edital.cargo}
        </h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Seu desempenho comparado ao perfil de aprovados — por matéria.</p>
      </div>

      {materias.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 48 }}>radar</span>
          <div>
            <p className="text-[15px] font-semibold text-(--ink-2)">Matérias ainda não extraídas.</p>
            <p className="text-[13px] text-(--ink-3) max-w-xs text-center mt-1">
              Vamos buscar o PDF do edital e extrair os cargos com suas matérias.
            </p>
          </div>
          <ExtrairCargos editalId={id} />
          <Link href={`/editais/${id}`}>
            <Button variant="ghost" size="sm">← Voltar ao edital</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-(--surface-2) rounded-(--radius-sm) p-3">
              <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide mb-1">Matérias</p>
              <p className="text-[26px] font-black text-(--ink)">{materias.length}</p>
            </div>
            <div className="bg-(--surface-2) rounded-(--radius-sm) p-3">
              <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide mb-1">Seu aproveit.</p>
              <p className={`text-[26px] font-black ${
                mediaGeral === null ? 'text-(--ink-3)' :
                mediaGeral >= 70 ? 'text-(--teal)' :
                mediaGeral >= 50 ? 'text-(--warning)' : 'text-(--danger)'
              }`}>
                {mediaGeral !== null ? `${mediaGeral}%` : '—'}
              </p>
            </div>
            <div className="bg-(--surface-2) rounded-(--radius-sm) p-3">
              <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide mb-1">Sem treino</p>
              <p className="text-[26px] font-black text-(--ink)">
                {chartData.filter(d => d.userPct === null).length}
              </p>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-5 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-full bg-(--teal)" />
              <span className="text-[11px] text-(--ink-3)">Seu desempenho</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-px h-4 bg-(--ink-3)/50" />
              <span className="text-[11px] text-(--ink-3)">Meta (aprovados)</span>
            </div>
            <span className="text-[11px] text-(--ink-3) ml-auto">Ordenado por prioridade</span>
          </div>

          {/* Barras horizontais */}
          <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 mb-5 flex flex-col gap-4">
            {chartData.map(item => (
              <div key={item.materia}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[13px] font-medium text-(--ink-2) truncate">{item.materia}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.userPct !== null ? (
                      <>
                        <span className={`text-[13px] font-bold ${
                          item.userPct >= 70 ? 'text-(--teal)' :
                          item.userPct >= 50 ? 'text-(--warning)' : 'text-(--danger)'
                        }`}>{item.userPct}%</span>
                        {item.refPct !== null && item.gap !== null && item.gap > 0 && (
                          <span className="text-[10px] text-(--danger) font-semibold">−{item.gap}pts</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-(--ink-3) italic">sem dados</span>
                    )}
                    {item.refPct !== null && (
                      <span className="text-[11px] text-(--ink-3)">meta {item.refPct}%</span>
                    )}
                  </div>
                </div>
                <div className="relative h-3 bg-(--surface-3) rounded-full overflow-visible">
                  {item.userPct !== null && (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${
                        item.userPct >= 70 ? 'bg-(--teal)' :
                        item.userPct >= 50 ? 'bg-(--warning)' : 'bg-(--danger)'
                      }`}
                      style={{ width: `${item.userPct}%` }}
                    />
                  )}
                  {item.refPct !== null && (
                    <div
                      className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-(--ink)/30 rounded-full"
                      style={{ left: `${item.refPct}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recomendação IA */}
          {user && (
            <RecomendacaoIA
              editalId={id}
              pioreMateria={pioreMateria?.materia ?? null}
            />
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href={`/simulado?edital=${id}${cargoId ? `&cargo=${cargoId}` : ''}${pioreMateria ? `&materia=${encodeURIComponent(pioreMateria.materia)}` : ''}`}>
              <Button size="md" variant="primary">
                {pioreMateria ? `Treinar ${pioreMateria.materia.split(' ')[0]}` : 'Iniciar simulado'}
              </Button>
            </Link>
            <Link href={`/plano?edital=${id}${cargoId ? `&cargo=${cargoId}` : ''}`}>
              <Button size="md" variant="ghost">Adicionar ao plano</Button>
            </Link>
            <Link href={`/editais/${id}`}>
              <Button size="md" variant="ghost">← Edital</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
