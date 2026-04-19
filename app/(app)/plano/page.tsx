'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const FORMATOS = [
  { id: 'video',     icone: '▶',  label: 'Vídeos (YouTube)' },
  { id: 'podcast',   icone: '🎙', label: 'Podcasts' },
  { id: 'livro',     icone: '📚', label: 'Livros e apostilas' },
  { id: 'artigo',    icone: '📄', label: 'Artigos e resumos' },
  { id: 'flashcard', icone: '◇',  label: 'Flashcards' },
  { id: 'exercicio', icone: '✎',  label: 'Exercícios práticos' },
  { id: 'mapa',      icone: '◈',  label: 'Mapas mentais' },
  { id: 'aovivo',    icone: '◎',  label: 'Aulas ao vivo' },
];

// ─── AlertaRisco ──────────────────────────────────────────────────────────────

function AlertaRisco({ alerta }: { alerta: Plano['alerta'] }) {
  if (!alerta) return null;
  const estilos = {
    critico: { bg: 'bg-red-50 border-red-200',     texto: 'text-red-700',   badge: 'CRÍTICO' },
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

// ─── ProjecaoEvolucao ─────────────────────────────────────────────────────────

function ProjecaoEvolucao({ projecao, questoesPorDia }: { projecao: Plano['projecao']; questoesPorDia: number }) {
  if (!projecao || projecao.length < 2) return null;
  const META = 60;
  return (
    <Card padding="md" className="mb-4">
      <p className="text-[13px] font-semibold text-(--ink) mb-3">Projeção de evolução</p>
      <div className="flex flex-col gap-2">
        {projecao.map((p) => {
          const atingeMeta = p.percentual >= META;
          return (
            <div key={p.semana} className="flex items-center gap-3">
              <span className="text-[11px] text-(--ink-3) w-16 shrink-0">Semana {p.semana}</span>
              <div className="flex-1 h-2 bg-(--surface-2) rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atingeMeta ? 'bg-green-500' : 'bg-(--accent)'}`}
                  style={{ width: `${p.percentual}%` }}
                />
              </div>
              <span className={`text-[11px] font-bold w-8 text-right ${atingeMeta ? 'text-green-600' : 'text-(--accent)'}`}>
                {p.percentual}%
              </span>
              {atingeMeta && <span className="text-[9px] text-green-600 font-bold shrink-0">← meta</span>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-(--ink-3) mt-3">
        Projeção com {questoesPorDia} questões/dia. Atualizada conforme seu desempenho real.
      </p>
    </Card>
  );
}

// ─── ComparativoAprovados ─────────────────────────────────────────────────────

function ComparativoAprovados({ comparativo }: { comparativo: Plano['comparativo'] }) {
  if (!comparativo || comparativo.length === 0) return null;
  return (
    <Card padding="md" className="mb-4">
      <p className="text-[13px] font-semibold text-(--ink) mb-1">Onde estão os aprovados</p>
      <p className="text-[11px] text-(--ink-3) mb-3">Desempenho médio de candidatos aprovados nas principais bancas</p>
      <div className="flex flex-col gap-3">
        {comparativo.map((c, i) => (
          <div key={i}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-(--ink-2)">{c.materia}</span>
              <span>
                <span className={`font-bold ${c.voce < c.aprovados ? 'text-red-500' : 'text-green-600'}`}>
                  Você: {c.voce}%
                </span>
                <span className="text-(--ink-3) mx-1">·</span>
                <span className="text-green-600 font-medium">Aprovados: {c.aprovados}%</span>
              </span>
            </div>
            <div className="relative h-2 bg-(--surface-2) rounded-full overflow-hidden">
              <div className="absolute h-full bg-green-200 rounded-full" style={{ width: `${c.aprovados}%` }} />
              <div
                className={`absolute h-full rounded-full ${c.voce < c.aprovados ? 'bg-red-400' : 'bg-green-500'}`}
                style={{ width: `${c.voce}%` }}
              />
            </div>
            {c.voce < c.aprovados && (
              <p className="text-[10px] text-amber-600 mt-0.5">Faltam {c.aprovados - c.voce}pp para a média dos aprovados</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── SessaoDiaria ─────────────────────────────────────────────────────────────

function SessaoDiaria({
  dia,
  questoesPorDia,
  formatos,
  onConcluir,
}: {
  dia: DiaPlano;
  questoesPorDia: number;
  formatos: string[];
  onConcluir: () => void;
}) {
  const [expandida, setExpandida] = useState(false);
  const [buscaSugerida, setBuscaSugerida] = useState<string | null>(null);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [passosConcluidos, setPassosConcluidos] = useState([false, false, false, false]);

  const tempoTotal = 5 + 20 + Math.round(dia.questoes * 1.5) + 5;

  const passos = [
    {
      num: 1,
      label: 'Aquecimento',
      tempo: '5 min',
      desc: 'Releia seus últimos erros nessa matéria antes de começar.',
      link: { label: 'Ver meus erros →', href: `/desempenho?materia=${encodeURIComponent(dia.materia)}` },
    },
    {
      num: 2,
      label: 'Estudo',
      tempo: '20 min',
      desc: buscaSugerida ?? (carregandoBusca ? 'Carregando sugestão...' : 'Busque o tópico no YouTube ou na sua apostila.'),
      link: buscaSugerida
        ? {
            label: 'Buscar →',
            href: `https://www.youtube.com/results?search_query=${encodeURIComponent(buscaSugerida)}`,
            externo: true,
          }
        : null,
    },
    {
      num: 3,
      label: 'Questões',
      tempo: `${Math.round(dia.questoes * 1.5)} min`,
      desc: `${dia.questoes} questões de ${dia.materia}${dia.topico ? ` — ${dia.topico}` : ''}.`,
      link: {
        label: 'Iniciar simulado →',
        href: `/simulado?materia=${encodeURIComponent(dia.materia)}&topico=${encodeURIComponent(dia.topico ?? '')}&quantidade=${dia.questoes}`,
      },
    },
    {
      num: 4,
      label: 'Revisão',
      tempo: '5 min',
      desc: 'Anote os erros. O plano ajusta o nível de amanhã automaticamente.',
      link: null,
    },
  ];

  async function carregarBusca() {
    if (buscaSugerida !== null || carregandoBusca) return;
    setCarregandoBusca(true);
    try {
      const params = new URLSearchParams({ materia: dia.materia, topico: dia.topico ?? '' });
      if (formatos.length > 0) params.set('formatos', formatos.join(', '));
      const r = await fetch(`/api/plano/busca-sugerida?${params}`);
      const { busca } = await r.json();
      setBuscaSugerida(busca ?? `${dia.topico} ${dia.materia} concurso aula`);
    } catch {
      setBuscaSugerida(`${dia.topico} ${dia.materia} concurso aula`);
    } finally {
      setCarregandoBusca(false);
    }
  }

  function togglePasso(i: number) {
    const novo = passosConcluidos.map((v, idx) => idx === i ? !v : v);
    setPassosConcluidos(novo);
    if (novo.every(Boolean)) onConcluir();
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
          <span className="text-[11px] text-(--ink-3)">{tempoTotal} min</span>
          <span className="text-[12px] font-bold text-(--teal)">{dia.questoes}q</span>
          {dia.tipo === 'revisao' && <Badge variant="warning">Revisão</Badge>}
          <span className="text-[10px] text-(--ink-3) ml-1">{expandida ? '▲' : '▼'}</span>
        </div>
      </button>

      {expandida && (
        <div className="border-t border-(--border) p-3 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-(--ink-3)">
            <span>⏱</span>
            <span>Tempo estimado: <strong className="text-(--ink)">{tempoTotal} min</strong></span>
          </div>

          <div className="flex flex-col gap-2">
            {passos.map((passo, i) => (
              <div
                key={passo.num}
                className={`flex gap-3 p-2.5 rounded-(--radius-sm) border transition-all cursor-pointer ${
                  passosConcluidos[i]
                    ? 'bg-green-50 border-green-200'
                    : 'bg-(--surface) border-(--border-strong) hover:border-(--accent)'
                }`}
                onClick={() => togglePasso(i)}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                  passosConcluidos[i] ? 'bg-green-500 text-white' : 'bg-(--accent) text-white'
                }`}>
                  {passosConcluidos[i] ? '✓' : passo.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] font-semibold ${passosConcluidos[i] ? 'text-green-700' : 'text-(--ink)'}`}>
                      {passo.label}
                    </span>
                    <span className="text-[10px] text-(--ink-3) shrink-0">{passo.tempo}</span>
                  </div>
                  <p className="text-[11px] text-(--ink-3) leading-snug mt-0.5">{passo.desc}</p>
                  {passo.link && (
                    <span
                      onClick={e => e.stopPropagation()}
                      className="inline-block mt-1"
                    >
                      {passo.link.externo ? (
                        <a
                          href={passo.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-(--accent) font-semibold hover:underline"
                        >
                          {passo.link.label}
                        </a>
                      ) : (
                        <Link
                          href={passo.link.href}
                          className="text-[11px] text-(--accent) font-semibold hover:underline"
                        >
                          {passo.link.label}
                        </Link>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CheckInDiario ────────────────────────────────────────────────────────────

function CheckInDiario({ onCheckin }: { onCheckin: (nivel: string) => void }) {
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const OPCOES = [
    { nivel: 'dificil',   emoji: '😓', label: 'Difícil',   acao: 'Amanhã será mais leve.',    cor: 'border-red-200 text-red-600 hover:bg-red-50' },
    { nivel: 'ok',        emoji: '😐', label: 'Ok',         acao: 'Mantendo o ritmo.',         cor: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
    { nivel: 'tranquilo', emoji: '😊', label: 'Tranquilo',  acao: 'Aumentando o desafio.',     cor: 'border-green-200 text-green-600 hover:bg-green-50' },
  ];

  async function registrar(opcao: typeof OPCOES[0]) {
    setEnviando(true);
    try {
      await fetch('/api/plano/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivel: opcao.nivel }),
      });
      setFeito(true);
      onCheckin(`${opcao.emoji} ${opcao.acao}`);
    } finally {
      setEnviando(false);
    }
  }

  if (feito) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 px-4">
      <div className="bg-(--surface) border border-(--border) rounded-(--radius) shadow-xl p-4 flex flex-col gap-3 w-full max-w-sm">
        <div>
          <p className="text-[13px] font-bold text-(--ink)">Como foi a sessão de hoje?</p>
          <p className="text-[11px] text-(--ink-3)">Sua resposta ajusta o nível de amanhã.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {OPCOES.map(opcao => (
            <button
              key={opcao.nivel}
              disabled={enviando}
              onClick={() => registrar(opcao)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-(--radius-sm) border text-[11px] font-semibold transition-all disabled:opacity-50 ${opcao.cor}`}
            >
              <span className="text-[20px]">{opcao.emoji}</span>
              {opcao.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PreferenciasEstudo ───────────────────────────────────────────────────────

function PreferenciasEstudo({
  formatosSalvos,
  onAtualizar,
}: {
  formatosSalvos: string[];
  onAtualizar: (formatos: string[]) => void;
}) {
  const [aberto, setAberto] = useState(formatosSalvos.length === 0);
  const [concurso, setConcurso] = useState('');
  const [data, setData] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>(formatosSalvos);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setSelecionados(formatosSalvos); }, [formatosSalvos]);

  function toggleFormato(id: string) {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({
        formatos_preferidos: selecionados,
        ...(concurso ? { concurso_alvo_nome: concurso } : {}),
        ...(data ? { data_prova: data } : {}),
      }).eq('id', user.id);
      toast('Preferências salvas', 'success');
      setAberto(false);
      onAtualizar(selecionados);
    } catch {
      toast('Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  const labelSelecionados = selecionados
    .map(id => FORMATOS.find(f => f.id === id)?.label)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mb-4">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-(--radius) border border-(--border-strong) text-[13px] text-(--ink-2) hover:border-(--accent) transition-colors bg-(--surface)"
      >
        <div className="text-left">
          <span className="font-medium block">Meu estilo de estudo</span>
          {!aberto && labelSelecionados && (
            <span className="text-[11px] text-(--ink-3)">{labelSelecionados}</span>
          )}
        </div>
        <span className="text-[11px] text-(--ink-3) shrink-0 ml-2">{aberto ? '▲ fechar' : '▼ editar'}</span>
      </button>

      {aberto && (
        <Card padding="md" className="mt-2 flex flex-col gap-4 border-(--border-strong)">
          <div>
            <p className="text-[12px] font-semibold text-(--ink) mb-1">Como você prefere estudar?</p>
            <p className="text-[11px] text-(--ink-3) mb-3">Usamos isso para sugerir os melhores recursos em cada sessão.</p>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFormato(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-all ${
                    selecionados.includes(f.id)
                      ? 'bg-(--accent) text-white border-(--accent)'
                      : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)'
                  }`}
                >
                  <span>{f.icone}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
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
          </div>

          <Button size="sm" loading={salvando} onClick={salvar}>Salvar preferências</Button>
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
  const [formatos, setFormatos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [questoesPorDia, setQuestoesPorDia] = useState(15);
  const [semanaAtiva, setSemanaAtiva] = useState(1);
  const [mostrarCheckin, setMostrarCheckin] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();

      const [planoResp, habResp, profileResp] = await Promise.allSettled([
        fetch('/api/plano').then(r => r.json()),
        user
          ? supabase.from('habilidade_usuario').select('materia, theta').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabase.from('profiles').select('formatos_preferidos, questoes_por_dia').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ]);

      if (planoResp.status === 'fulfilled' && planoResp.value?.plano?.cronograma) {
        setPlano(planoResp.value.plano.cronograma);
      }
      if (habResp.status === 'fulfilled') {
        const r = habResp.value as { data: Habilidade[] | null };
        setHabilidades(r.data ?? []);
      }
      if (profileResp.status === 'fulfilled') {
        const r = profileResp.value as { data: { formatos_preferidos?: string[]; questoes_por_dia?: number } | null };
        if (r.data?.formatos_preferidos?.length) setFormatos(r.data.formatos_preferidos);
        if (r.data?.questoes_por_dia) setQuestoesPorDia(r.data.questoes_por_dia);
      }

      setLoading(false);
      if (new Date().getHours() >= 19) setMostrarCheckin(true);
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
      if (!resp.ok) { toast(dados.error ?? 'Erro ao gerar plano', 'error'); return; }
      setPlano(dados.plano);
      setSemanaAtiva(1);
      toast('Plano gerado pela IA de alta tecnologia!', 'success');
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setGerando(false);
    }
  }

  function inferirAlerta(): Plano['alerta'] {
    if (!plano) return undefined;
    if (plano.alerta) return plano.alerta;
    const prio = plano.prioridades?.[0];
    if (!prio) return undefined;
    const hab = habilidades.find(h => h.materia === prio);
    if (!hab) return { nivel: 'atencao', mensagem: `Faça simulados de ${prio} para calibrar seu desempenho inicial.` };
    const pct = Math.round(50 + hab.theta * 15);
    if (pct < 50) return { nivel: 'critico', mensagem: `${prio} está em ${pct}% — abaixo do mínimo para aprovação. Priorize essa matéria agora.` };
    if (pct < 65) return { nivel: 'atencao', mensagem: `${prio} em ${pct}% — abaixo da média dos aprovados. Intensifique os exercícios.` };
    return { nivel: 'bom', mensagem: 'Você está no caminho certo! Mantenha o ritmo e foque nas revisões da última semana.' };
  }

  function inferirComparativo(): Plano['comparativo'] {
    if (!plano) return undefined;
    if (plano.comparativo?.length) return plano.comparativo;
    const REF: Record<string, number> = {
      'Português': 72, 'Direito Constitucional': 68, 'Direito Administrativo': 65,
      'Raciocínio Lógico': 60, 'Informática': 65,
    };
    return habilidades.filter(h => REF[h.materia]).slice(0, 4).map(h => ({
      materia: h.materia,
      voce: Math.max(0, Math.min(100, Math.round(50 + h.theta * 15))),
      aprovados: REF[h.materia],
    }));
  }

  function inferirProjecao(): Plano['projecao'] {
    if (!plano) return undefined;
    if (plano.projecao?.length) return plano.projecao;
    const media = habilidades.length > 0
      ? Math.round(habilidades.reduce((s, h) => s + Math.max(0, Math.min(100, Math.round(50 + h.theta * 15))), 0) / habilidades.length)
      : 50;
    return plano.semanas.map((s, i) => ({ semana: s.semana, percentual: Math.min(95, media + i * 4) }));
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

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto pb-36">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">Plano de Estudo</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Cronograma personalizado pela nossa IA de alta tecnologia.</p>
      </div>

      {/* Melhoria 0 — Preferências + formatos */}
      <PreferenciasEstudo formatosSalvos={formatos} onAtualizar={setFormatos} />

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
          <AlertaRisco alerta={inferirAlerta()} />

          <Card padding="md" className="mb-4">
            <p className="text-[13px] font-semibold text-(--ink) mb-2">Diagnóstico</p>
            <p className="text-[13px] text-(--ink-2) leading-relaxed">{plano.diagnostico}</p>
            {plano.prioridades?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] font-semibold text-(--ink-3)">Prioridades:</span>
                {plano.prioridades.map((p, i) => (
                  <Badge key={i} variant={i === 0 ? 'danger' : i === 1 ? 'warning' : 'accent'}>{p}</Badge>
                ))}
              </div>
            )}
          </Card>

          <ComparativoAprovados comparativo={inferirComparativo()} />
          <ProjecaoEvolucao projecao={inferirProjecao()} questoesPorDia={questoesPorDia} />

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

          {/* Melhoria 1 — Sessões expandíveis com links */}
          {semanaData && (
            <Card padding="md">
              <h2 className="text-[14px] font-bold text-(--ink) mb-4">
                Semana {semanaData.semana} — Foco: {semanaData.foco}
              </h2>
              <div className="flex flex-col gap-2">
                {semanaData.dias.map((dia, i) => (
                  <SessaoDiaria
                    key={i}
                    dia={dia}
                    questoesPorDia={questoesPorDia}
                    formatos={formatos}
                    onConcluir={() => setMostrarCheckin(true)}
                  />
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
            Clique em "Gerar plano" para criar seu cronograma personalizado.
          </p>
        </Card>
      )}

      {/* Melhoria 4 — Check-in diário */}
      {mostrarCheckin && plano && (
        <CheckInDiario onCheckin={msg => {
          setMostrarCheckin(false);
          toast(msg, 'success');
        }} />
      )}
    </div>
  );
}
