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

// ── Tipos ──────────────────────────────────────────────────────────────
interface Flashcard { frente: string; verso: string; materia: string }
interface HighlightRect { top: number; left: number; width: number; height: number } // percentages
interface Highlight { id: string; page: number; rects: HighlightRect[]; color: string; texto: string }

interface Props {
  materialId: string;
  titulo: string;
  materia: string | null;
  signedUrl: string;
}

const CORES = [
  { hex: '#FFE566', label: 'Amarelo' },
  { hex: '#99EE77', label: 'Verde' },
  { hex: '#FF9933', label: 'Laranja' },
  { hex: '#FF99CC', label: 'Rosa' },
  { hex: '#99CCFF', label: 'Azul' },
];

// ── Helpers ────────────────────────────────────────────────────────────
function uuid() { return crypto.randomUUID(); }

function getPageHighlightRects(
  range: Range,
  pageEls: (HTMLElement | null)[],
): { page: number; rects: HighlightRect[] }[] {
  const clientRects = Array.from(range.getClientRects());
  const result: { page: number; rects: HighlightRect[] }[] = [];

  pageEls.forEach((el, i) => {
    if (!el) return;
    const pr = el.getBoundingClientRect();
    const pageRects: HighlightRect[] = [];

    for (const cr of clientRects) {
      if (cr.height < 2 || cr.width < 2) continue;
      if (cr.bottom < pr.top || cr.top > pr.bottom) continue;
      if (cr.right < pr.left || cr.left > pr.right) continue;

      pageRects.push({
        top: Math.max(0, (cr.top - pr.top) / pr.height) * 100,
        left: Math.max(0, (cr.left - pr.left) / pr.width) * 100,
        width: (Math.min(cr.right, pr.right) - Math.max(cr.left, pr.left)) / pr.width * 100,
        height: (Math.min(cr.bottom, pr.bottom) - Math.max(cr.top, pr.top)) / pr.height * 100,
      });
    }

    if (pageRects.length > 0) result.push({ page: i + 1, rects: pageRects });
  });

  return result;
}

