'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';

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
}

const DIAS_PT: Record<string, string> = {
  Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua', Quinta: 'Qui',
  Sexta: 'Sex', Sábado: 'Sáb', Domingo: 'Dom',
};

export default function PlanoPage() {
  const { toast } = useToast();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [questoesPorDia, setQuestoesPorDia] = useState(15);
  const [semanaAtiva, setSemanaAtiva] = useState(1);

  useEffect(() => {
    fetch('/api/plano')
      .then(r => r.json())
      .then(({ plano }) => { if (plano?.cronograma) setPlano(plano.cronograma); })
      .finally(() => setLoading(false));
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
      toast('Plano de estudo gerado!', 'success');
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setGerando(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[900px] mx-auto">
        <div className="h-8 skeleton w-1/3 mb-4 rounded" />
        <div className="h-32 skeleton rounded-(--radius) mb-3" />
        <div className="h-64 skeleton rounded-(--radius)" />
      </div>
    );
  }

  const semanaData = plano?.semanas.find(s => s.semana === semanaAtiva);

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">Plano de Estudo</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Cronograma gerado por IA com base no seu desempenho.</p>
      </div>

      {/* Gerador */}
      <Card padding="md" className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <label className="text-[13px] font-medium text-(--ink-2) block mb-1">
              Questões por dia: <strong className="text-(--ink)">{questoesPorDia}</strong>
            </label>
            <input
              type="range"
              min={5}
              max={40}
              step={5}
              value={questoesPorDia}
              onChange={e => setQuestoesPorDia(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-(--ink-3) mt-0.5">
              <span>5</span><span>20</span><span>40</span>
            </div>
          </div>
          <Button loading={gerando} onClick={gerarPlano} className="shrink-0">
            {plano ? 'Regerar plano com IA' : 'Gerar plano com IA'}
          </Button>
        </div>
        {gerando && (
          <div className="flex flex-col gap-1">
            {['Analisando seu desempenho...', 'Calculando prioridades...', 'Montando cronograma...'].map((msg, i) => (
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

          {/* Dica da semana */}
          {plano.dica_semana && (
            <Card padding="md" className="mb-4 border-(--accent)/20 bg-(--accent-light)">
              <p className="text-[11px] font-semibold text-(--accent-text) uppercase tracking-wide mb-1">Dica da semana</p>
              <p className="text-[13px] text-(--ink-2)">{plano.dica_semana}</p>
            </Card>
          )}

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

          {/* Calendário da semana */}
          {semanaData && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-bold text-(--ink)">
                  Semana {semanaData.semana} — Foco: {semanaData.foco}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {semanaData.dias.map((dia, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-(--surface-2) rounded-(--radius-sm)">
                    <div className="w-10 text-center shrink-0">
                      <span className="text-[11px] font-bold text-(--accent)">{DIAS_PT[dia.dia] ?? dia.dia}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-(--ink) truncate">{dia.materia}</p>
                      {dia.topico && <p className="text-[11px] text-(--ink-3) truncate">{dia.topico}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[12px] font-bold text-(--teal)">{dia.questoes}q</span>
                      {dia.tipo === 'revisao' && <Badge variant="warning">Revisão</Badge>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={semanaData.dias.reduce((s, d) => s + d.questoes, 0)}
                  max={questoesPorDia * 7}
                  label="Meta semanal"
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
          <p className="text-[13px] text-(--ink-3) mt-1">Clique em "Gerar plano com IA" para criar seu cronograma personalizado.</p>
        </Card>
      )}
    </div>
  );
}
