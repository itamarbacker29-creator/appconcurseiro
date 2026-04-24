'use client';

import { useEffect, useState, useCallback } from 'react';

export const TOUR_KEY = 'otutor_tour_v3';
const PAD = 8;
const GAP = 14;
const TOOLTIP_W = 288;

interface Passo {
  target?: string;
  titulo: string;
  descricao: string;
  emoji?: string;
}

const PASSOS: Passo[] = [
  {
    emoji: '👋',
    titulo: 'Bem-vindo ao O Tutor!',
    descricao: 'Sua central de estudos para concursos. Deixa eu te mostrar o que tem aqui — menos de 1 minuto, prometo.',
  },
  {
    target: 'nav-editais',
    emoji: '📋',
    titulo: 'Editais',
    descricao: 'Explore concursos abertos, filtre por área e banca. Salve os que te interessam e acompanhe os prazos.',
  },
  {
    target: 'nav-simulado',
    emoji: '🧠',
    titulo: 'Simulados adaptativos',
    descricao: 'Questões que se adaptam ao seu nível em tempo real. O sistema calibra a dificuldade automaticamente.',
  },
  {
    target: 'nav-plano',
    emoji: '📅',
    titulo: 'Plano de Estudo',
    descricao: 'A IA gera um cronograma semanal personalizado com base no seu desempenho e no edital do seu concurso alvo.',
  },
  {
    target: 'nav-tutor',
    emoji: '✨',
    titulo: 'Tutor IA',
    descricao: 'Tire dúvidas sobre qualquer matéria a qualquer hora. A IA explica, exemplifica e resolve questões com você.',
  },
  {
    target: 'nav-desempenho',
    emoji: '📊',
    titulo: 'Desempenho',
    descricao: 'Evolução por matéria, ranking de prioridades e progresso rumo à meta de aprovação. Tudo pronto — bons estudos!',
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
        setTimeout(() => setAtivo(true), 800);
      }
    } catch { /* localStorage indisponível */ }

    function handleReiniciar() {
      setPasso(0);
      setAtivo(true);
    }
    window.addEventListener('otutor:reiniciar-tour', handleReiniciar);
    return () => window.removeEventListener('otutor:reiniciar-tour', handleReiniciar);
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

  const dots = (
    <div className="flex justify-center gap-1">
      {PASSOS.map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-200 ${i === passo ? 'w-4 h-1.5 bg-brand-navy' : 'w-1.5 h-1.5 bg-(--border-strong)'}`} />
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
        <div className="absolute rounded-(--radius-sm) ring-2 ring-brand-orange" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        {/* Tooltip */}
        <div
          className="absolute bg-white rounded-(--radius) p-4 shadow-2xl border border-(--border) flex flex-col gap-3"
          style={{ ...tooltipStyle, pointerEvents: 'auto', width: TOOLTIP_W }}
        >
          <div className="flex items-start gap-2">
            {passoAtual.emoji && <span className="text-[22px] leading-none shrink-0 mt-0.5">{passoAtual.emoji}</span>}
            <div>
              <h3 className="text-[15px] font-bold text-brand-navy">{passoAtual.titulo}</h3>
              <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{passoAtual.descricao}</p>
            </div>
          </div>
          {dots}
          <div className="flex items-center justify-between">
            <button onClick={encerrar} className="text-[12px] text-text-muted hover:text-brand-navy transition-colors">Pular</button>
            <button onClick={avancar} className="px-3 py-1.5 bg-brand-navy text-white text-[12px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
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
        <div className="bg-white rounded-(--radius) p-6 w-full max-w-[320px] shadow-2xl border border-(--border) flex flex-col gap-4" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shrink-0 mt-0.5">
              {passoAtual.emoji
                ? <span className="text-[20px] leading-none">{passoAtual.emoji}</span>
                : <span className="material-symbols-outlined filled text-white" style={{ fontSize: 20 }}>auto_awesome</span>
              }
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-brand-navy">{passoAtual.titulo}</h2>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">{passoAtual.descricao}</p>
            </div>
          </div>
          {dots}
          <div className="flex items-center justify-between">
            <button onClick={encerrar} className="text-[13px] text-text-muted hover:text-brand-navy transition-colors">Pular tour</button>
            <button onClick={avancar} className="px-4 py-2 bg-brand-navy text-white text-[13px] font-semibold rounded-(--radius-sm) hover:opacity-90 transition-opacity">
              {passo < PASSOS.length - 1 ? 'Próximo →' : 'Concluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
