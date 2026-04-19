import { createServerClient } from '@/lib/supabase-server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
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
    supabase.from('respostas').select('correta, respondida_em').eq('user_id', user!.id).order('respondida_em', { ascending: false }).limit(100),
    supabase.from('editais_salvos').select('edital_id, editais(orgao, cargo, data_inscricao_fim, data_prova)').eq('user_id', user!.id).limit(3),
  ]);

  const nome = profile?.nome ?? user?.email?.split('@')[0] ?? 'Candidato';
  const totalQuestoes = respostas?.length ?? 0;
  const acertos = respostas?.filter(r => r.correta).length ?? 0;
  const taxaAcerto = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

  let sequencia = 0;
  if (respostas && respostas.length > 0) {
    const datas = [...new Set(respostas.map(r => r.respondida_em.split('T')[0]))].sort().reverse();
    for (let i = 0; i < datas.length; i++) {
      const esperado = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (datas[i] === esperado) sequencia++;
      else break;
    }
  }

  const pioreMateria = habilidades?.sort((a, b) => a.theta - b.theta)[0];

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

  const metricas = [
    { label: 'Sequência', valor: sequencia > 0 ? `${sequencia}` : '—', sub: sequencia > 0 ? 'dias consecutivos' : 'faça seu 1º simulado', icon: 'local_fire_department', cor: 'accent' },
    { label: 'Questões', valor: `${totalQuestoes}`, sub: 'respondidas', icon: 'quiz', cor: 'teal' },
    { label: 'Acertos', valor: totalQuestoes > 0 ? `${taxaAcerto}%` : '—', sub: totalQuestoes > 0 ? 'taxa geral' : 'sem dados ainda', icon: 'target', cor: taxaAcerto >= 70 ? 'teal' : 'warning' },
    { label: 'Editais', valor: `${editaisSalvos?.length ?? 0}`, sub: 'salvos', icon: 'bookmark', cor: 'accent' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-5">

      {/* Hero — saudação + countdown */}
      <div className="rounded-(--radius) overflow-hidden bg-(--accent) text-white p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-white/70 text-[13px] font-medium">{saudacao()}</p>
          <h1 className="text-[22px] font-black tracking-tight mt-0.5">{nome.split(' ')[0]}</h1>
          {diasRestantes !== null ? (
            <p className="text-white/80 text-[13px] mt-1">
              {nomeProvaRef && <span className="font-semibold text-white">{nomeProvaRef} · </span>}
              Faltam <span className="font-black text-white">{diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</span>
            </p>
          ) : (
            <Link href="/conta" className="text-white/70 text-[12px] mt-1 block hover:text-white transition-colors">
              Definir concurso alvo →
            </Link>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-center">
          {diasRestantes !== null ? (
            <>
              <span className="text-[48px] font-black leading-none">{diasRestantes}</span>
              <span className="text-[11px] text-white/70 font-medium uppercase tracking-wider">dias</span>
            </>
          ) : (
            <span className="material-symbols-outlined text-white/40" style={{ fontSize: 48 }}>timer</span>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricas.map(m => (
          <Card key={m.label} padding="md" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-(--ink-3) uppercase tracking-wide">{m.label}</span>
              <span
                className={`material-symbols-outlined ${m.cor === 'accent' ? 'text-(--accent)' : m.cor === 'teal' ? 'text-(--teal)' : 'text-(--warning)'}`}
                style={{ fontSize: 18 }}
              >
                {m.icon}
              </span>
            </div>
            <span className={`text-[28px] font-black leading-none ${m.cor === 'accent' ? 'text-(--accent)' : m.cor === 'teal' ? 'text-(--teal)' : 'text-(--warning)'}`}>
              {m.valor}
            </span>
            <span className="text-[11px] text-(--ink-3)">{m.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editais salvos */}
        <Card padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 18 }}>description</span>
              <h2 className="text-[14px] font-bold text-(--ink)">Editais salvos</h2>
            </div>
            <Link href="/editais" className="text-[12px] text-(--accent) hover:underline">Ver todos</Link>
          </div>
          {editaisSalvos && editaisSalvos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(editaisSalvos as any[]).map((es) => {
                const e = es.editais as { orgao: string; cargo: string; data_inscricao_fim: string | null; data_prova: string | null } | null;
                if (!e) return null;
                const prazo = e.data_inscricao_fim ? new Date(e.data_inscricao_fim) : null;
                const urgente = prazo && (prazo.getTime() - Date.now()) / 86400000 <= 5;
                return (
                  <div key={es.edital_id} className="p-3 bg-(--surface-2) rounded-(--radius-sm) flex flex-col gap-1">
                    <p className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{e.orgao}</p>
                    <p className="text-[13px] font-semibold text-(--ink) leading-tight">{e.cargo}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {prazo && (
                        <p className={`text-[11px] font-medium flex items-center gap-1 ${urgente ? 'text-(--danger)' : 'text-(--ink-3)'}`}>
                          {urgente && <span className="w-1.5 h-1.5 rounded-full bg-(--danger) animate-pulse inline-block" />}
                          Inscrições até {prazo.toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {e.data_prova && (
                        <p className="text-[11px] text-(--accent) font-medium">
                          Prova: {new Date(e.data_prova).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 32 }}>description</span>
              <p className="text-[13px] text-(--ink-3)">Você ainda não salvou nenhum edital.</p>
              <Link href="/editais" className="text-[13px] text-(--accent) hover:underline font-medium">Explorar editais →</Link>
            </div>
          )}
        </Card>

        {/* Desempenho por matéria */}
        <Card padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-(--teal)" style={{ fontSize: 18 }}>bar_chart</span>
              <h2 className="text-[14px] font-bold text-(--ink)">Desempenho</h2>
            </div>
            <Link href="/desempenho" className="text-[12px] text-(--accent) hover:underline">Ver mais</Link>
          </div>
          {habilidades && habilidades.length > 0 ? (
            <div className="flex flex-col gap-3">
              {habilidades.slice(0, 4).map(h => {
                const pct = Math.round(((h.theta + 3) / 6) * 100);
                return (
                  <div key={h.materia} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-(--ink-2) font-medium truncate">{h.materia}</span>
                      <span className="font-bold text-(--ink) shrink-0 ml-2">{pct}%</span>
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
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 32 }}>insights</span>
              <p className="text-[13px] text-(--ink-3)">Faça seu primeiro simulado para ver seu desempenho.</p>
              <Link href="/simulado" className="text-[13px] text-(--accent) hover:underline font-medium">Iniciar simulado →</Link>
            </div>
          )}
        </Card>

        {/* Foco da semana */}
        {pioreMateria && (
          <Card padding="md" className="md:col-span-2 border-(--warning)/30 bg-(--warning-light)">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-(--warning)/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined filled text-(--warning)" style={{ fontSize: 20 }}>flag</span>
                </div>
                <div>
                  <Badge variant="warning" className="mb-2">Foco desta semana</Badge>
                  <h3 className="text-[15px] font-bold text-(--ink)">{pioreMateria.materia}</h3>
                  <p className="text-[13px] text-(--ink-2) mt-0.5">
                    Taxa de acerto em <strong>{Math.round(((pioreMateria.theta + 3) / 6) * 100)}%</strong> — prioridade no seu plano.
                  </p>
                </div>
              </div>
              <Link href="/simulado" className="shrink-0">
                <button className="px-4 py-2 bg-(--warning) text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
                  Treinar
                </button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/simulado', icon: 'quiz', label: 'Simulado', bloqueado: false },
          { href: '/estimativa', icon: 'emoji_events', label: 'Estimativa', bloqueado: false },
          { href: '/plano', icon: 'calendar_month', label: 'Plano', bloqueado: false },
          { href: profile?.plano === 'free' ? '/conta#plano' : '/tutor', icon: 'auto_awesome', label: 'Tutor IA', bloqueado: profile?.plano === 'free' },
        ].map(a => (
          <Link key={a.href} href={a.href}>
            <Card padding="md" className="relative flex flex-col items-center gap-2 text-center hover:border-(--accent)/40 hover:bg-(--accent-light) transition-all cursor-pointer">
              {a.bloqueado && (
                <span className="absolute top-1.5 right-1.5 material-symbols-outlined text-(--ink-3)" style={{ fontSize: 14 }}>lock</span>
              )}
              <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 24 }}>{a.icon}</span>
              <span className="text-[12px] font-semibold text-(--ink-2)">{a.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
