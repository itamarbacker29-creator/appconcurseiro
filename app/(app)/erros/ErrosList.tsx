'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Opcao { letra: string; texto: string; }

export interface ErroItem {
  resposta_dada: string | null;
  respondida_em: string;
  questoes: {
    id: string;
    enunciado: string;
    opcoes: Opcao[];
    gabarito: string;
    materia: string;
    subtopico: string | null;
  } | null;
}

interface Props {
  materia: string;
  respostas: ErroItem[];
}

export function ErrosList({ materia, respostas }: Props) {
  const { toast } = useToast();
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [salvos, setSalvos] = useState<Set<string>>(new Set());

  async function criarFlashcard(q: NonNullable<ErroItem['questoes']>, respostaDada: string | null) {
    if (salvos.has(q.id)) return;
    setSalvando(prev => ({ ...prev, [q.id]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const opcaoCorreta = q.opcoes.find(o => o.letra.toUpperCase() === q.gabarito.toUpperCase());
      const opcaoErrada  = q.opcoes.find(o => o.letra.toUpperCase() === respostaDada?.toUpperCase());

      const frente = q.enunciado.length > 300
        ? q.enunciado.slice(0, 297) + '...'
        : q.enunciado;

      const verso = opcaoCorreta
        ? `✓ ${q.gabarito}) ${opcaoCorreta.texto}${opcaoErrada ? `\n\n✗ Você respondeu: ${respostaDada}) ${opcaoErrada.texto}` : ''}`
        : `Gabarito: ${q.gabarito}`;

      const { error } = await supabase.from('flashcards').insert({
        user_id: user.id,
        frente,
        verso: verso.slice(0, 500),
        materia: q.materia,
        origem: 'pdf',
      });

      if (error) throw error;
      setSalvos(prev => new Set([...prev, q.id]));
      toast('Flashcard criado!', 'success');
    } catch {
      toast('Erro ao criar flashcard.', 'error');
    } finally {
      setSalvando(prev => ({ ...prev, [q.id]: false }));
    }
  }

  const validas = respostas.filter(r => r.questoes !== null);

  return (
    <div className="p-4 md:p-6 max-w-[860px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/desempenho" className="text-(--ink-3) hover:text-(--ink) transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-(--ink)">Meus erros — {materia}</h1>
          <p className="text-[12px] text-(--ink-3) mt-0.5">
            {validas.length === 0
              ? 'Nenhum erro registrado nessa matéria.'
              : `${validas.length} questão${validas.length !== 1 ? 'ões' : ''} errada${validas.length !== 1 ? 's' : ''} — clique para criar flashcard`}
          </p>
        </div>
      </div>

      {validas.length === 0 ? (
        <Card padding="lg" className="text-center">
          <span className="material-symbols-outlined text-(--teal)" style={{ fontSize: 48 }}>check_circle</span>
          <p className="text-[15px] font-semibold text-(--ink-2) mt-3">Nenhum erro em {materia}!</p>
          <p className="text-[13px] text-(--ink-3) mt-1">Continue fazendo simulados para monitorar seu desempenho.</p>
          <Link href="/simulado" className="inline-block mt-4">
            <Button size="sm">Fazer simulado</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {validas.map((r, i) => {
            const q = r.questoes!;
            const jaFlashcard = salvos.has(q.id);
            return (
              <Card key={`${q.id}-${i}`} padding="md" className="flex flex-col gap-3">
                {/* Header da questão */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.subtopico && (
                      <span className="text-[10px] font-semibold text-(--accent) bg-(--accent-light) px-2 py-0.5 rounded-full">
                        {q.subtopico}
                      </span>
                    )}
                    <span className="text-[10px] text-(--ink-3)">
                      {new Date(r.respondida_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <button
                    onClick={() => criarFlashcard(q, r.resposta_dada)}
                    disabled={jaFlashcard || salvando[q.id]}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-all ${
                      jaFlashcard
                        ? 'bg-(--teal-light) text-(--teal) cursor-default'
                        : 'bg-(--accent-light) text-(--accent) hover:bg-(--accent) hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      {jaFlashcard ? 'check' : 'add_card'}
                    </span>
                    {jaFlashcard ? 'Flashcard salvo' : 'Criar flashcard'}
                  </button>
                </div>

                {/* Enunciado */}
                <p className="text-[13px] text-(--ink) leading-relaxed whitespace-pre-wrap">{q.enunciado}</p>

                {/* Opções */}
                <div className="flex flex-col gap-1.5 mt-1">
                  {q.opcoes.map(op => {
                    const isCorreta  = op.letra.toUpperCase() === q.gabarito.toUpperCase();
                    const isErrada   = op.letra.toUpperCase() === r.resposta_dada?.toUpperCase();
                    return (
                      <div
                        key={op.letra}
                        className={`flex items-start gap-2 p-2 rounded-sm text-[12px] ${
                          isCorreta
                            ? 'bg-[color-mix(in_srgb,var(--teal)_10%,transparent)] border border-(--teal)'
                            : isErrada
                            ? 'bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-(--danger)'
                            : 'border border-(--border)'
                        }`}
                      >
                        <span className={`font-bold shrink-0 w-4 ${isCorreta ? 'text-(--teal)' : isErrada ? 'text-(--danger)' : 'text-(--ink-3)'}`}>
                          {op.letra})
                        </span>
                        <span className={isCorreta ? 'text-(--teal) font-medium' : isErrada ? 'text-(--danger)' : 'text-(--ink-2)'}>
                          {op.texto}
                        </span>
                        {isCorreta && (
                          <span className="material-symbols-outlined text-(--teal) ml-auto shrink-0" style={{ fontSize: 14 }}>check_circle</span>
                        )}
                        {isErrada && !isCorreta && (
                          <span className="material-symbols-outlined text-(--danger) ml-auto shrink-0" style={{ fontSize: 14 }}>cancel</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          <div className="pt-2 pb-6 flex justify-center">
            <Link href="/flashcards" className="text-[12px] text-(--accent) hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>style</span>
              Ver todos os flashcards →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
