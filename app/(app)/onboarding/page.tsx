'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';

const AREAS = ['Federal', 'Estadual', 'Municipal', 'Segurança', 'Tributário', 'Saúde', 'Educação', 'Judiciário'];
const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO','Nacional'];

type Escolaridade = 'fundamental' | 'medio' | 'superior';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [passo, setPasso] = useState(1);
  const [loading, setLoading] = useState(false);

  const [escolaridade, setEscolaridade] = useState<Escolaridade | ''>('');
  const [areas, setAreas] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [concurso, setConcurso] = useState('');
  const [dataProva, setDataProva] = useState('');

  function toggleArr<T>(arr: T[], val: T, set: (a: T[]) => void) {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  }

  async function finalizar() {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escolaridade,
          areas_interesse: areas,
          estados_interesse: estados,
          data_prova: dataProva || null,
          concurso_alvo_nome: concurso || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar');
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar perfil';
      toast(msg, 'error');
      setLoading(false);
    }
  }

  const total = 4;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-(--surface-2)">
      <div className="w-full max-w-[520px] flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-(--ink-3) uppercase tracking-wide">
              Passo {passo} de {total}
            </span>
            <span className="text-[12px] text-(--ink-3)">{Math.round((passo / total) * 100)}%</span>
          </div>
          <ProgressBar value={passo} max={total} color="accent" />
        </div>

        {/* Card do passo */}
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-6 flex flex-col gap-6">

          {/* Passo 1: Escolaridade */}
          {passo === 1 && (
            <>
              <div>
                <h2 className="text-[20px] font-bold text-(--ink)">Qual é seu grau de escolaridade?</h2>
                <p className="text-[13px] text-(--ink-3) mt-1">Usamos isso para filtrar editais compatíveis com você.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {([
                  { id: 'fundamental', label: 'Ensino Fundamental', desc: 'Concursos de nível fundamental' },
                  { id: 'medio', label: 'Ensino Médio', desc: 'Cargos técnicos e administrativos' },
                  { id: 'superior', label: 'Ensino Superior', desc: 'Analistas, auditores e especialistas' },
                ] as { id: Escolaridade; label: string; desc: string }[]).map(op => (
                  <button
                    key={op.id}
                    onClick={() => setEscolaridade(op.id)}
                    className={[
                      'text-left p-4 rounded-(--radius-sm) border-2 transition-all',
                      escolaridade === op.id
                        ? 'border-(--accent) bg-(--accent-light)'
                        : 'border-(--border) hover:border-(--border-strong)',
                    ].join(' ')}
                  >
                    <p className="text-[14px] font-semibold text-(--ink)">{op.label}</p>
                    <p className="text-[12px] text-(--ink-3) mt-0.5">{op.desc}</p>
                  </button>
                ))}
              </div>
              <Button disabled={!escolaridade} onClick={() => setPasso(2)} className="w-full">
                Continuar
              </Button>
            </>
          )}

          {/* Passo 2: Áreas */}
          {passo === 2 && (
            <>
              <div>
                <h2 className="text-[20px] font-bold text-(--ink)">Quais áreas te interessam?</h2>
                <p className="text-[13px] text-(--ink-3) mt-1">Selecione todas que se aplicam.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleArr(areas, a, setAreas)}
                    className={[
                      'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                      areas.includes(a)
                        ? 'bg-(--accent) text-white border-(--accent)'
                        : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)',
                    ].join(' ')}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="ghost" onClick={() => setPasso(1)} className="flex-1">Voltar</Button>
                <Button disabled={areas.length === 0} onClick={() => setPasso(3)} className="flex-1">Continuar</Button>
              </div>
            </>
          )}

          {/* Passo 3: Estados */}
          {passo === 3 && (
            <>
              <div>
                <h2 className="text-[20px] font-bold text-(--ink)">Em quais estados você prefere concursos?</h2>
                <p className="text-[13px] text-(--ink-3) mt-1">Selecione um ou mais, incluindo "Nacional" para concursos federais.</p>
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {ESTADOS.map(e => (
                  <button
                    key={e}
                    onClick={() => toggleArr(estados, e, setEstados)}
                    className={[
                      'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                      estados.includes(e)
                        ? 'bg-(--accent) text-white border-(--accent)'
                        : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)',
                    ].join(' ')}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setPasso(2)} className="flex-1">Voltar</Button>
                <Button disabled={estados.length === 0} onClick={() => setPasso(4)} className="flex-1">Continuar</Button>
              </div>
            </>
          )}

          {/* Passo 4: Concurso alvo + push */}
          {passo === 4 && (
            <>
              <div>
                <h2 className="text-[20px] font-bold text-(--ink)">Tem algum concurso em mente?</h2>
                <p className="text-[13px] text-(--ink-3) mt-1">Opcional — pode preencher depois.</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-(--ink-2)">Concurso alvo (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Receita Federal — Auditor Fiscal"
                    value={concurso}
                    onChange={e => setConcurso(e.target.value)}
                    className="h-10 rounded-(--radius-sm) border border-(--border-strong) px-3 text-[14px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-(--ink-2)">Data da prova (opcional)</label>
                  <input
                    type="date"
                    value={dataProva}
                    onChange={e => setDataProva(e.target.value)}
                    className="h-10 rounded-(--radius-sm) border border-(--border-strong) px-3 text-[14px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setPasso(3)} className="flex-1">Voltar</Button>
                <Button loading={loading} onClick={finalizar} className="flex-1">
                  Ir para o Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
