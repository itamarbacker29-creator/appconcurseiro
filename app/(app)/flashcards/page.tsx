'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  materia: string | null;
  origem: string | null;
  proxima_revisao: string;
  criado_em: string;
}

function formatOrigem(o: string | null) {
  if (o === 'pdf') return 'Apostila';
  if (o === 'simulado') return 'Simulado';
  return 'Manual';
}

export default function FlashcardsPage() {
  const { toast } = useToast();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMateria, setFiltroMateria] = useState('');
  const [virados, setVirados] = useState<Set<string>>(new Set());

  // Modal adicionar
  const [modalAberto, setModalAberto] = useState(false);
  const [novaFrente, setNovaFrente] = useState('');
  const [novaVerso, setNovaVerso] = useState('');
  const [novaMateria, setNovaMateria] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Modo revisão
  const [revisao, setRevisao] = useState(false);
  const [indice, setIndice] = useState(0);
  const [mostrarVerso, setMostrarVerso] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('flashcards')
      .select('id, frente, verso, materia, origem, proxima_revisao, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false });
    setFlashcards(data ?? []);
    setLoading(false);
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);
    if (error) { toast('Erro ao excluir.', 'error'); return; }
    setFlashcards(prev => prev.filter(f => f.id !== id));
    setVirados(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast('Flashcard removido.', 'success');
  }

  function toggleVirar(id: string) {
    setVirados(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function avaliarRevisao(acertou: boolean) {
    const card = filt[indice];
    if (!card) return;

    const { data: cur } = await supabase
      .from('flashcards')
      .select('ease_factor, intervalo_dias, total_revisoes')
      .eq('id', card.id)
      .single();

    const ef = cur?.ease_factor ?? 2.5;
    const intervalo = cur?.intervalo_dias ?? 0;
    const total = (cur?.total_revisoes ?? 0) + 1;

    let novoEf = ef;
    let novoIntervalo: number;

    if (acertou) {
      novoEf = Math.max(1.3, ef + 0.1);
      novoIntervalo = intervalo <= 0 ? 1 : intervalo <= 1 ? 3 : Math.round(intervalo * novoEf);
    } else {
      novoEf = Math.max(1.3, ef - 0.2);
      novoIntervalo = 0;
    }

    const proxima = new Date();
    proxima.setDate(proxima.getDate() + novoIntervalo);

    await supabase.from('flashcards').update({
      ease_factor: novoEf,
      intervalo_dias: novoIntervalo,
      proxima_revisao: proxima.toISOString().split('T')[0],
      total_revisoes: total,
    }).eq('id', card.id);

    setMostrarVerso(false);
    if (indice < filt.length - 1) {
      setIndice(i => i + 1);
    } else {
      setRevisao(false);
      setIndice(0);
      toast('Revisão concluída!', 'success');
      carregar();
    }
  }

  async function salvarNovoFlashcard() {
    if (!novaFrente.trim() || !novaVerso.trim()) {
      toast('Preencha a pergunta e a resposta.', 'error');
      return;
    }
    setSalvandoNovo(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSalvandoNovo(false); return; }
    const { error } = await supabase.from('flashcards').insert({
      user_id: user.id,
      frente: novaFrente.trim(),
      verso: novaVerso.trim(),
      materia: novaMateria.trim() || null,
      origem: 'manual',
      proxima_revisao: new Date().toISOString().split('T')[0],
    });
    if (error) { toast('Erro ao salvar flashcard.', 'error'); }
    else {
      toast('Flashcard criado!', 'success');
      setNovaFrente(''); setNovaVerso(''); setNovaMateria('');
      setModalAberto(false);
      carregar();
    }
    setSalvandoNovo(false);
  }

  const materias = Array.from(new Set(flashcards.map(f => f.materia).filter(Boolean))) as string[];
  const filt = filtroMateria
    ? flashcards.filter(f => f.materia === filtroMateria)
    : flashcards;

  const hoje = new Date().toISOString().split('T')[0];
  const paraRevisar = flashcards.filter(f => f.proxima_revisao <= hoje).length;

  // ── Modo revisão ──────────────────────────────────────
  if (revisao) {
    const card = filt[indice];
    if (!card) return null;
    return (
      <div className="p-4 md:p-6 max-w-[520px] mx-auto min-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setRevisao(false); setIndice(0); setMostrarVerso(false); }}
            className="flex items-center gap-1.5 text-[13px] text-(--ink-3) hover:text-(--ink) transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Sair da revisão
          </button>
          <span className="text-[12px] text-(--ink-3)">{indice + 1} / {filt.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-(--border) rounded-full mb-6">
          <div
            className="h-full bg-brand-navy rounded-full transition-all duration-300"
            style={{ width: `${((indice) / filt.length) * 100}%` }}
          />
        </div>

        {card.materia && (
          <span className="self-start text-[10px] font-bold text-(--accent) bg-(--accent-light) px-2 py-0.5 rounded-full mb-3">
            {card.materia}
          </span>
        )}

        {/* Card */}
        <div className="flex-1 flex flex-col">
          <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-6 flex-1 flex flex-col justify-center shadow-sm">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">
              {mostrarVerso ? 'Resposta' : 'Pergunta'}
            </p>
            <p className="text-[16px] text-(--ink) leading-relaxed font-medium">
              {mostrarVerso ? card.verso : card.frente}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {!mostrarVerso ? (
              <button
                onClick={() => setMostrarVerso(true)}
                className="w-full py-3 bg-brand-navy text-white font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity"
              >
                Revelar resposta
              </button>
            ) : (
              <>
                <p className="text-[12px] text-center text-text-muted">Como foi?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => avaliarRevisao(false)}
                    className="py-3 bg-danger-bg text-danger-2 font-semibold rounded-(--radius-sm) border border-danger-2/20 hover:bg-danger-2/15 transition-colors"
                  >
                    Errei
                  </button>
                  <button
                    onClick={() => avaliarRevisao(true)}
                    className="py-3 bg-success-bg text-success font-semibold rounded-(--radius-sm) border border-success/20 hover:bg-success/15 transition-colors"
                  >
                    Acertei
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Lista ──────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-[720px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-(--ink)">Flashcards</h1>
          <p className="text-[13px] text-(--ink-3) mt-0.5">
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
            {paraRevisar > 0 && (
              <span className="ml-2 text-warning-2 font-semibold">· {paraRevisar} para revisar hoje</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-(--accent) text-[13px] font-semibold rounded-sm hover:opacity-90 transition-opacity"
            style={{ color: '#ffffff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Adicionar
          </button>
          {filt.length > 0 && (
            <button
              onClick={() => { setIndice(0); setMostrarVerso(false); setRevisao(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white text-[13px] font-semibold rounded-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined filled" style={{ fontSize: 18 }}>play_arrow</span>
              Revisar {filtroMateria ? 'filtro' : 'todos'}
            </button>
          )}
        </div>
      </div>

      {/* Filtro por matéria */}
      {materias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFiltroMateria('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
              !filtroMateria
                ? 'bg-brand-navy text-white border-brand-navy'
                : 'bg-(--surface) text-(--ink-2) border-(--border) hover:border-(--border-strong)'
            }`}
          >
            Todos
          </button>
          {materias.map(m => (
            <button
              key={m}
              onClick={() => setFiltroMateria(m === filtroMateria ? '' : m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                filtroMateria === m
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-(--surface) text-(--ink-2) border-(--border) hover:border-(--border-strong)'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Modal adicionar flashcard */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setModalAberto(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-(--surface) rounded-(--radius) border border-(--border) shadow-2xl w-full max-w-[420px] p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-(--ink)">Novo Flashcard</h2>
              <button onClick={() => setModalAberto(false)} className="text-(--ink-3) hover:text-(--ink) transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-(--ink-3)">Pergunta (frente)</label>
                <textarea
                  value={novaFrente}
                  onChange={e => setNovaFrente(e.target.value)}
                  placeholder="Ex: O que é habeas corpus?"
                  rows={3}
                  className="w-full rounded-sm border border-(--border-strong) px-3 py-2 text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-(--ink-3)">Resposta (verso)</label>
                <textarea
                  value={novaVerso}
                  onChange={e => setNovaVerso(e.target.value)}
                  placeholder="Ex: Instrumento constitucional que protege a liberdade de locomoção..."
                  rows={3}
                  className="w-full rounded-sm border border-(--border-strong) px-3 py-2 text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-(--ink-3)">Matéria (opcional)</label>
                <input
                  value={novaMateria}
                  onChange={e => setNovaMateria(e.target.value)}
                  placeholder="Ex: Direito Constitucional"
                  className="h-9 rounded-sm border border-(--border-strong) px-3 text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-[13px] font-semibold text-(--ink-2) border border-(--border) rounded-sm hover:bg-(--surface-2) transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoFlashcard}
                disabled={salvandoNovo}
                className="px-4 py-2 text-[13px] font-semibold rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                {salvandoNovo ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 skeleton rounded-(--radius)" />
        ))
      ) : filt.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 48 }}>style</span>
          <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum flashcard ainda</p>
          <p className="text-[13px] text-(--ink-3) max-w-[280px]">
            Abra uma apostila, selecione um trecho e crie flashcards. Ou gere com IA direto do PDF.
          </p>
          <Link
            href="/apostilas"
            className="px-4 py-2 bg-brand-navy text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity"
            style={{ color: '#ffffff' }}
          >
            Ir para Apostilas
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filt.map(card => {
            const virado = virados.has(card.id);
            const atrasado = card.proxima_revisao < hoje;
            return (
              <div
                key={card.id}
                className="bg-(--surface) border border-(--border) rounded-(--radius) overflow-hidden"
              >
                {/* Frente */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => toggleVirar(card.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {card.materia && (
                          <span className="text-[10px] font-bold text-(--accent) bg-(--accent-light) px-2 py-0.5 rounded-full">
                            {card.materia}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">{formatOrigem(card.origem)}</span>
                        {atrasado && (
                          <span className="text-[10px] font-bold text-warning-2 bg-warning-bg px-2 py-0.5 rounded-full">
                            Revisar hoje
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-(--ink) leading-snug">{card.frente}</p>
                    </div>
                    <span
                      className="material-symbols-outlined text-(--ink-3) shrink-0 transition-transform duration-200"
                      style={{ fontSize: 20, transform: virado ? 'rotate(180deg)' : 'none' }}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Verso (expandido) */}
                {virado && (
                  <div className="px-4 pb-4 border-t border-(--border) pt-3">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Resposta</p>
                    <p className="text-[13px] text-(--ink-2) leading-relaxed">{card.verso}</p>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => excluir(card.id)}
                        className="flex items-center gap-1 text-[12px] text-(--ink-3) hover:text-(--danger) transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
