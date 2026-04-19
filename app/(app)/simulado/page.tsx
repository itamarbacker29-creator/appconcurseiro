'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Opcao { letra: string; texto: string; }
interface Questao {
  id: string;
  enunciado: string;
  opcoes: Opcao[];
  materia: string;
  subtopico?: string;
  nivel: number;
}

const MATERIAS: { nome: string; icon: string }[] = [
  { nome: 'Direito Administrativo', icon: 'gavel' },
  { nome: 'Direito Constitucional', icon: 'account_balance' },
  { nome: 'Português', icon: 'menu_book' },
  { nome: 'Raciocínio Lógico', icon: 'psychology' },
  { nome: 'Direito Penal', icon: 'security' },
  { nome: 'Legislação Específica', icon: 'description' },
  { nome: 'Informática', icon: 'computer' },
  { nome: 'Matemática Financeira', icon: 'calculate' },
];

const totalQuestoes_PADRAO = 10;
const NIVEIS = ['', 'Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'];
const LIMITE_FREE = 5;

export default function SimuladoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const editalId     = searchParams.get('edital');
  const materiaParam = searchParams.get('materia');
  const quantParam   = searchParams.get('quantidade');

  const [fase, setFase] = useState<'selecao' | 'questao' | 'resultado'>('selecao');
  const [plano, setPlano] = useState<string>('free');
  const [simuladosMes, setSimuladosMes] = useState(0);
  const [materiaSelecionada, setMateriaSelecionada] = useState('');
  const totalQuestoes = quantParam ? Math.min(40, Math.max(5, Number(quantParam))) : totalQuestoes_PADRAO;
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [questoesFeitas, setQuestoesFeitas] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState('');
  const [respondido, setRespondido] = useState(false);
  const [gabaritoResposta, setGabaritoResposta] = useState<{ correta: boolean; gabarito: string; explicacao: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [tempoTotal, setTempoTotal] = useState(0);
  const [modalSair, setModalSair] = useState(false);
  const [historico, setHistorico] = useState<Array<{ materia: string; correta: boolean }>>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      Promise.all([
        supabase.from('profiles').select('plano').eq('id', user.id).single(),
        supabase.from('respostas').select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('respondida_em', inicioMes.toISOString()),
      ]).then(([planoRes, respostasRes]) => {
        setPlano(planoRes.data?.plano ?? 'free');
        setSimuladosMes(Math.floor((respostasRes.count ?? 0) / 10));
      });
    });
  }, []);

  // Auto-iniciar se veio com ?materia= do plano de estudos
  useEffect(() => {
    if (materiaParam && fase === 'selecao') {
      iniciarSimulado(materiaParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaParam]);

  useEffect(() => {
    if (fase !== 'questao') return;
    const interval = setInterval(() => setTempo(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [fase, questaoAtual]);

  const carregarQuestao = useCallback(async (materia: string) => {
    setLoading(true);
    setRespostaSelecionada('');
    setRespondido(false);
    setGabaritoResposta(null);
    setTempo(0);
    try {
      const resp = await fetch('/api/simulado/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editalId, materia }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        toast(err.error ?? 'Erro ao gerar questão', 'error');
        setFase('selecao');
        return;
      }
      const { questao } = await resp.json();
      setQuestaoAtual(questao);
    } catch {
      toast('Erro de conexão. Verifique sua internet.', 'error');
      setFase('selecao');
    } finally {
      setLoading(false);
    }
  }, [editalId, toast]);

  function iniciarSimulado(materia: string) {
    setMateriaSelecionada(materia);
    setFase('questao');
    carregarQuestao(materia);
  }

  async function responder() {
    if (!respostaSelecionada || !questaoAtual) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/simulado/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questaoId: questaoAtual.id,
          editalId,
          respostaDada: respostaSelecionada,
          tempoSegundos: tempo,
        }),
      });
      if (!resp.ok) { toast('Erro ao registrar resposta. Tente novamente.', 'error'); return; }
      const dados = await resp.json();
      setGabaritoResposta(dados);
      setRespondido(true);
      if (dados.correta) setAcertos(a => a + 1);
      setHistorico(h => [...h, { materia: questaoAtual.materia, correta: dados.correta }]);
    } catch {
      toast('Erro de conexão. Verifique sua internet.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function proximaQuestao() {
    setTempoTotal(t => t + tempo);
    const novoTotal = questoesFeitas + 1;
    setQuestoesFeitas(novoTotal);
    if (novoTotal >= totalQuestoes) setFase('resultado');
    else carregarQuestao(materiaSelecionada);
  }

  const formatTempo = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Seleção de matéria ────────────────────────────────────────────────────
  if (fase === 'selecao') {
    const limiteAtingido = plano === 'free' && simuladosMes >= LIMITE_FREE;
    return (
      <div className="p-4 md:p-6 max-w-[680px] mx-auto">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-(--ink)">Simulado adaptativo</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">
            {editalId ? 'Questões personalizadas para o seu edital.' : 'Selecione a matéria para começar.'}
          </p>
        </div>

        {plano === 'free' && (
          <div className="mb-5 flex items-center gap-3 bg-(--surface-2) border border-(--border) rounded-(--radius) px-4 py-3">
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-(--ink-2) mb-1">Simulados este mês</p>
              <ProgressBar value={simuladosMes} max={LIMITE_FREE} size="sm" color={simuladosMes >= LIMITE_FREE ? 'danger' : 'accent'} />
            </div>
            <span className={`text-[13px] font-bold shrink-0 ${simuladosMes >= LIMITE_FREE ? 'text-(--danger)' : 'text-(--ink)'}`}>
              {simuladosMes}/{LIMITE_FREE}
            </span>
          </div>
        )}

        {limiteAtingido ? (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-(--warning)/15 flex items-center justify-center">
              <span className="material-symbols-outlined filled text-(--warning)" style={{ fontSize: 32 }}>lock</span>
            </div>
            <div>
              <p className="text-[17px] font-bold text-(--ink)">Limite mensal atingido</p>
              <p className="text-[13px] text-(--ink-3) mt-1.5 max-w-[280px] mx-auto">
                O plano Free inclui <strong>5 simulados por mês</strong>. Faça upgrade para continuar treinando sem limites.
              </p>
            </div>
            <a href="/conta#plano">
              <Button>Ver planos Premium</Button>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {MATERIAS.map(m => (
              <button
                key={m.nome}
                onClick={() => iniciarSimulado(m.nome)}
                className="flex flex-col items-start gap-3 p-4 bg-(--surface) border border-(--border) rounded-(--radius) hover:border-(--accent) hover:bg-(--accent-light) transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-(--surface-2) group-hover:bg-(--accent)/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-(--ink-3) group-hover:text-(--accent) transition-colors" style={{ fontSize: 20 }}>
                    {m.icon}
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-(--ink) leading-tight">{m.nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Resultado ─────────────────────────────────────────────────────────────
  if (fase === 'resultado') {
    const pct = Math.round((acertos / totalQuestoes) * 100);
    const corScore = pct >= 70 ? 'var(--teal)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const msgScore = pct >= 70 ? 'Ótimo desempenho!' : pct >= 50 ? 'Desempenho médio' : 'Precisa melhorar';
    // SVG circle progress
    const r = 44;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
      <div className="p-4 md:p-6 max-w-[500px] mx-auto flex flex-col gap-6">
        {/* Score circular */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="64" cy="64" r={r} fill="none"
                stroke={corScore} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-black text-(--ink)">{pct}%</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[18px] font-bold text-(--ink)">{msgScore}</p>
            <p className="text-[13px] text-(--ink-3) mt-0.5">{acertos} de {totalQuestoes} corretas em {materiaSelecionada}</p>
            <p className="text-[12px] text-(--ink-3) mt-1">Tempo total: {formatTempo(tempoTotal + tempo)}</p>
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="bg-(--surface-2) rounded-(--radius) p-4 border border-(--border)">
          <p className="text-[12px] font-semibold text-(--ink-3) uppercase tracking-wide mb-1">Diagnóstico</p>
          <p className="text-[14px] text-(--ink-2) leading-relaxed">
            {pct >= 70
              ? `Excelente desempenho em ${materiaSelecionada}. Continue mantendo esse ritmo de estudo.`
              : pct >= 50
              ? `Desempenho médio em ${materiaSelecionada}. Revise os tópicos onde errou.`
              : `${materiaSelecionada} requer atenção prioritária. Recomendamos revisar os conceitos fundamentais.`}
          </p>
        </div>

        {/* Histórico das questões */}
        {historico.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {historico.map((h, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${h.correta ? 'bg-(--teal-light) text-(--teal-text)' : 'bg-(--danger-light) text-(--danger)'}`}
                title={`Q${i + 1}: ${h.correta ? 'Certa' : 'Errada'}`}
              >
                {h.correta ? '✓' : '✕'}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={() => { setFase('selecao'); setQuestoesFeitas(0); setAcertos(0); setHistorico([]); }}>
            Novo simulado
          </Button>
          <Button variant="ghost" onClick={() => router.push('/desempenho')}>Ver desempenho completo</Button>
          <Button variant="ghost" onClick={() => router.push('/plano')}>Ver plano de estudo</Button>
        </div>
      </div>
    );
  }

  // ─── Questão ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen max-w-[700px] mx-auto">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-(--surface) border-b border-(--border) px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-(--ink-3) mb-1.5">
              <span className="font-medium">Questão {questoesFeitas + 1} de {totalQuestoes}</span>
              <span className="font-mono tabular-nums">{formatTempo(tempo)}</span>
            </div>
            <ProgressBar value={questoesFeitas} max={totalQuestoes} size="sm" />
          </div>
          <button
            onClick={() => setModalSair(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-(--ink-3) hover:bg-(--surface-2) hover:text-(--danger) transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-5">
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-(--surface-2) rounded-full" />
              <div className="h-6 w-20 bg-(--surface-2) rounded-full" />
            </div>
            <div className="bg-(--surface-2) rounded-(--radius) p-4 flex flex-col gap-2">
              <div className="h-4 w-full bg-(--border) rounded" />
              <div className="h-4 w-4/5 bg-(--border) rounded" />
              <div className="h-4 w-3/5 bg-(--border) rounded" />
            </div>
            <div className="flex flex-col gap-2">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-(--surface-2) rounded-(--radius) border border-(--border)" />
              ))}
            </div>
            <p className="text-[13px] text-(--ink-3) text-center mt-2">Gerando questão adaptativa...</p>
          </div>
        ) : questaoAtual ? (
          <>
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="accent">{questaoAtual.materia}</Badge>
              {questaoAtual.subtopico && <Badge variant="default">{questaoAtual.subtopico}</Badge>}
              <Badge variant="default">{NIVEIS[questaoAtual.nivel] ?? 'Médio'}</Badge>
            </div>

            {/* Enunciado */}
            <div className="bg-(--surface-2) rounded-(--radius) p-4 border border-(--border)">
              <p className="text-[15px] text-(--ink) leading-relaxed">{questaoAtual.enunciado}</p>
            </div>

            {/* Opções */}
            <div className="flex flex-col gap-2">
              {questaoAtual.opcoes.map((op) => {
                let cls = 'border-(--border) text-(--ink-2) hover:border-(--accent) hover:bg-(--accent-light)';
                if (respondido) {
                  if (op.letra === gabaritoResposta?.gabarito) {
                    cls = 'border-(--teal) bg-(--teal-light) text-(--teal-text) font-semibold';
                  } else if (op.letra === respostaSelecionada && !gabaritoResposta?.correta) {
                    cls = 'border-(--danger) bg-(--danger-light) text-(--danger)';
                  } else {
                    cls = 'border-(--border) text-(--ink-3) opacity-50';
                  }
                } else if (op.letra === respostaSelecionada) {
                  cls = 'border-(--accent) bg-(--accent-light) text-(--accent-text) font-medium';
                }
                return (
                  <button
                    key={op.letra}
                    onClick={() => !respondido && setRespostaSelecionada(op.letra)}
                    disabled={respondido}
                    className={`text-left p-3.5 rounded-(--radius) border-2 transition-all text-[14px] leading-relaxed flex gap-3 items-start ${cls}`}
                  >
                    <span className="font-bold shrink-0 w-5">{op.letra}.</span>
                    <span>{op.texto}</span>
                  </button>
                );
              })}
            </div>

            {/* Gabarito */}
            {respondido && gabaritoResposta && (
              <div className={`p-4 rounded-(--radius) border-l-4 ${gabaritoResposta.correta ? 'border-l-(--teal) bg-(--teal-light)' : 'border-l-(--danger) bg-(--danger-light)'}`}>
                <p className={`text-[14px] font-bold mb-1.5 flex items-center gap-1.5 ${gabaritoResposta.correta ? 'text-(--teal-text)' : 'text-(--danger)'}`}>
                  <span className="material-symbols-outlined filled" style={{ fontSize: 18 }}>
                    {gabaritoResposta.correta ? 'check_circle' : 'cancel'}
                  </span>
                  {gabaritoResposta.correta ? 'Você acertou!' : 'Resposta incorreta'}
                </p>
                {gabaritoResposta.explicacao && (
                  <p className="text-[13px] text-(--ink-2) leading-relaxed">{gabaritoResposta.explicacao}</p>
                )}
              </div>
            )}

            {/* CTA */}
            {!respondido ? (
              <Button disabled={!respostaSelecionada || loading} loading={loading} onClick={responder} className="w-full mt-auto">
                Confirmar resposta
              </Button>
            ) : (
              <Button onClick={proximaQuestao} className="w-full mt-auto">
                {questoesFeitas + 1 < totalQuestoes ? 'Próxima questão →' : 'Ver resultado'}
              </Button>
            )}
          </>
        ) : null}
      </div>

      <Modal open={modalSair} onClose={() => setModalSair(false)} title="Sair do simulado?">
        <p className="text-[14px] text-(--ink-2) mb-4">Seu progresso neste simulado será perdido.</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setModalSair(false)} className="flex-1">Continuar</Button>
          <Button variant="danger" onClick={() => router.push('/dashboard')} className="flex-1">Sair</Button>
        </div>
      </Modal>
    </div>
  );
}
