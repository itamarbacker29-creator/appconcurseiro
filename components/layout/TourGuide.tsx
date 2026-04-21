'use client';

import { useEffect, useState, useCallback } from 'react';

const TOUR_KEY = 'otutor_tour_v1';
const PAD = 8;
const GAP = 14;
const TOOLTIP_W = 272;

interface Passo {
  target?: string;
  titulo: string;
  descricao: string;
}

const PASSOS: Passo[] = [
  {
    titulo: 'Bem-vindo ao O Tutor!',
    descricao: 'Deixa eu te mostrar as principais seções em menos de 1 minuto. Você pode pular a qualquer momento.',
  },
  {
    target: 'nav-editais',
    titulo: 'Editais',
    descricao: 'Explore concursos abertos, veja matérias exigidas e salve os que te interessam.',
  },
  {
    target: 'nav-simulado',
    titulo: 'Simulados',
    descricao: 'Pratique com questões adaptativas ao seu nível. O sistema aprende com você e ajusta a dificuldade.',
  },
  {
    target: 'nav-desempenho',
    titulo: 'Desempenho',
    descricao: 'Acompanhe sua evolução por matéria e identifique onde focar para aumentar sua nota.',
  },
  {
    target: 'nav-conta',
    titulo: 'Conta & Plano',
    descricao: 'Aqui você gerencia seu perfil, plano Elite e preferências de estudo. Tudo pronto — bons estudos!',
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function encontrarVisivel(target: string): Element | null {
  const els = document.querySelectorAll(`[data-tour="${target}"]`);
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function calcPos(rect: ElementRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const TOOLTIP_H = 190;

  if (rect.left + rect.width + PAD + GAP + TOOLTIP_W < vw) {
    return { left: rect.left + rect.width + PAD + GAP, top: Math.max(8, Math.min(rect.top, vh - TOOLTIP_H - 8)), width: TOOLTIP_W };
  }
  if (rect.top + rect.height + PAD + GAP + TOOLTIP_H < vh) {
    return { left: Math.max(8, Math.min(rect.left, vw - TOOLTIP_W - 8)), top: rect.top + rect.height + PAD + GAP, width: TOOLTIP_W };
  }
  return { left: Math.max(8, Math.min(rect.left, vw - TOOLTIP_W - 8)), top: Math.max(8, rect.top - TOOLTIP_H - PAD - GAP), width: TOOLTIP_W };
}

export function TourGuide() {
  const [ativo, setAtivo] = useState(false);
  const [passo, setPasso] = useState(0);
  const [rect, setRect] = useState<ElementRect | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setTimeout(() => setAtivo(true), 700);
      }
    } catch { /* localStorage indisponível */ }
  }, []);

  const passoAtual = PASSOS[passo];

  const atualizarRect = useCallback(() => {
    if (!passoAtual?.target) { setRect(null); return; }
    const el = encontrarVisivel(passoAtual.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [passoAtual]);

  useEffect(() => { if (ativo) atualizarRect(); }, [ativo, passo, atualizarRect]);

  function avancar() {
    if (passo < PASSOS.length - 1) setPasso(p => p + 1);
    else encerrar();
  }

  function encerrar() {
    try { localStorage.setItem(TOUR_KEY, 'done'); } catch { /* */ }
    setAtivo(false);
  }

  if (!ativo) return null;

  const dots = (atual: number) => (
    <div className="flex justify-center gap-1">
      {PASSOS.map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-200 ${i === atual ? 'w-4 h-1.5 bg-(--accent)' : 'w-1.5 h-1.5 bg-(--border-strong)'}`} />
      ))}
    </div>
  );

  if (rect) {
    const tooltipStyle = calcPos(rect);
    return (
      <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
        {/* 4-panel overlay com buraco no elemento */}
        <div className="absolute bg-black/60" style={{ pointerEvents: 'auto', top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) }} />
        <div className="absolute bg-black/60" style={{ pointerEvents: 'auto', top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0 }} />
        <div className="absolute bg-black/60" style={{ pointerEvents: 'auto', top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 }} />
        <div className="absolute bg-black/60" style={{ pointerEvents: 'auto', top: rect.top - PAD, left: rect.left + rect.width + PAD, right: 0, height: rect.height + PAD * 2 }} />
        {/* Anel de destaque */}
        <div className="absolute rounded-(--radius-sm) ring-2 ring-(--accent) ring-offset-0" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        {/* Tooltip */}
        <div
          className="absolute bg-(--surface) rounded-(--radius) p-4 shadow-2xl border border-(--border) flex flex-col gap-3"
          style={{ ...tooltipStyle, pointerEvents: 'auto' }}
        >
          <div>
            <h3 className="text-[15px] font-bold text-(--ink)">{passoAtual.titulo}</h3>
            <p className="text-[13px] text-(--ink-2) mt-1 leading-relaxed">{passoAtual.descricao}</p>
          </div>
          {dots(passo)}
          <div className="flex items-center justify-between">
            <button onClick={encerrar} className="text-[12px] text-(--ink-3) hover:text-(--ink) transition-colors">Pular</button>
            <button onClick={avancar} className="px-3 py-1.5 bg-(--accent) text-white text-[12px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
              {passo < PASSOS.length - 1 ? 'Próximo →' : 'Concluir ✓'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Passo sem elemento — modal centralizado
  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
      <div className="absolute inset-0 bg-black/60" style={{ pointerEvents: 'auto' }} onClick={encerrar} />
      <div className="absolute inset-0 flex items-center justify-center px-4" style={{ pointerEvents: 'none' }}>
        <div className="bg-(--surface) rounded-(--radius) p-6 w-full max-w-sm shadow-2xl border border-(--border) flex flex-col gap-4" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--accent) flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined filled text-white" style={{ fontSize: 20 }}>auto_awesome</span>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-(--ink)">{passoAtual.titulo}</h2>
              <p className="text-[13px] text-(--ink-2) mt-1.5 leading-relaxed">{passoAtual.descricao}</p>
            </div>
          </div>
          {dots(passo)}
          <div className="flex items-center justify-between">
            <button onClick={encerrar} className="text-[13px] text-(--ink-3) hover:text-(--ink) transition-colors">Pular tour</button>
            <button onClick={avancar} className="px-4 py-2 bg-(--accent) text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
              {passo < PASSOS.length - 1 ? 'Próximo →' : 'Concluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
