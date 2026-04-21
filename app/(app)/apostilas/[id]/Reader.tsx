'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Flashcard { frente: string; verso: string; materia: string }

interface Props {
  materialId: string;
  titulo: string;
  materia: string | null;
  signedUrl: string;
}

export function ApostilaReader({ materialId, titulo, materia, signedUrl }: Props) {
  const { toast } = useToast();

  // Flashcard manual
  const [frente, setFrente] = useState('');
  const [verso, setVerso] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Geração IA
  const [gerando, setGerando] = useState(false);
  const [flashcardsGerados, setFlashcardsGerados] = useState<Flashcard[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [salvandoIA, setSalvandoIA] = useState(false);

  async function salvarManual() {
    if (!frente.trim() || !verso.trim()) return toast('Preencha frente e verso.', 'error');
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('flashcards').insert({
        user_id: user.id,
        frente: frente.trim(),
        verso: verso.trim(),
        materia: materia ?? 'Legislação Específica',
        origem: 'pdf',
      });
      if (error) throw error;
      toast('Flashcard salvo!', 'success');
      setFrente('');
      setVerso('');
    } catch {
      toast('Erro ao salvar flashcard.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function gerarComIA() {
    setGerando(true);
    setFlashcardsGerados([]);
    setSelecionados(new Set());
    try {
      const resp = await fetch(`/api/materiais/${materialId}/gerar-flashcards`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) { toast(data.error ?? 'Erro ao gerar flashcards.', 'error'); return; }
      setFlashcardsGerados(data.flashcards ?? []);
      setSelecionados(new Set(data.flashcards.map((_: Flashcard, i: number) => i)));
      toast(`${data.flashcards.length} flashcards gerados! Revise e salve os que quiser.`, 'success');
    } catch {
      toast('Erro ao gerar flashcards.', 'error');
    } finally {
      setGerando(false);
    }
  }

  function toggleSelecionado(i: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function salvarSelecionados() {
    const lista = flashcardsGerados.filter((_, i) => selecionados.has(i));
    if (lista.length === 0) return toast('Selecione ao menos um flashcard.', 'error');
    setSalvandoIA(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = lista.map(fc => ({
        user_id: user.id,
        frente: fc.frente,
        verso: fc.verso,
        materia: fc.materia || materia || 'Legislação Específica',
        origem: 'pdf',
      }));
      const { error } = await supabase.from('flashcards').insert(rows);
      if (error) throw error;
      toast(`${lista.length} flashcards salvos!`, 'success');
      setFlashcardsGerados([]);
      setSelecionados(new Set());
    } catch {
      toast('Erro ao salvar.', 'error');
    } finally {
      setSalvandoIA(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-64px)] overflow-hidden">

      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-(--border) bg-(--surface) flex items-center gap-3 shrink-0">
          <Link href="/apostilas" className="text-(--ink-3) hover:text-(--ink) transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-(--ink) truncate">{titulo}</p>
            {materia && <p className="text-[11px] text-(--ink-3)">{materia}</p>}
          </div>
        </div>
        {signedUrl ? (
          <iframe
            src={signedUrl}
            className="flex-1 w-full border-0"
            title={titulo}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-(--ink-3) text-[14px]">Não foi possível carregar o PDF.</p>
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <div className="w-full md:w-[340px] shrink-0 border-t md:border-t-0 md:border-l border-(--border) bg-(--surface) flex flex-col overflow-y-auto">

        {/* Gerar com IA */}
        <div className="p-4 border-b border-(--border)">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 18 }}>auto_awesome</span>
            <p className="text-[13px] font-bold text-(--ink)">Gerar flashcards com IA</p>
          </div>
          <p className="text-[12px] text-(--ink-3) mb-3">
            A IA analisa o PDF e cria até 15 flashcards dos principais conceitos.
          </p>
          <Button size="sm" loading={gerando} onClick={gerarComIA} className="w-full">
            {gerando ? 'Analisando PDF...' : 'Gerar flashcards'}
          </Button>

          {flashcardsGerados.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-(--ink)">{flashcardsGerados.length} gerados</p>
                <button
                  onClick={() => setSelecionados(
                    selecionados.size === flashcardsGerados.length
                      ? new Set()
                      : new Set(flashcardsGerados.map((_, i) => i))
                  )}
                  className="text-[11px] text-(--accent) hover:underline"
                >
                  {selecionados.size === flashcardsGerados.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {flashcardsGerados.map((fc, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSelecionado(i)}
                    className={`text-left p-2.5 rounded-sm border transition-all ${
                      selecionados.has(i)
                        ? 'border-(--accent) bg-(--accent-light)'
                        : 'border-(--border) hover:border-(--border-strong)'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-(--ink) leading-snug">{fc.frente}</p>
                    <p className="text-[10px] text-(--ink-3) mt-0.5 leading-snug line-clamp-2">{fc.verso}</p>
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                loading={salvandoIA}
                onClick={salvarSelecionados}
                disabled={selecionados.size === 0}
              >
                Salvar {selecionados.size} flashcard{selecionados.size !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>

        {/* Adicionar manual */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-(--teal)" style={{ fontSize: 18 }}>add_card</span>
            <p className="text-[13px] font-bold text-(--ink)">Adicionar flashcard manual</p>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[11px] font-medium text-(--ink-3) block mb-1">Frente (pergunta / conceito)</label>
              <textarea
                value={frente}
                onChange={e => setFrente(e.target.value)}
                placeholder="Ex: O que é ato administrativo?"
                rows={2}
                className="w-full px-3 py-2 rounded-sm border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-(--ink-3) block mb-1">Verso (resposta)</label>
              <textarea
                value={verso}
                onChange={e => setVerso(e.target.value)}
                placeholder="Ex: Manifestação unilateral de vontade da Administração Pública..."
                rows={3}
                className="w-full px-3 py-2 rounded-sm border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
              />
            </div>
            <Button size="sm" loading={salvando} onClick={salvarManual}>
              Salvar flashcard
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-(--border)">
            <Link href="/flashcards" className="flex items-center gap-1.5 text-[12px] text-(--accent) hover:underline">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>style</span>
              Ver todos os flashcards →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
