'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

interface Analise {
  recomendacao: 'forte' | 'moderada' | 'nao_recomendado' | 'inelegivel' | 'perfil_incompleto';
  chanceAprovacao: number | null;
  formacaoAdequada: boolean | null;
  registroAdequado: boolean | null;
  cotasElegiveis: string[];
  elegivelIsencao: boolean;
  textoIA: string | null;
}

interface Props {
  editalId: string;
  cargoId?: string | null;
  linkInscricao: string | null;
}

const CONFIG = {
  forte:            { bg: 'bg-(--teal-light)',    border: 'border-(--teal)/20',   texto: 'text-(--teal)',    icone: 'thumb_up',    label: 'Recomendado para você' },
  moderada:         { bg: 'bg-(--accent-light)',  border: 'border-(--accent)/20', texto: 'text-(--accent)', icone: 'info',         label: 'Vale tentar' },
  nao_recomendado:  { bg: 'bg-(--danger-light)',  border: 'border-(--danger)/20', texto: 'text-(--danger)', icone: 'thumb_down',   label: 'Não recomendado agora' },
  inelegivel:       { bg: 'bg-(--surface-2)',     border: 'border-(--border)',     texto: 'text-(--ink-3)', icone: 'block',        label: 'Inelegível' },
  perfil_incompleto: { bg: 'bg-(--surface-2)',   border: 'border-(--border)',     texto: 'text-(--ink-3)', icone: 'person_add',   label: 'Complete seu perfil' },
};

function Item({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={`material-symbols-outlined filled text-[16px] ${ok ? 'text-(--teal)' : 'text-(--danger)'}`}>
        {ok ? 'check_circle' : 'cancel'}
      </span>
      <span className="text-[12px] text-(--ink-2)">{label}</span>
    </div>
  );
}

export function RecomendacaoParticipacao({ editalId, cargoId, linkInscricao }: Props) {
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/editais/recomendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editalId, cargoId }),
    })
      .then(r => r.json())
      .then(d => setAnalise(d))
      .catch(() => setAnalise(null))
      .finally(() => setLoading(false));
  }, [editalId]);

  if (loading) {
    return (
      <div className="bg-(--surface-2) border border-(--border) rounded-(--radius) p-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>
      </div>
    );
  }

  if (!analise) return null;

  const cfg = CONFIG[analise.recomendacao];

  if (analise.recomendacao === 'perfil_incompleto') {
    return (
      <div className={`${cfg.bg} border ${cfg.border} rounded-(--radius) p-5`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`material-symbols-outlined ${cfg.texto}`} style={{ fontSize: 18 }}>person_add</span>
          <p className={`text-[13px] font-bold ${cfg.texto}`}>Complete seu perfil para ver a análise</p>
        </div>
        <p className="text-[13px] text-(--ink-3) mb-3">
          Informe sua formação e situações de cota para receber uma recomendação personalizada de participação.
        </p>
        <Link href="/conta#elegibilidade" className="text-[13px] text-(--accent) hover:underline font-medium">
          Completar perfil →
        </Link>
      </div>
    );
  }

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-(--radius) p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined filled ${cfg.texto}`} style={{ fontSize: 20 }}>
            {cfg.icone}
          </span>
          <span className={`text-[14px] font-bold ${cfg.texto}`}>{cfg.label}</span>
        </div>
        {analise.chanceAprovacao !== null && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-(--ink-3) uppercase tracking-wide">Sua chance</p>
            <p className={`text-[24px] font-black leading-none ${cfg.texto}`}>{analise.chanceAprovacao}%</p>
          </div>
        )}
      </div>

      {/* Texto da IA */}
      {analise.textoIA && (
        <p className="text-[13px] text-(--ink-2) leading-relaxed mb-4">{analise.textoIA}</p>
      )}

      {/* Checklist */}
      <div className="flex flex-col gap-2 mb-4">
        <Item ok={analise.formacaoAdequada} label="Formação compatível com o cargo" />
        <Item ok={analise.registroAdequado} label="Registro em conselho profissional" />
        {analise.cotasElegiveis.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined filled text-(--teal) text-[16px]">star</span>
            <span className="text-[12px] text-(--teal) font-semibold">
              Concorre pelas cotas: {analise.cotasElegiveis.join(', ')}
            </span>
          </div>
        )}
        {analise.elegivelIsencao && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined filled text-(--teal) text-[16px]">savings</span>
            <span className="text-[12px] text-(--teal) font-semibold">Elegível para isenção da taxa de inscrição</span>
          </div>
        )}
      </div>

      {/* CTAs */}
      {analise.recomendacao !== 'inelegivel' && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/plano?edital=${editalId}`}
            className="px-4 py-2 bg-(--accent) text-[13px] font-semibold rounded-sm hover:opacity-90 transition-opacity"
            style={{ color: '#ffffff' }}>
            Criar plano de estudo
          </Link>
        </div>
      )}
    </div>
  );
}
