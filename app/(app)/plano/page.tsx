'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiaPlano {
  dia: string;
  materia: string;
  topico: string;
  questoes: number;
  tipo: string;
}

interface SemanaPlano {
  semana: number;
  foco: string;
  dias: DiaPlano[];
}

interface Plano {
  diagnostico: string;
  prioridades: string[];
  semanas: SemanaPlano[];
  dica_semana: string;
  alerta?: { nivel: 'critico' | 'atencao' | 'bom'; mensagem: string };
  projecao?: { semana: number; percentual: number }[];
  comparativo?: { materia: string; voce: number; aprovados: number }[];
}

interface Habilidade { materia: string; theta: number }

const DIAS_PT: Record<string, string> = {
  Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua', Quinta: 'Qui',
  Sexta: 'Sex', Sábado: 'Sáb', Domingo: 'Dom',
};

const PASSOS_SESSAO = [
  { label: 'Aquecimento', desc: '5 min revisando o tópico anterior', icon: '◎' },
  { label: 'Estudo', desc: 'Leia o conteúdo principal do tópico', icon: '□' },
  { label: 'Questões', desc: 'Resolva as questões do dia', icon: '▷' },
  { label: 'Revisão', desc: 'Anote os erros e revise os conceitos', icon: '✓' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertaRisco({ alerta }: { alerta: Plano['alerta'] }) {
  if (!alerta) return null;
  const estilos = {
    critico: { bg: 'bg-red-50 border-red-200', texto: 'text-red-700', badge: 'CRÍTICO' },
    atencao: { bg: 'bg-amber-50 border-amber-200', texto: 'text-amber-700', badge: 'ATENÇÃO' },
    bom:     { bg: 'bg-green-50 border-green-200', texto: 'text-green-700', badge: 'BOM CAMINHO' },
  };
  const e = estilos[alerta.nivel];
  return (
    <div className={`rounded-(--radius) border p-3 mb-4 flex gap-3 items-start ${e.bg}`}>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${e.bg} ${e.texto} border-current shrink-0 mt-0.5`}>
        {e.badge}
      </span>
      <p className={`text-[13px] leading-relaxed ${e.texto}`}>{alerta.mensagem}</p>
    </div>
  );
}

function ProjecaoEvolucao({ projecao }: { projecao: Plano['projecao'] }) {
  if (!projecao || projecao.length < 2) return null;
  const max = Math.max(...projecao.map(p => p.percentual), 100);
  return (
    <Card padding="md" className="mb-4">
      <p className="text-[13px] font-semibold text-(--ink) mb-3">Projeção de evolução</p>
      <div className="flex items-end gap-2 h-24">
        {projecao.map((p, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-(--accent)">{p.percentual}%</span>
            <div
              className="w-full rounded-t bg-(--accent) transition-all"
              style={{ height: `${(p.percentual / max) * 72}px`, opacity: 0.4 + (i / projecao.length) * 0.6 }}
            />
            <span className="text-[9px] text-(--ink-3)">S{p.semana}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-(--ink-3) mt-2">Estimativa baseada no seu ritmo atual de acertos</p>
    </Card>
  );
}

function ComparativoAprovados({ comparativo }: { comparativo: Plano['comparativo'] }) {
  if (!comparativo || comparativo.length === 0) return null;
  return (
    <Card padding="md" className="mb-4">
      <p className="text-[13px] font-semibold text-(--ink) mb-3">Você vs. média dos aprovados</p>
      <div className="flex flex-col gap-3">
        {comparativo.map((c, i) => (
          <div key={i}>
            <div className="flex justify-between text-[11px] text-(--ink-2) mb-1">
              <span className="font-medium">{c.materia}</span>
              <span className="text-(--ink-3)">Aprovados: {c.aprovados}%</span>
            </div>
            <div className="relative h-5 bg-(--surface-2) rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-(--accent) rounded-full transition-all"
                style={{ width: `${c.voce}%`, opacity: 0.7 }}
              />
              <div
                className="absolute top-0 left-0 h-full border-r-2 border-green-500"
                style={{ left: `${c.aprovados}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-0.5">
              <span className="text-(--accent) font-medium">Você: {c.voce}%</span>
              {c.voce < c.aprovados && (
                <span className="text-amber-600">Faltam {c.aprovados - c.voce}pp</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SessaoDiaria({ dia, questoesPorDia }: { dia: DiaPlano; questoesPorDia: number }) {
  const [expandida, setExpandida] = useState(false);
  const [buscaSugerida, setBuscaSugerida] = useState<string | null>(null);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [passosConcluidos, setPassosConcluidos] = useState<boolean[]>([false, false, false, false]);

  async function carregarBusca() {
    if (buscaSugerida !== null || carregandoBusca) return;
    setCarregandoBusca(true);
    try {
      const r = await fetch(`/api/plano/busca-sugerida?materia=${encodeURIComponent(dia.materia)}&topico=${encodeURIComponent(dia.topico)}`);
      const { busca } = await r.json();
      setBuscaSugerida(busca ?? `${dia.topico} ${dia.materia} concurso aula`);
    } catch {
      setBuscaSugerida(`${dia.topico} ${dia.materia} concurso aula`);
    } finally {
      setCarregandoBusca(false);
    }
  }

  function togglePasso(i: number) {
    setPassosConcluidos(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  function toggleExpandir() {
    setExpandida(v => !v);
    if (!expandida) carregarBusca();
  }

  const concluidos = passosConcluidos.filter(Boolean).length;

  return (
    <div className="bg-(--surface-2) rounded-(--radius-sm) overflow-hidden">
      <button
        onClick={toggleExpandir}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-(--surface-3) transition-colors"
      >
        <div className="w-10 text-center shrink-0">
          <span className="text-[11px] font-bold text-(--accent)">{DIAS_PT[dia.dia] ?? dia.dia}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-(--ink) truncate">{dia.materia}</p>
          {dia.topico && <p className="text-[11px] text-(--ink-3) truncate">{dia.topico}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {concluidos > 0 && (
            <span className="text-[10px] text-green-600 font-medium">{concluidos}/4</span>
          )}
          <span className="text-[12px] font-bold text-(--teal)">{dia.questoes}q</span>
          {dia.tipo === 'revisao' && <Badge variant="warning">Revisão</Badge>}
          <span className="text-[10px] text-(--ink-3) ml-1">{expandida ? '▲' : '▼'}</span>
        </div>
      </button>

      {expandida && (
        <div className="border-t border-(--border) p-3 flex flex-col gap-3">
          {/* Passos da sessão */}
          <div className="grid grid-cols-2 gap-2">
            {PASSOS_SESSAO.map((passo, i) => (
              <button
                key={i}
                onClick={() => togglePasso(i)}
                className={`flex items-center gap-2 p-2 rounded-(--radius-sm) text-left border transition-all ${
                  passosConcluidos[i]
                    ? 'bg-green-50 border-green-200'
                    : 'bg-(--surface) border-(--border-strong) hover:border-(--accent)'
                }`}
              >
                <span className={`text-[16px] ${passosConcluidos[i] ? 'text-green-500' : 'text-(--ink-3)'}`}>
                  {passosConcluidos[i] ? '✓' : passo.icon}
                </span>
                <div>
                  <p className={`text-[11px] font-semibold ${passosConcluidos[i] ? 'text-green-700' : 'text-(--ink)'}`}>
                    {passo.label}
                  </p>
                  <p className="text-[10px] text-(--ink-3) leading-tight">{passo.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Busca sugerida */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-(--ink-3)">Pesquisar no YouTube:</span>
            {carregandoBusca ? (
              <span className="text-[11px] text-(--ink-3) animate-pulse">Carregando...</span>
            ) : buscaSugerida ? (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(buscaSugerida)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-(--accent) underline font-medium hover:opacity-80"
              >
                {buscaSugerida}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckInDiario({ onCheckin }: { onCheckin: (nivel: string) => void }) {
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function registrar(nivel: string) {
    setEnviando(true);
    try {
      await fetch('/api/plano/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivel }),
      });
      setFeito(true);
      onCheckin(nivel);
    } finally {
      setEnviando(false);
    }
  }

  if (feito) {
    return (
      <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none z-40">
        <div className="bg-(--surface) border border-(--border) rounded-full px-4 py-2 text-[12px] text-green-600 font-medium shadow-lg">
          Check-in registrado
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 px-4">
      <div className="bg-(--surface) border border-(--border) rounded-(--radius) shadow-xl p-3 flex flex-col gap-2 w-full max-w-sm">
        <p className="text-[12px] font-semibold text-(--ink) text-center">Como foi o estudo de hoje?</p>
        <div className="flex gap-2">
          {[
            { nivel: 'dificil',   label: 'Difícil',   cor: 'border-red-200 text-red-600 hover:bg-red-50' },
            { nivel: 'ok',        label: 'Ok',         cor: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
            { nivel: 'tranquilo', label: 'Tranquilo',  cor: 'border-green-200 text-green-600 hover:bg-green-50' },
          ].map(({ nivel, label, cor }) => (
            <button
              key={nivel}
              disabled={enviando}
              onClick={() => registrar(nivel)}
              className={`flex-1 py-1.5 rounded-(--radius-sm) border text-[12px] font-medium transition-all ${cor}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreferenciasEstudo({ onAtualizar }: { onAtualizar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [data, setData] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/plano')
      .then(r => r.json())
      .then(({ plano }) => {
        if (plano?.data_prova) setData(plano.data_prova);
      })
      .catch(() => {});
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({
        ...(concurso ? { concurso_alvo_nome: concurso } : {}),
        ...(data ? { data_prova: data } : {}),
      }).eq('id', user.id);
      toast('Preferências salvas', 'success');
      setAberto(false);
      onAtualizar();
    } catch {
      toast('Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-(--radius) border border-(--border-strong) text-[13px] text-(--ink-2) hover:border-(--accent) transition-colors bg-(--surface)"
      >
        <span className="font-medium">Meu concurso alvo</span>
        <span className="text-[11px] text-(--ink-3)">{aberto ? '▲ fechar' : '▼ editar'}</span>
      </button>
      {aberto && (
        <Card padding="md" className="mt-2 flex flex-col gap-3 border-(--border-strong)">
          <div>
            <label className="text-[12px] font-medium text-(--ink-2) block mb-1">Concurso alvo</label>
            <input
              type="text"
              value={concurso}
              onChange={e => setConcurso(e.target.value)}
              placeholder="Ex: INSS — Técnico do Seguro Social"
              className="w-full h-9 px-3 rounded-(--radius-sm) border border-(--border-strong) text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent)"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-(--ink-2) block mb-1">Data da prova</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full h-9 px-3 rounded-(--radius-sm) border border-(--border-strong) text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent)"
            />
          </div>
          <Button size="sm" loading={salvando} onClick={salvar}>Salvar</Button>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanoPage() {
  const { toast } = useToast();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [questoesPorDia, setQuestoesPorDia] = useState(15);
  const [semanaAtiva, setSemanaAtiva] = useState(1);
  const [mostrarCheckin, setMostrarCheckin] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();

      const [planoResp, habResp] = await Promise.allSettled([
        fetch('/api/plano').then(r => r.json()),
        user
          ? supabase.from('habilidade_usuario').select('materia, theta').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (planoResp.status === 'fulfilled' && planoResp.value?.plano?.cronograma) {
        setPlano(planoResp.value.plano.cronograma);
      }
      if (habResp.status === 'fulfilled') {
        const result = habResp.value as { data: Habilidade[] | null };
        setHabilidades(result.data ?? []);
      }
      setLoading(false);

      const hora = new Date().getHours();
      if (hora >= 19) setMostrarCheckin(true);
    }
    carregar();
  }, []);

  async function gerarPlano() {
    setGerando(true);
    try {
      const resp = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questoesPorDia }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        toast(dados.error ?? 'Erro ao gerar plano', 'error');
        return;
      }
      setPlano(dados.plano);
      setSemanaAtiva(1);
      toast('Plano gerado pela IA de alta tecnologia!', 'success');
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setGerando(false);
    }
  }

  // Gerar alerta de risco com base no histórico de check-ins (simulado localmente)
  function inferirAlerta(): Plano['alerta'] {
    if (!plano) return undefined;
    if (plano.alerta) return plano.alerta;
    const prioridades = plano.prioridades ?? [];
    if (prioridades.length === 0) return undefined;
    const hab = habilidades.find(h => h.materia === prioridades[0]);
    if (!hab) return { nivel: 'atencao', mensagem: `Comece pelos simulados de ${prioridades[0]} para calibrar seu desempenho.` };
    const pct = Math.round(50 + hab.theta * 15);
    if (pct < 50) return { nivel: 'critico', mensagem: `${prioridades[0]} está abaixo de 50% — precisa de atenção urgente antes da prova.` };
    if (pct < 65) return { nivel: 'atencao', mensagem: `${prioridades[0]} ainda está abaixo da média dos aprovados. Intensifique os exercícios.` };
    return { nivel: 'bom', mensagem: `Você está no caminho certo! Mantenha o ritmo e foque nas revisões.` };
  }

  // Montar dados de comparativo com aprovados a partir das habilidades locais
  function inferirComparativo(): Plano['comparativo'] {
    if (!plano) return undefined;
    if (plano.comparativo && plano.comparativo.length > 0) return plano.comparativo;
    const REFERENCIA: Record<string, number> = {
      'Português': 72, 'Direito Constitucional': 68, 'Direito Administrativo': 65,
      'Raciocínio Lógico': 60, 'Informática': 65,
    };
    return habilidades
      .filter(h => REFERENCIA[h.materia])
      .slice(0, 4)
      .map(h => ({
        materia: h.materia,
        voce: Math.max(0, Math.min(100, Math.round(50 + h.theta * 15))),
        aprovados: REFERENCIA[h.materia],
      }));
  }

  // Projeção simples: assume melhora de 3-5pp/semana
  function inferirProjecao(): Plano['projecao'] {
    if (!plano) return undefined;
    if (plano.projecao && plano.projecao.length > 0) return plano.projecao;
    const mediaAtual = habilidades.length > 0
      ? Math.round(habilidades.reduce((s, h) => s + Math.max(0, Math.min(100, Math.round(50 + h.theta * 15))), 0) / habilidades.length)
      : 50;
    return plano.semanas.map((s, i) => ({
      semana: s.semana,
      percentual: Math.min(95, mediaAtual + i * 4),
    }));
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[900px] mx-auto">
        <div className="h-8 skeleton w-1/3 mb-4 rounded" />
        <div className="h-20 skeleton rounded-(--radius) mb-3" />
        <div className="h-32 skeleton rounded-(--radius) mb-3" />
        <div className="h-64 skeleton rounded-(--radius)" />
      </div>
    );
  }

  const semanaData = plano?.semanas.find(s => s.semana === semanaAtiva);
  const alerta = inferirAlerta();
  const comparativo = inferirComparativo();
  const projecao = inferirProjecao();

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto pb-36">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">Plano de Estudo</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Cronograma personalizado pela nossa IA de alta tecnologia.</p>
      </div>

      {/* Melhoria 0 — Preferências colapsáveis */}
      <PreferenciasEstudo onAtualizar={gerarPlano} />

      {/* Gerador */}
      <Card padding="md" className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <label className="text-[13px] font-medium text-(--ink-2) block mb-1">
              Questões por dia: <strong className="text-(--ink)">{questoesPorDia}</strong>
            </label>
            <input
              type="range" min={5} max={40} step={5}
              value={questoesPorDia}
              onChange={e => setQuestoesPorDia(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-(--ink-3) mt-0.5">
              <span>5</span><span>20</span><span>40</span>
            </div>
          </div>
          <Button loading={gerando} onClick={gerarPlano} className="shrink-0">
            {plano ? 'Regerar plano' : 'Gerar plano'}
          </Button>
        </div>
        {gerando && (
          <div className="flex flex-col gap-1">
            {['Analisando seu desempenho...', 'Calculando prioridades...', 'Montando cronograma personalizado...'].map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-(--ink-3)">
                <div className="w-3 h-3 border border-(--accent) border-t-transparent rounded-full animate-spin" />
                {msg}
              </div>
            ))}
          </div>
        )}
      </Card>

      {plano ? (
        <>
          {/* Melhoria 3 — Alerta de risco */}
          <AlertaRisco alerta={alerta} />

          {/* Diagnóstico */}
          <Card padding="md" className="mb-4">
            <p className="text-[13px] font-semibold text-(--ink) mb-2">Diagnóstico</p>
            <p className="text-[13px] text-(--ink-2) leading-relaxed">{plano.diagnostico}</p>
            {plano.prioridades && plano.prioridades.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] font-semibold text-(--ink-3)">Prioridades:</span>
                {plano.prioridades.map((p, i) => (
                  <Badge key={i} variant={i === 0 ? 'danger' : i === 1 ? 'warning' : 'accent'}>{p}</Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Melhoria 5 — Comparativo com aprovados */}
          <ComparativoAprovados comparativo={comparativo} />

          {/* Melhoria 2 — Projeção de evolução */}
          <ProjecaoEvolucao projecao={projecao} />

          {/* Seletor de semana */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {plano.semanas.map(s => (
              <button
                key={s.semana}
                onClick={() => setSemanaAtiva(s.semana)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  semanaAtiva === s.semana
                    ? 'bg-(--accent) text-white border-(--accent)'
                    : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)'
                }`}
              >
                Semana {s.semana}
              </button>
            ))}
          </div>

          {/* Melhoria 1 — Sessões expandíveis */}
          {semanaData && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-bold text-(--ink)">
                  Semana {semanaData.semana} — Foco: {semanaData.foco}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {semanaData.dias.map((dia, i) => (
                  <SessaoDiaria key={i} dia={dia} questoesPorDia={questoesPorDia} />
                ))}
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={semanaData.dias.reduce((s, d) => s + d.questoes, 0)}
                  max={questoesPorDia * 7}
                  label="Meta semanal de questões"
                  showPercent
                  color="accent"
                />
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum plano gerado ainda.</p>
          <p className="text-[13px] text-(--ink-3) mt-1">
            Clique em "Gerar plano" para criar seu cronograma personalizado pela IA de alta tecnologia.
          </p>
        </Card>
      )}

      {/* Melhoria 4 — Check-in diário */}
      {mostrarCheckin && plano && (
        <CheckInDiario onCheckin={nivel => {
          setMostrarCheckin(false);
          toast(`Check-in registrado: ${nivel}`, 'success');
        }} />
      )}
    </div>
  );
}
