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

const MATERIAS_PADRAO = [
  'Direito Administrativo', 'Direito Constitucional', 'Português', 'Raciocínio Lógico',
  'Direito Penal', 'Legislação Específica', 'Informática', 'Matemática Financeira',
];

const TOTAL_QUESTOES = 10;
const NIVEIS = ['', 'Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'];

export default function SimuladoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const editalId = searchParams.get('edital');

  // Estado do simulado
  const [fase, setFase] = useState<'selecao' | 'questao' | 'resultado'>('selecao');
  const [materiaSelecionada, setMateriaSelecionada] = useState('');
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [questoesFeitas, setQuestoesFeitas] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState('');
  const [respondido, setRespondido] = useState(false);
  const [gabaritoResposta, setGabaritoResposta] = useState<{ correta: boolean; gabarito: string; explicacao: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [modalSair, setModalSair] = useState(false);
  const [historico, setHistorico] = useState<Array<{ materia: string; correta: boolean }>>([]);

  // Cronômetro
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

    const resp = await fetch('/api/simulado/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editalId, materia }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      toast(err.error ?? 'Erro ao gerar questão', 'error');
      setLoading(false);
      return;
    }

    const { questao } = await resp.json();
    setQuestaoAtual(questao);
    setLoading(false);
  }, [editalId, toast]);

  function iniciarSimulado(materia: string) {
    setMateriaSelecionada(materia);
    setFase('questao');
    carregarQuestao(materia);
  }

  async function responder() {
    if (!respostaSelecionada || !questaoAtual) return;
    setLoading(true);

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

    const dados = await resp.json();
    setGabaritoResposta(dados);
    setRespondido(true);

    if (dados.correta) setAcertos(a => a + 1);
    setHistorico(h => [...h, { materia: questaoAtual.materia, correta: dados.correta }]);
    setLoading(false);
  }

  function proximaQuestao() {
    const novoTotal = questoesFeitas + 1;
    setQuestoesFeitas(novoTotal);
    if (novoTotal >= TOTAL_QUESTOES) {
      setFase('resultado');
    } else {
      carregarQuestao(materiaSelecionada);
    }
  }

  const formatTempo = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Tela de seleção
  if (fase === 'selecao') {
    return (
      <div className="p-4 md:p-6 max-w-[600px] mx-auto">
        <h1 className="text-[22px] font-bold text-(--ink) mb-2">Novo Simulado</h1>
        <p className="text-[13px] text-(--ink-3) mb-6">Selecione a matéria para iniciar o simulado adaptativo.</p>
        <div className="grid grid-cols-1 gap-2">
          {MATERIAS_PADRAO.map(m => (
            <button
              key={m}
              onClick={() => iniciarSimulado(m)}
              className="text-left px-4 py-3 border border-(--border) rounded-(--radius-sm) hover:border-(--accent) hover:bg-(--accent-light) transition-all text-[14px] font-medium text-(--ink)"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Resultado
  if (fase === 'resultado') {
    const pct = Math.round((acertos / TOTAL_QUESTOES) * 100);
    return (
      <div className="p-4 md:p-6 max-w-[600px] mx-auto flex flex-col gap-6">
        <div className="text-center">
          <div className={`text-[48px] font-black ${pct >= 70 ? 'text-(--teal)' : pct >= 50 ? 'text-(--warning)' : 'text-(--danger)'}`}>
            {pct}%
          </div>
          <p className="text-[16px] font-semibold text-(--ink) mt-1">{acertos} de {TOTAL_QUESTOES} questões</p>
          <p className="text-[13px] text-(--ink-3) mt-1">{materiaSelecionada}</p>
        </div>
        <ProgressBar
          value={acertos}
          max={TOTAL_QUESTOES}
          color={pct >= 70 ? 'teal' : pct >= 50 ? 'warning' : 'danger'}
        />
        <div className="bg-(--surface-2) rounded-(--radius) p-4">
          <p className="text-[13px] font-semibold text-(--ink) mb-2">Diagnóstico</p>
          <p className="text-[13px] text-(--ink-2)">
            {pct >= 70
              ? `Ótimo desempenho em ${materiaSelecionada}. Continue mantendo esse nível.`
              : pct >= 50
              ? `Desempenho médio em ${materiaSelecionada}. Foque nos tópicos errados.`
              : `${materiaSelecionada} requer atenção. Recomendamos revisar os conceitos básicos.`}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => { setFase('selecao'); setQuestoesFeitas(0); setAcertos(0); setHistorico([]); }}>
            Novo simulado
          </Button>
          <Button variant="ghost" onClick={() => router.push('/desempenho')}>
            Ver desempenho completo
          </Button>
          <Button variant="ghost" onClick={() => router.push('/plano')}>
            Ver plano de estudo
          </Button>
        </div>
      </div>
    );
  }

  // Questão
  return (
    <div className="flex flex-col min-h-screen max-w-[700px] mx-auto">
      {/* Topo */}
      <div className="sticky top-0 z-10 bg-(--surface) border-b border-(--border) px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] text-(--ink-3) mb-1">
            <span>Questão {questoesFeitas + 1} de {TOTAL_QUESTOES}</span>
            <span className="font-mono">{formatTempo(tempo)}</span>
          </div>
          <ProgressBar value={questoesFeitas} max={TOTAL_QUESTOES} size="sm" />
        </div>
        <button
          onClick={() => setModalSair(true)}
          className="text-(--ink-3) hover:text-(--danger) text-lg transition-colors"
          title="Sair"
        >
          ×
        </button>
      </div>

      {/* Questão */}
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-5">
        {loading && !questaoAtual ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-(--ink-3)">Gerando questão adaptativa...</p>
            </div>
          </div>
        ) : questaoAtual ? (
          <>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="accent">{questaoAtual.materia}</Badge>
              {questaoAtual.subtopico && <Badge variant="default">{questaoAtual.subtopico}</Badge>}
              <Badge variant="default">{NIVEIS[questaoAtual.nivel] ?? 'Médio'}</Badge>
            </div>

            <p className="text-[15px] text-(--ink) leading-relaxed">{questaoAtual.enunciado}</p>

            <div className="flex flex-col gap-2">
              {questaoAtual.opcoes.map((op) => {
                let estilo = 'border-(--border) text-(--ink-2) hover:border-(--accent) hover:bg-(--accent-light)';
                if (respondido) {
                  if (op.letra === gabaritoResposta?.gabarito) {
                    estilo = 'border-(--teal) bg-(--teal-light) text-(--teal-text) font-semibold';
                  } else if (op.letra === respostaSelecionada && !gabaritoResposta?.correta) {
                    estilo = 'border-(--danger) bg-(--danger-light) text-(--danger)';
                  } else {
                    estilo = 'border-(--border) text-(--ink-3) opacity-60';
                  }
                } else if (op.letra === respostaSelecionada) {
                  estilo = 'border-(--accent) bg-(--accent-light) text-(--accent-text) font-medium';
                }

                return (
                  <button
                    key={op.letra}
                    onClick={() => !respondido && setRespostaSelecionada(op.letra)}
                    disabled={respondido}
                    className={`text-left p-3 rounded-(--radius-sm) border-2 transition-all text-[14px] leading-relaxed ${estilo}`}
                  >
                    <span className="font-bold mr-2">{op.letra}.</span>
                    {op.texto}
                  </button>
                );
              })}
            </div>

            {/* Gabarito */}
            {respondido && gabaritoResposta && (
              <div className={`p-4 rounded-(--radius) border ${gabaritoResposta.correta ? 'border-(--teal) bg-(--teal-light)' : 'border-(--danger) bg-(--danger-light)'}`}>
                <p className={`text-[14px] font-bold mb-2 ${gabaritoResposta.correta ? 'text-(--teal-text)' : 'text-(--danger)'}`}>
                  {gabaritoResposta.correta ? '✓ Você acertou!' : '✕ Resposta incorreta'}
                </p>
                {gabaritoResposta.explicacao && (
                  <p className="text-[13px] text-(--ink-2) leading-relaxed">{gabaritoResposta.explicacao}</p>
                )}
              </div>
            )}

            {/* Ação */}
            {!respondido ? (
              <Button
                disabled={!respostaSelecionada || loading}
                loading={loading}
                onClick={responder}
                className="w-full mt-auto"
              >
                Responder
              </Button>
            ) : (
              <Button onClick={proximaQuestao} className="w-full mt-auto">
                {questoesFeitas + 1 < TOTAL_QUESTOES ? 'Próxima questão' : 'Ver resultado'}
              </Button>
            )}
          </>
        ) : null}
      </div>

      {/* Modal sair */}
      <Modal open={modalSair} onClose={() => setModalSair(false)} title="Sair do simulado?">
        <p className="text-[14px] text-(--ink-2) mb-4">
          Seu progresso neste simulado será perdido. Deseja sair mesmo assim?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setModalSair(false)} className="flex-1">Continuar</Button>
          <Button variant="danger" onClick={() => router.push('/dashboard')} className="flex-1">Sair</Button>
        </div>
      </Modal>
    </div>
  );
}
