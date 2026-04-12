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
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: habilidades }, { data: respostas }, { data: editaisSalvos }] = await Promise.all([
    supabase.from('profiles').select('nome, plano, concurso_alvo_id, data_prova').eq('id', user!.id).single(),
    supabase.from('habilidade_usuario').select('materia, theta, total_respondidas, total_acertos').eq('user_id', user!.id),
    supabase.from('respostas').select('correta, respondida_em').eq('user_id', user!.id).order('respondida_em', { ascending: false }).limit(100),
    supabase.from('editais_salvos').select('edital_id, editais(orgao, cargo, data_inscricao_fim)').eq('user_id', user!.id).limit(3),
  ]);

  const nome = profile?.nome ?? user?.email?.split('@')[0] ?? 'Candidato';
  const totalQuestoes = respostas?.length ?? 0;
  const acertos = respostas?.filter(r => r.correta).length ?? 0;
  const taxaAcerto = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

  // Calcular sequência de dias
  let sequencia = 0;
  if (respostas && respostas.length > 0) {
    const datas = [...new Set(respostas.map(r => r.respondida_em.split('T')[0]))].sort().reverse();
    const hoje = new Date().toISOString().split('T')[0];
    for (let i = 0; i < datas.length; i++) {
      const esperado = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (datas[i] === esperado) sequencia++;
      else break;
    }
  }

  // Matéria com pior desempenho
  const pioreMateria = habilidades?.sort((a, b) => a.theta - b.theta)[0];

  const diasRestantes = profile?.data_prova
    ? Math.max(0, Math.ceil((new Date(profile.data_prova).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      {/* Saudação */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">
          {saudacao()}, {nome}.
          {diasRestantes !== null && (
            <span className="text-(--ink-2) font-normal"> Faltam <span className="font-bold text-(--accent)">{diasRestantes} dias</span> para a prova.</span>
          )}
        </h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Aqui está o resumo do seu progresso.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Sequência', valor: `${sequencia} dias`, sub: 'consecutivos', cor: 'accent' },
          { label: 'Questões', valor: totalQuestoes.toString(), sub: 'respondidas', cor: 'teal' },
          { label: 'Acertos', valor: `${taxaAcerto}%`, sub: 'taxa geral', cor: taxaAcerto >= 70 ? 'teal' : 'warning' },
          { label: 'Editais', valor: (editaisSalvos?.length ?? 0).toString(), sub: 'salvos', cor: 'accent' },
        ].map(m => (
          <Card key={m.label} padding="md" className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-(--ink-3) uppercase tracking-wide">{m.label}</span>
            <span className={`text-[26px] font-black ${m.cor === 'accent' ? 'text-(--accent)' : m.cor === 'teal' ? 'text-(--teal)' : 'text-(--warning)'}`}>
              {m.valor}
            </span>
            <span className="text-[11px] text-(--ink-3)">{m.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editais recentes */}
        <Card padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-(--ink)">Editais salvos</h2>
            <Link href="/editais" className="text-[12px] text-(--accent) hover:underline">Ver todos</Link>
          </div>
          {editaisSalvos && editaisSalvos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(editaisSalvos as any[]).map((es) => {
                const e = es.editais as { orgao: string; cargo: string; data_inscricao_fim: string } | null;
                if (!e) return null;
                const prazo = e.data_inscricao_fim ? new Date(e.data_inscricao_fim) : null;
                const urgente = prazo && (prazo.getTime() - Date.now()) / 86400000 <= 5;
                return (
                  <div key={es.edital_id} className="p-3 bg-(--surface-2) rounded-(--radius-sm) flex flex-col gap-1">
                    <p className="text-[10px] font-semibold text-(--ink-3) uppercase">{e.orgao}</p>
                    <p className="text-[13px] font-semibold text-(--ink) leading-tight">{e.cargo}</p>
                    {prazo && (
                      <p className={`text-[11px] font-medium ${urgente ? 'text-red-500' : 'text-(--ink-3)'}`}>
                        {urgente && '⚡ '}Inscrições até {prazo.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-(--ink-3)">Você ainda não salvou nenhum edital.</p>
              <Link href="/editais" className="text-[13px] text-(--accent) hover:underline mt-1 block">Explorar editais</Link>
            </div>
          )}
        </Card>

        {/* Desempenho por matéria */}
        <Card padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-(--ink)">Desempenho por matéria</h2>
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
            <div className="py-6 text-center">
              <p className="text-[13px] text-(--ink-3)">Faça seu primeiro simulado para ver seu desempenho.</p>
              <Link href="/simulado" className="text-[13px] text-(--accent) hover:underline mt-1 block">Iniciar simulado</Link>
            </div>
          )}
        </Card>

        {/* Foco da semana */}
        {pioreMateria && (
          <Card padding="md" className="md:col-span-2 flex flex-col gap-3 border-(--warning)/30 bg-[var(--warning-light)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="warning">Foco desta semana</Badge>
                <h3 className="text-[15px] font-bold text-(--ink) mt-2">
                  Priorize {pioreMateria.materia}
                </h3>
                <p className="text-[13px] text-(--ink-2) mt-1">
                  Sua taxa de acerto nesta matéria está em{' '}
                  <strong>{Math.round(((pioreMateria.theta + 3) / 6) * 100)}%</strong>.
                  {' '}O plano de estudo já está calibrado para isso.
                </p>
              </div>
              <Link href="/simulado">
                <button className="px-4 py-2 bg-(--warning) text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity shrink-0">
                  Treinar agora
                </button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
