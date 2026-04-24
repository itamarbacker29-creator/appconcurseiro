'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Beneficio {
  texto: string;
  incluso: boolean;
}

interface PlanoCard {
  id: string;
  nome: string;
  subtitulo: string;
  preco_mensal: number | null;
  preco_anual: number | null;
  badge: string | null;
  cta: string;
  destaque: boolean;
  beneficios: Beneficio[];
}

const PLANOS: PlanoCard[] = [
  {
    id: 'free',
    nome: 'Free',
    subtitulo: 'Descubra o que é estudar com inteligência',
    preco_mensal: null,
    preco_anual: null,
    badge: null,
    cta: 'Começar grátis',
    destaque: false,
    beneficios: [
      { texto: 'Todos os editais, sem limite', incluso: true },
      { texto: '3 simulados completos por mês', incluso: true },
      { texto: '1 pergunta ao Tutor IA 24/7 por dia', incluso: true },
      { texto: 'Diagnóstico de desempenho por matéria', incluso: true },
      { texto: '1 Raio-X de edital por mês', incluso: true },
      { texto: '1 PDF → até 5 flashcards por mês', incluso: true },
      { texto: 'Simulados ilimitados', incluso: false },
      { texto: 'Tutor IA 24/7 sem restrição', incluso: false },
      { texto: 'Plano de estudo por edital', incluso: false },
    ],
  },
  {
    id: 'premium',
    nome: 'Premium',
    subtitulo: 'Para quem estuda todo dia',
    preco_mensal: 19.90,
    preco_anual: 14.90,
    badge: null,
    cta: 'Assinar Premium',
    destaque: false,
    beneficios: [
      { texto: 'Todos os editais, sem limite', incluso: true },
      { texto: 'Simulados ilimitados', incluso: true },
      { texto: 'Tutor IA 24/7 — 30 mensagens/mês', incluso: true },
      { texto: 'Plano de estudo personalizado', incluso: true },
      { texto: 'Raio-X do edital ilimitado', incluso: true },
      { texto: 'Upload de 5 PDFs/mês → flashcards', incluso: true },
      { texto: 'Marca-texto em apostilas', incluso: true },
      { texto: 'Tutor IA 24/7 ilimitado', incluso: false },
      { texto: 'Plano de estudo por edital específico', incluso: false },
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    subtitulo: 'Para quem quer aprovação, não só estudo',
    preco_mensal: 29.90,
    preco_anual: 22.90,
    badge: 'Mais completo',
    cta: 'Assinar Elite',
    destaque: true,
    beneficios: [
      { texto: 'Tudo do Premium', incluso: true },
      { texto: 'Tutor IA 24/7 ilimitado', incluso: true },
      { texto: 'Plano de estudo por edital específico', incluso: true },
      { texto: 'Recomendação personalizada de concursos', incluso: true },
      { texto: 'Upload ilimitado de PDFs → flashcards', incluso: true },
      { texto: 'Análise de chance de aprovação em tempo real', incluso: true },
      { texto: 'Alertas prioritários de editais', incluso: true },
      { texto: 'Suporte prioritário', incluso: true },
    ],
  },
];

function fmt(valor: number) {
  return valor.toFixed(2).replace('.', ',');
}

export function SectionPlanos() {
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('mensal');

  return (
    <section id="planos" className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[#FF8400] text-[13px] font-bold uppercase tracking-widest mb-3">Planos e preços</p>
          <h2 className="text-[32px] md:text-[40px] font-black text-[#17375E] leading-tight"
            style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
            Simples, transparente, sem surpresas
          </h2>
          <p className="text-[17px] text-gray-500 mt-3">
            Cancele quando quiser. Sem fidelidade, sem taxa.
          </p>
        </div>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-[14px] font-semibold transition-colors ${
            periodo === 'mensal' ? 'text-[#17375E]' : 'text-gray-400'
          }`}>
            Mensal
          </span>

          <button
            onClick={() => setPeriodo(p => p === 'mensal' ? 'anual' : 'mensal')}
            aria-label="Alternar período de cobrança"
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
              periodo === 'anual' ? 'bg-[#17375E]' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
              periodo === 'anual' ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-semibold transition-colors ${
              periodo === 'anual' ? 'text-[#17375E]' : 'text-gray-400'
            }`}>
              Anual
            </span>
            {periodo === 'anual' && (
              <span className="bg-[#FF8400] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                até 25% off
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANOS.map(plano => (
            <div
              key={plano.id}
              className={`relative bg-white rounded-2xl p-6 flex flex-col gap-6 border-2 transition-all ${
                plano.destaque
                  ? 'border-[#17375E] shadow-xl shadow-[#17375E]/10 scale-[1.02]'
                  : 'border-gray-200'
              }`}
            >
              {/* Badge */}
              {plano.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#17375E] text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                    {plano.badge}
                  </span>
                </div>
              )}

              {/* Header */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{plano.nome}</p>
                <p className="text-[13px] text-gray-500">{plano.subtitulo}</p>
              </div>

              {/* Preço */}
              <div>
                {plano.preco_mensal === null ? (
                  <>
                    <span className="text-[40px] font-black text-[#17375E]"
                      style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
                      Grátis
                    </span>
                    <p className="text-[12px] text-gray-400 mt-1">para sempre</p>
                  </>
                ) : (
                  <>
                    {periodo === 'anual' && (
                      <p className="text-[13px] text-gray-400 line-through mb-0.5">
                        R${fmt(plano.preco_mensal)}/mês
                      </p>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14px] text-gray-500">R$</span>
                      <span className="text-[40px] font-black text-[#17375E]"
                        style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
                        {fmt(periodo === 'anual' ? plano.preco_anual! : plano.preco_mensal)}
                      </span>
                      <span className="text-[14px] text-gray-500">/mês</span>
                    </div>
                    {periodo === 'anual' ? (
                      <p className="text-[12px] text-[#FF8400] font-semibold mt-1">
                        Cobrado anualmente · você economiza R${
                          ((plano.preco_mensal - plano.preco_anual!) * 12).toFixed(0)
                        }/ano
                      </p>
                    ) : (
                      <p className="text-[12px] text-gray-400 mt-1">Cancele quando quiser</p>
                    )}
                  </>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/login"
                className={`block w-full py-3 rounded-xl text-[14px] font-bold text-center transition-all ${
                  plano.destaque
                    ? 'bg-[#17375E] hover:bg-[#0F2540]'
                    : plano.id === 'free'
                    ? 'bg-[#F4F1DA] text-[#17375E] hover:bg-[#ede9ca]'
                    : 'border-2 border-[#17375E] text-[#17375E] hover:bg-[#F4F1DA]'
                }`}
                style={plano.destaque ? { color: '#ffffff' } : undefined}
              >
                {plano.cta}
              </Link>

              {/* Benefícios */}
              <ul className="flex flex-col gap-2.5">
                {plano.beneficios.map((b, i) => (
                  <li key={i} className={`flex items-start gap-2.5 text-[13px] ${
                    b.incluso ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <span className={`flex-shrink-0 mt-0.5 font-bold ${
                      b.incluso ? 'text-[#FF8400]' : 'text-gray-300'
                    }`}>
                      {b.incluso ? '✓' : '○'}
                    </span>
                    <span className={b.incluso ? '' : 'line-through opacity-50'}>
                      {b.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Linha de argumento */}
        <div className="mt-10 text-center max-w-xl mx-auto">
          <p className="text-[14px] text-gray-500 leading-relaxed">
            A maioria das ferramentas de estudo entrega questões.{' '}
            <strong className="text-[#17375E]">
              O Tutor entrega direção — e direcionar o estudo é o que separa quem estuda de quem é aprovado.
            </strong>
          </p>
        </div>

        <p className="text-center text-[12px] text-gray-300 mt-6">
          Todos os planos incluem acesso ao dashboard, editais e painel de desempenho.
          Planos pagos com IA de alta tecnologia.
        </p>
      </div>
    </section>
  );
}