async function baixarPDFMarcado(
  pdfUrl: string,
  highlights: Highlight[],
  titulo: string,
) {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const bytes = await fetch(pdfUrl).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  for (const h of highlights) {
    const page = pdfDoc.getPage(h.page - 1);
    const { width: pw, height: ph } = page.getSize();
    for (const r of h.rects) {
      page.drawRectangle({
        x: (r.left / 100) * pw,
        y: ph - ((r.top + r.height) / 100) * ph,
        width: (r.width / 100) * pw,
        height: (r.height / 100) * ph,
        color: hexToRgb(h.color),
        opacity: 0.38,
      });
    }
  }

  const modified = await pdfDoc.save();
  const blob = new Blob([modified as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_marcado.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Componente ─────────────────────────────────────────────────────────
export function ApostilaReader({ materialId, titulo, materia, signedUrl }: Props) {
  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const frenteRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLElement | null)[]>([]);

  // PDF
  const [numPages, setNumPages] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(600);

  // Modo marca-texto
  const [modoMarca, setModoMarca] = useState(false);
  const [corAtual, setCorAtual] = useState(CORES[0].hex);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [abaLateral, setAbaLateral] = useState<'flashcards' | 'marcacoes'>('flashcards');
  const [baixando, setBaixando] = useState(false);

  // Flashcard — popover de seleção
  const [selecao, setSelecao] = useState('');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Flashcard — formulário
  const [frente, setFrente] = useState('');
  const [verso, setVerso] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Flashcard — geração IA
  const [gerando, setGerando] = useState(false);
  const [flashcardsGerados, setFlashcardsGerados] = useState<Flashcard[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [salvandoIA, setSalvandoIA] = useState(false);

  useEffect(() => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setPdfWidth(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (!modoMarca && (!sel || sel.isCollapsed || !sel.toString().trim())) {
        setPopoverPos(null);
      }
    }
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, [modoMarca]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const text = sel.toString().trim();
    if (!text || text.length < 2) return;

    const range = sel.getRangeAt(0);
    const container = pdfContainerRef.current;
    if (!container?.contains(range.commonAncestorContainer)) return;

    if (modoMarca) {
      // Modo marca-texto: aplica realce imediatamente
      const pageRects = getPageHighlightRects(range, pageRefs.current);
      if (pageRects.length === 0) return;

      const novos: Highlight[] = pageRects.map(({ page, rects }) => ({
        id: uuid(),
        page,
        rects,
        color: corAtual,
        texto: text.slice(0, 120),
      }));

      setHighlights(prev => [...prev, ...novos]);
      sel.removeAllRanges();
    } else {
      // Modo flashcard: mostra popover
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setSelecao(text);
      setPopoverPos({
        top: rect.top - containerRect.top + container.scrollTop - 52,
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - 108 - containerRect.left, containerRect.width - 224)),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoMarca, corAtual]);

  function usarSelecao() {
    setFrente(selecao.slice(0, 300));
    setPopoverPos(null);
    window.getSelection()?.removeAllRanges();
    setAbaLateral('flashcards');
    setTimeout(() => {
      sidebarRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
      frenteRef.current?.focus();
    }, 80);
  }

  function removerHighlight(id: string) {
    setHighlights(prev => prev.filter(h => h.id !== id));
  }

  async function handleBaixar() {
    if (!signedUrl) return;
    setBaixando(true);
    try {
      await baixarPDFMarcado(signedUrl, highlights, titulo);
    } catch {
      toast('Erro ao gerar PDF marcado.', 'error');
    } finally {
      setBaixando(false);
    }
  }

  async function salvarManual() {
    if (!frente.trim() || !verso.trim()) return toast('Preencha frente e verso.', 'error');
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('flashcards').insert({
        user_id: user.id, frente: frente.trim(), verso: verso.trim(),
        materia: materia ?? 'Legislação Específica', origem: 'pdf',
      });
      if (error) throw error;
      toast('Flashcard salvo!', 'success');
      setFrente(''); setVerso('');
    } catch { toast('Erro ao salvar flashcard.', 'error'); }
    finally { setSalvando(false); }
  }

  async function gerarComIA() {
    setGerando(true); setFlashcardsGerados([]); setSelecionados(new Set());
    try {
      const resp = await fetch(`/api/materiais/${materialId}/gerar-flashcards`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) { toast(data.error ?? 'Erro ao gerar flashcards.', 'error'); return; }
      setFlashcardsGerados(data.flashcards ?? []);
      setSelecionados(new Set(data.flashcards.map((_: Flashcard, i: number) => i)));
      toast(`${data.flashcards.length} flashcards gerados!`, 'success');
    } catch { toast('Erro ao gerar flashcards.', 'error'); }
    finally { setGerando(false); }
  }

  function toggleSelecionado(i: number) {
    setSelecionados(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  async function salvarSelecionados() {
    const lista = flashcardsGerados.filter((_, i) => selecionados.has(i));
    if (!lista.length) return toast('Selecione ao menos um flashcard.', 'error');
    setSalvandoIA(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('flashcards').insert(
        lista.map(fc => ({ user_id: user.id, frente: fc.frente, verso: fc.verso,
          materia: fc.materia || materia || 'Legislação Específica', origem: 'pdf' }))
      );
      if (error) throw error;
      toast(`${lista.length} flashcards salvos!`, 'success');
      setFlashcardsGerados([]); setSelecionados(new Set());
    } catch { toast('Erro ao salvar.', 'error'); }
    finally { setSalvandoIA(false); }
  }

  const pageW = Math.min(pdfWidth - 32, 860);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-64px)] overflow-hidden">

      {/* ── PDF Viewer ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Header */}
        <div className="px-3 py-2 border-b border-(--border) bg-(--surface) flex items-center gap-2 shrink-0 flex-wrap">
          <Link href="/apostilas" className="text-(--ink-3) hover:text-(--ink) transition-colors shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-(--ink) truncate">{titulo}</p>
            {materia && <p className="text-[11px] text-(--ink-3)">{materia}</p>}
          </div>

          {/* Modo toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setModoMarca(false); setPopoverPos(null); }}
              title="Modo flashcard"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                !modoMarca ? 'bg-brand-navy text-white' : 'bg-(--surface-2) text-(--ink-2) hover:bg-(--border)'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>style</span>
              <span className="hidden sm:inline">Flashcard</span>
            </button>
            <button
              onClick={() => { setModoMarca(true); setPopoverPos(null); window.getSelection()?.removeAllRanges(); }}
              title="Modo marca-texto"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                modoMarca ? 'bg-brand-orange text-white' : 'bg-(--surface-2) text-(--ink-2) hover:bg-(--border)'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
              <span className="hidden sm:inline">Marca-texto</span>
              {highlights.length > 0 && (
                <span className="bg-white/30 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {highlights.length}
                </span>
              )}
            </button>
          </div>

          {/* Paleta de cores (modo marca) */}
          {modoMarca && (
            <div className="flex items-center gap-1 shrink-0">
              {CORES.map(c => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => setCorAtual(c.hex)}
                  className="rounded-full transition-all"
                  style={{
                    width: 22, height: 22,
                    backgroundColor: c.hex,
                    outline: corAtual === c.hex ? '2px solid #17375E' : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          )}

          {/* Baixar PDF */}
          {highlights.length > 0 && (
            <button
              onClick={handleBaixar}
              disabled={baixando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-white text-[11px] font-semibold rounded-lg hover:opacity-90 transition-opacity shrink-0 disabled:opacity-60"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>download</span>
              {baixando ? 'Gerando...' : 'Baixar marcado'}
            </button>
          )}
        </div>

        {/* Dica contextual */}
        <div className={`px-3 py-1.5 text-[11px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
          modoMarca ? 'bg-brand-orange/10 text-brand-orange' : 'bg-(--surface-2) text-(--ink-3)'
        }`}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {modoMarca ? 'edit' : 'touch_app'}
          </span>
          {modoMarca
            ? 'Selecione o texto para realçar. Use as cores acima para organizar.'
            : 'Selecione texto para criar flashcard. Ou use o modo marca-texto para realçar.'}
        </div>

        {/* PDF Container */}
        <div
          ref={pdfContainerRef}
          className={`flex-1 overflow-y-auto bg-[#f0f0f0] relative ${modoMarca ? 'cursor-crosshair' : ''}`}
          onMouseUp={handleMouseUp}
        >
          {signedUrl ? (
            <Document
              file={signedUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n);
                pageRefs.current = new Array(n).fill(null);
              }}
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
                  {/* Wrapper relativo para overlay de marcações */}
                  <div
                    className="relative shadow-lg"
                    ref={el => { pageRefs.current[i] = el; }}
                    style={{ width: pageW }}
                  >
                    <Page
                      pageNumber={i + 1}
                      width={pageW}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                    />
                    {/* Overlay de highlights desta página */}
                    <div className="absolute inset-0 pointer-events-none select-none">
                      {highlights.filter(h => h.page === i + 1).map(h =>
                        h.rects.map((r, ri) => (
                          <div
                            key={`${h.id}-${ri}`}
                            className="absolute"
                            style={{
                              top: `${r.top}%`,
                              left: `${r.left}%`,
                              width: `${r.width}%`,
                              height: `${r.height}%`,
                              backgroundColor: h.color,
                              opacity: 0.38,
                              mixBlendMode: 'multiply',
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </Document>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-(--ink-3) text-[14px]">Não foi possível carregar o PDF.</p>
            </div>
          )}

          {/* Popover de seleção (modo flashcard) */}
          {!modoMarca && popoverPos && (
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
          <div className="px-4 py-1 border-t border-(--border) bg-(--surface) text-[11px] text-(--ink-3) text-center shrink-0">
            {numPages} {numPages === 1 ? 'página' : 'páginas'}
            {highlights.length > 0 && <span className="ml-3 text-brand-orange font-semibold">{highlights.length} realce{highlights.length !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {/* ── Painel lateral ─────────────────────────────────────── */}
      <div ref={sidebarRef} className="w-full md:w-[340px] shrink-0 border-t md:border-t-0 md:border-l border-(--border) bg-(--surface) flex flex-col overflow-y-auto">

        {/* Tabs */}
        <div className="flex border-b border-(--border) shrink-0">
          <button
            onClick={() => setAbaLateral('flashcards')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
              abaLateral === 'flashcards'
                ? 'text-brand-navy border-b-2 border-brand-navy'
                : 'text-text-muted hover:text-(--ink)'
            }`}
          >
            <span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 14 }}>style</span>
            Flashcards
          </button>
          <button
            onClick={() => setAbaLateral('marcacoes')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors relative ${
              abaLateral === 'marcacoes'
                ? 'text-brand-orange border-b-2 border-brand-orange'
                : 'text-text-muted hover:text-(--ink)'
            }`}
          >
            <span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 14 }}>edit</span>
            Marcações
            {highlights.length > 0 && (
              <span className="ml-1 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {highlights.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Aba Flashcards ─────────────────────────── */}
        {abaLateral === 'flashcards' && (
          <>
            {/* Gerar com IA */}
            <div className="p-4 border-b border-(--border)">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined filled text-(--accent)" style={{ fontSize: 18 }}>auto_awesome</span>
                <p className="text-[13px] font-bold text-(--ink)">Gerar flashcards com IA</p>
              </div>
              <p className="text-[12px] text-(--ink-3) mb-3">A IA analisa o PDF completo e cria até 15 flashcards dos principais conceitos.</p>
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
                          ? new Set() : new Set(flashcardsGerados.map((_, i) => i))
                      )}
                      className="text-[11px] text-(--accent) hover:underline"
                    >
                      {selecionados.size === flashcardsGerados.length ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                    {flashcardsGerados.map((fc, i) => (
                      <button key={i} onClick={() => toggleSelecionado(i)}
                        className={`text-left p-2.5 rounded-sm border transition-all ${
                          selecionados.has(i) ? 'border-(--accent) bg-(--accent-light)' : 'border-(--border) hover:border-(--border-strong)'
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
                  <label className="text-[11px] font-medium text-(--ink-3) block mb-1">Frente</label>
                  <textarea ref={frenteRef} value={frente} onChange={e => setFrente(e.target.value)}
                    placeholder="Ex: O que é ato administrativo?" rows={3}
                    className="w-full px-3 py-2 rounded-sm border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-(--ink-3) block mb-1">Verso</label>
                  <textarea value={verso} onChange={e => setVerso(e.target.value)}
                    placeholder="Ex: Manifestação unilateral de vontade da Administração..." rows={3}
                    className="w-full px-3 py-2 rounded-sm border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
                  />
                </div>
                <Button size="sm" loading={salvando} onClick={salvarManual}>Salvar flashcard</Button>
              </div>
              <div className="mt-4 pt-4 border-t border-(--border)">
                <Link href="/flashcards" className="flex items-center gap-1.5 text-[12px] text-(--accent) hover:underline">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>style</span>
                  Ver todos os flashcards →
                </Link>
              </div>
            </div>
          </>
        )}

        {/* ── Aba Marcações ──────────────────────────── */}
        {abaLateral === 'marcacoes' && (
          <div className="p-4 flex flex-col gap-3">
            {highlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <span className="text-4xl">🖊️</span>
                <p className="text-[13px] font-semibold text-(--ink-2)">Nenhuma marcação ainda</p>
                <p className="text-[12px] text-(--ink-3)">
                  Ative o modo <strong>Marca-texto</strong> e selecione trechos no PDF.
                </p>
                <button
                  onClick={() => setModoMarca(true)}
                  className="px-4 py-2 bg-brand-orange text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Ativar marca-texto
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-(--ink)">{highlights.length} realce{highlights.length !== 1 ? 's' : ''}</p>
                  <button
                    onClick={() => setHighlights([])}
                    className="text-[11px] text-(--danger) hover:underline"
                  >
                    Limpar todos
                  </button>
                </div>

                {/* Grouped by page */}
                {Array.from(new Set(highlights.map(h => h.page))).sort((a, b) => a - b).map(page => (
                  <div key={page}>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Página {page}</p>
                    <div className="flex flex-col gap-1.5">
                      {highlights.filter(h => h.page === page).map(h => (
                        <div key={h.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-(--surface-2) border border-(--border)">
                          <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: h.color }} />
                          <p className="text-[12px] text-(--ink) flex-1 leading-snug line-clamp-2">{h.texto || '(sem texto)'}</p>
                          <button
                            onClick={() => removerHighlight(h.id)}
                            className="text-(--ink-3) hover:text-(--danger) transition-colors shrink-0"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleBaixar}
                  disabled={baixando}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-success text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                  {baixando ? 'Gerando PDF...' : 'Baixar PDF com marcações'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
