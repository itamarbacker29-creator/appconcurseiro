'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Flashcard { frente: string; verso: string; materia: string }

interface Props {
  materialId: string;
  titulo: string;
  materia: string | null;
  signedUrl: string;
}

export function ApostilaReader({ materialId, titulo, materia, signedUrl }: Props) {
  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const frenteRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pdfWidth, setPdfWidth] = useState(600);

  const [selecao, setSelecao] = useState('');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const [frente, setFrente] = useState('');
  const [verso, setVerso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [gerando, setGerando] = useState(false);
  const [flashcardsGerados, setFlashcardsGerados] = useState<Flashcard[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [salvandoIA, setSalvandoIA] = useState(false);

  useEffect(() => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setPdfWidth(entry.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) setPopoverPos(null);
    }
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const text = sel.toString().trim();
    if (!text || text.length < 5) return;

    const range = sel.getRangeAt(0);
    const container = pdfContainerRef.current;
    if (!container?.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setSelecao(text);
    setPopoverPos({
      top: rect.top - containerRect.top - 52,
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - 108 - containerRect.left, containerRect.width - 224)),
    });
  }, []);

  function usarSelecao() {
    setFrente(selecao.slice(0, 300));
    setPopoverPos(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => {
      sidebarRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
      frenteRef.current?.focus();
    }, 80);
  }

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
      toast(`${data.flashcards.length} flashcards gerados!`, 'success');
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
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="px-4 py-3 border-b border-(--border) bg-(--surface) flex items-center gap-3 shrink-0">
          <Link href="/apostilas" className="text-(--ink-3) hover:text-(--ink) transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-(--ink) truncate">{titulo}</p>
            {materia && <p className="text-[11px] text-(--ink-3)">{materia}</p>}
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-(--ink-3) shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>touch_app</span>
            Selecione texto para criar flashcard
          </div>
        </div>

        <div
          ref={pdfContainerRef}
          className="flex-1 overflow-y-auto bg-[#f0f0f0] relative"
          onMouseUp={handleMouseUp}
        >
          {signedUrl ? (
            <Document
              file={signedUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={
                <div className="flex flex-col items-center justify-center gap-3 h-64 text-(--ink-3)">
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
                  <p className="text-[13px]">Carregando PDF...</p>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-64">
                  <p className="text-(--ink-3) text-[14px]">Não foi possível carregar o PDF.</p>
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="flex justify-center py-2 px-4">
                  <Page
                    pageNumber={i + 1}
                    width={Math.min(pdfWidth - 32, 860)}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    className="shadow-lg"
                  />
                </div>
              ))}
            </Document>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-(--ink-3) text-[14px]">Não foi possível carregar o PDF.</p>
            </div>
          )}

          {/* Popover de seleção */}
          {popoverPos && (
            <div
              className="absolute z-50 bg-brand-navy text-white rounded-lg shadow-xl flex items-center gap-2 px-3 py-2"
              style={{ top: popoverPos.top, left: popoverPos.left, minWidth: 208 }}
            >
              <span className="material-symbols-outlined filled shrink-0" style={{ fontSize: 15 }}>style</span>
              <button
                className="text-[12px] font-semibold flex-1 text-left hover:text-brand-orange transition-colors"
                onMouseDown={e => { e.preventDefault(); usarSelecao(); }}
              >
                Criar flashcard
              </button>
              <button
                className="text-[14px] opacity-60 hover:opacity-100 shrink-0"
                onMouseDown={e => { e.preventDefault(); setPopoverPos(null); window.getSelection()?.removeAllRanges(); }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {numPages > 0 && (
          <div className="px-4 py-1.5 border-t border-(--border) bg-(--surface) text-[11px] text-(--ink-3) text-center shrink-0">
            {numPages} {numPages === 1 ? 'página' : 'páginas'}
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <div ref={sidebarRef} className="w-full md:w-[340px] shrink-0 border-t md:border-t-0 md:border-l border-(--border) bg-(--surface) flex flex-col overflow-y-auto">

        {/* Gerar com IA */}
        <div className="p-4 border-b border-(--border)">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined filled text-(--accent)" style={{ fontSize: 18 }}>auto_awesome</span>
            <p className="text-[13px] font-bold text-(--ink)">Gerar flashcards com IA</p>
          </div>
          <p className="text-[12px] text-(--ink-3) mb-3">
            A IA analisa o PDF completo e cria até 15 flashcards dos principais conceitos.
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
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
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
              <Button size="sm" loading={salvandoIA} onClick={salvarSelecionados} disabled={selecionados.size === 0}>
                Salvar {selecionados.size} flashcard{selecionados.size !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>

        {/* Flashcard manual / via seleção */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-(--teal)" style={{ fontSize: 18 }}>add_card</span>
            <p className="text-[13px] font-bold text-(--ink)">Adicionar flashcard</p>
          </div>
          {frente && (
            <div className="mb-2.5 px-2.5 py-1.5 bg-(--accent-light) rounded-sm border border-(--accent) text-[11px] text-(--accent) font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>touch_app</span>
              Trecho selecionado pré-preenchido
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[11px] font-medium text-(--ink-3) block mb-1">Frente (pergunta / conceito)</label>
              <textarea
                ref={frenteRef}
                value={frente}
                onChange={e => setFrente(e.target.value)}
                placeholder="Ex: O que é ato administrativo?"
                rows={3}
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
