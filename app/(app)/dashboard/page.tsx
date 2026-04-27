import { createServerClient } from '@/lib/supabase-server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: habilidades }, { data: respostas }, { data: editaisSalvos }] = await Promise.all([
    supabase.from('profiles').select('nome, plano, concurso_alvo_id, data_prova').eq('id', user!.id).single(),
    supabase.from('habilidade_usuario').select('materia, theta, total_respondidas, total_acertos').eq('user_id', user!.id),
    supabase.from('respostas').select('correta, respondida_em').eq('user_id', user!.id).order('respondida_em', { ascending: false }).limit(200),
    supabase.from('editais_salvos').select('edital_id, editais(orgao, cargo, data_inscricao_fim, data_prova)').eq('user_id', user!.id).limit(3),
  ]);

  // Busca matérias do edital alvo para filtrar o "foco da semana"
  let materiasConcursoAlvo: string[] | null = null;
  if (profile?.concurso_alvo_id) {
    const { data: editalAlvo } = await supabase
      .from('editais').select('materias').eq('id', profile.concurso_alvo_id).single();
    materiasConcursoAlvo = (editalAlvo?.materias as string[] | null) ?? null;
  }

  const nome = profile?.nome ?? user?.email?.split('@')[0] ?? 'Candidato';
  const totalQuestoes = respostas?.length ?? 0;
  const acertos = respostas?.filter(r => r.correta).length ?? 0;
  const taxaAcerto = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

  // Tendência semanal
  const hoje = new Date();
  const semanaPassada = new Date(hoje.getTime() - 7 * 86400000);
  const semanaAnterior = new Date(hoje.getTime() - 14 * 86400000);
  const respostasSemana = respostas?.filter(r => new Date(r.respondida_em) >= semanaPassada) ?? [];
  const respostasAnterior = respostas?.filter(r => new Date(r.respondida_em) >= semanaAnterior && new Date(r.respondida_em) < semanaPassada) ?? [];
  const taxaSemana = respostasSemana.length > 0 ? Math.round((respostasSemana.filter(r => r.correta).length / respostasSemana.length) * 100) : 0;
  const taxaAnterior = respostasAnterior.length > 0 ? Math.round((respostasAnterior.filter(r => r.correta).length / respostasAnterior.length) * 100) : 0;
  const tendencia = taxaSemana - taxaAnterior;

  let sequencia = 0;
  if (respostas && respostas.length > 0) {
    const datas = [...new Set(respostas.map(r => r.respondida_em.split('T')[0]))].sort().reverse();
    for (let i = 0; i < datas.length; i++) {
      const esperado = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (datas[i] === esperado) sequencia++;
      else break;
    }
  }

  const habilidadesFiltradas = materiasConcursoAlvo && materiasConcursoAlvo.length > 0
    ? (habilidades ?? []).filter(h =>
        materiasConcursoAlvo!.some(m => m.toLowerCase() === h.materia.toLowerCase() || m.toLowerCase().includes(h.materia.toLowerCase()))
      )
    : (habilidades ?? []);
  const pioreMateria = (habilidadesFiltradas.length > 0 ? habilidadesFiltradas : (habilidades ?? [])).sort((a, b) => a.theta - b.theta)[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataProvaEdital = (editaisSalvos as any[])
    ?.map(es => es.editais?.data_prova as string | null)
    .filter(Boolean)
    .map(d => new Date(d!))
    .filter(d => d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const dataProvaRef = dataProvaEdital ?? (profile?.data_prova ? new Date(profile.data_prova) : null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nomeProvaRef = dataProvaEdital
    ? (editaisSalvos as any[]).find(es => es.editais?.data_prova &&
        new Date(es.editais.data_prova).getTime() === dataProvaEdital.getTime())?.editais?.orgao ?? null
    : null;

  const diasRestantes = dataProvaRef
    ? Math.max(0, Math.ceil((dataProvaRef.getTime() - Date.now()) / 86400000))
    : null;

  const taxaColor = taxaAcerto >= 60 ? 'text-success' : taxaAcerto >= 40 ? 'text-warning-2' : 'text-danger-2';
  const taxaBg = taxaAcerto >= 60 ? 'bg-success-bg border-success/20' : taxaAcerto >= 40 ? 'bg-warning-bg border-warning-2/20' : 'bg-danger-bg border-danger-2/20';

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-5">

      {/* Hero — saudação + countdown */}
      <div className="rounded-(--radius) overflow-hidden bg-(--accent) text-white p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-white/70 text-[13px] font-medium">{saudacao()}, {nome.split(' ')[0]}</p>
          {nomeProvaRef && (
            <p className="text-white/80 text-[13px] mt-0.5 font-semibold">{nomeProvaRef}</p>
          )}
          {diasRestantes === null && (
            <Link href="/conta" className="text-white/70 text-[12px] mt-1 block hover:text-white transition-colors">
              Definir concurso alvo →
            </Link>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-center">
          {diasRestantes !== null ? (
            <>
              <span className="text-[54px] font-black leading-none text-brand-orange">{diasRestantes}</span>
              <span className="text-[11px] text-white/70 font-medium uppercase tracking-wider">dias</span>
            </>
          ) : (
            <span className="material-symbols-outlined text-white/40" style={{ fontSize: 48 }}>timer</span>
          )}
        </div>
      </div>

      {/* Métricas — hierarquia diferenciada */}
      <div className="grid grid-cols-2 gap-3">

        {/* Card 1 — Questões respondidas (destaque) */}
        <div className="col-span-2 bg-(--surface) rounded-(--radius) p-5 border border-(--border)">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Questões respondidas</p>
          <p className="font-black text-[48px] leading-none text-brand-navy mt-1">{totalQuestoes}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-brand-cream-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-orange rounded-full transition-all"
                style={{ width: `${Math.min((totalQuestoes / 500) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-text-muted shrink-0">meta: 500</span>
          </div>
        </div>

        {/* Card 2 — Taxa de acerto (semântico) */}
        <div className={`col-span-2 rounded-(--radius) p-5 border ${taxaBg}`}>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Taxa de acerto</p>
          <div className="flex items-end gap-3 mt-1">
            <p className={`font-black text-[48px] leading-none ${taxaColor}`}>{taxaAcerto}%</p>
            {respostasSemana.length > 0 && (
              <span className="text-[12px] text-text-muted mb-2">
                {tendencia > 0 ? `↑ ${tendencia}% esta semana` : tendencia < 0 ? `↓ ${Math.abs(tendencia)}% esta semana` : '→ estável'}
              </span>
            )}
          </div>
          <p className="text-[12px] text-text-secondary mt-1">Meta de aprovação: 60%</p>
        </div>

        {/* Card 3 — Sequência */}
        <div className="bg-(--surface) rounded-(--radius) p-4 border border-(--border)">
          <p className="text-[11px] text-text-muted uppercase tracking-widest">Sequência</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[20px]">🔥</span>
            <p className="font-black text-[28px] leading-none text-brand-navy">{sequencia}</p>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">dias seguidos</p>
        </div>

        {/* Card 4 — Editais salvos */}
        <div className="bg-(--surface) rounded-(--radius) p-4 border border-(--border)">
          <p className="text-[11px] text-text-muted uppercase tracking-widest">Editais</p>
          <p className="font-black text-[28px] leading-none text-brand-navy mt-1">{editaisSalvos?.length ?? 0}</p>
          <p className="text-[11px] text-text-muted mt-0.5">salvos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Editais salvos */}
        <div className="bg-(--surface) rounded-(--radius) p-5 border border-(--border) flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-brand-navy">Editais salvos</h2>
            <Link href="/editais" className="text-[12px] text-brand-orange font-semibold hover:underline">Ver todos</Link>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {editaisSalvos && editaisSalvos.length > 0 ? (editaisSalvos as any[]).map((es) => {
            const e = es.editais as { orgao: string; cargo: string; data_inscricao_fim: string | null; data_prova: string | null } | null;
            if (!e) return null;
            const prazo = e.data_inscricao_fim ? new Date(e.data_inscricao_fim) : null;
            const diasP = prazo ? Math.ceil((prazo.getTime() - Date.now()) / 86400000) : null;
            const urgente = diasP !== null && diasP <= 5 && diasP >= 0;
            return (
              <Link
                key={es.edital_id}
                href={`/editais/${es.edital_id}`}
                className="flex items-start justify-between py-3 border-t border-(--border) first:border-0 hover:bg-(--surface-2) -mx-2 px-2 rounded transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">{e.orgao}</p>
                  <p className="text-[13px] font-semibold text-brand-navy mt-0.5 leading-tight">{e.cargo}</p>
                  {prazo && (
                    <p className={`text-[11px] mt-1 ${urgente ? 'text-danger-2 font-semibold' : 'text-text-muted'}`}>
                      {urgente && '⚠ '}Inscrições até {prazo.toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                {diasP !== null && diasP >= 0 && (
                  <div className={`ml-3 px-2 py-1 rounded-md text-center flex-shrink-0 ${diasP < 30 ? 'bg-danger-bg text-danger-2' : 'bg-brand-cream-2 text-brand-navy'}`}>
                    <p className="font-black text-[18px] leading-none">{diasP}</p>
                    <p className="text-[9px] uppercase tracking-wide">dias</p>
                  </div>
                )}
              </Link>
            );
          }) : (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 32 }}>description</span>
              <p className="text-[13px] text-text-muted">Nenhum edital salvo ainda.</p>
              <Link href="/editais" className="text-[13px] text-brand-navy font-semibold hover:underline">Explorar editais →</Link>
            </div>
          )}
        </div>

        {/* Desempenho por matéria */}
        <div className="bg-(--surface) rounded-(--radius) p-5 border border-(--border) flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-brand-navy">Desempenho</h2>
            <Link href="/desempenho" className="text-[12px] text-brand-orange font-semibold hover:underline">Ver mais</Link>
          </div>
          {habilidades && habilidades.length > 0 ? (
            <div className="flex flex-col gap-3">
              {habilidades.slice(0, 4).map(h => {
                const taxa = h.total_respondidas > 0 ? Math.round((h.total_acertos / h.total_respondidas) * 100) : 0;
                const barColor = taxa >= 60 ? 'bg-success' : taxa >= 40 ? 'bg-warning-2' : 'bg-danger-2';
                return (
                  <div key={h.materia} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-secondary font-medium truncate">{h.materia}</span>
                      <span className="font-bold text-brand-navy shrink-0 ml-2">{taxa}%</span>
                    </div>
                    <div className="relative h-1.5 bg-brand-cream-2 rounded-full overflow-hidden">
                      <div className="absolute h-full bg-success/20 rounded-full w-[60%]" />
                      <div className={`absolute h-full ${barColor} rounded-full`} style={{ width: `${taxa}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 32 }}>insights</span>
              <p className="text-[13px] text-text-muted">Faça seu primeiro simulado para ver seu desempenho.</p>
              <Link href="/simulado" className="text-[13px] text-brand-navy font-semibold hover:underline">Iniciar simulado →</Link>
            </div>
          )}
        </div>

        {/* Foco da semana */}
        {pioreMateria && (
          <div className="md:col-span-2 rounded-(--radius) p-5 border border-warning-2/30 bg-warning-bg flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-2/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined filled text-warning-2" style={{ fontSize: 20 }}>flag</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-warning-2 uppercase tracking-widest">Foco desta semana</span>
                <h3 className="text-[15px] font-bold text-brand-navy mt-0.5">{pioreMateria.materia}</h3>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  Taxa de acerto em <strong>{pioreMateria.total_respondidas > 0 ? Math.round((pioreMateria.total_acertos / pioreMateria.total_respondidas) * 100) : 0}%</strong> — prioridade no seu plano.
                </p>
              </div>
            </div>
            <Link href="/simulado" className="shrink-0">
              <button className="px-4 py-2 bg-warning-2 text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
                Treinar
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/simulado',   icon: 'quiz',          label: 'Simulado',   bloqueado: false },
          { href: '/estimativa', icon: 'emoji_events',  label: 'Estimativa', bloqueado: false },
          { href: '/plano',      icon: 'calendar_month',label: 'Plano',      bloqueado: false },
          { href: profile?.plano === 'free' ? '/conta#plano' : '/tutor', icon: 'auto_awesome', label: 'Tutor IA', bloqueado: profile?.plano === 'free' },
        ].map(a => (
          <Link key={a.href} href={a.href}>
            <Card padding="md" className="relative flex flex-col items-center gap-2 text-center hover:border-(--accent)/40 hover:bg-(--accent-light) transition-all cursor-pointer">
              {a.bloqueado && (
                <span className="absolute top-1.5 right-1.5 material-symbols-outlined text-text-muted" style={{ fontSize: 14 }}>lock</span>
              )}
              <span className="material-symbols-outlined text-brand-navy" style={{ fontSize: 24 }}>{a.icon}</span>
              <span className="text-[12px] font-semibold text-text-secondary">{a.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
