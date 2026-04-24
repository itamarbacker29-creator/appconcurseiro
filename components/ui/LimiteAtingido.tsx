'use client';

import type { RecursoLimitado } from '@/lib/pricing';

const MENSAGENS: Record<RecursoLimitado, string> = {
  simulados_mes: 'Você usou seus 3 simulados gratuitos deste mês. No Premium, os simulados são ilimitados.',
  questoes_por_simulado: 'Limite de questões por simulado atingido. No Premium, cada simulado é completo.',
  tutor_msgs_dia: 'Você usou sua pergunta diária ao Tutor IA. No Premium, são 30 mensagens por mês.',
  tutor_msgs_mes: 'Você atingiu o limite de mensagens do Tutor IA este mês. No Elite, o acesso é ilimitado.',
  raio_x_mes: 'Você usou seu Raio-X gratuito do mês. No Premium, o acesso é ilimitado.',
  pdfs_mes: 'Você já fez upload do PDF gratuito deste mês. No Premium, são 5 PDFs por mês.',
  flashcards_por_pdf: 'Limite de flashcards atingido neste PDF. No Premium, gere quantos quiser.',
};

interface LimiteAtingidoProps {
  recurso: RecursoLimitado;
  className?: string;
}

export function LimiteAtingido({ recurso, className = '' }: LimiteAtingidoProps) {
  return (
    <div className={`bg-(--surface-2) rounded-xl p-5 border border-brand-orange/20 text-center ${className}`}>
      <p className="text-[13px] font-semibold text-(--ink) mb-1">
        Limite do plano gratuito atingido
      </p>
      <p className="text-[12px] text-(--ink-3) mb-4 max-w-xs mx-auto">
        {MENSAGENS[recurso]}
      </p>
      <a
        href="/home#planos"
        className="inline-block px-5 py-2.5 bg-brand-navy text-white text-[13px] font-bold rounded-xl hover:opacity-90 transition-opacity"
      >
        Ver planos a partir de R$19,90/mês
      </a>
    </div>
  );
}
