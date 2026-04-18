'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SucessoCadastro } from './SucessoCadastro';

const CARGOS = ['INSS', 'PRF', 'Receita Federal', 'Magistratura', 'Polícia Civil', 'Tribunais', 'Banco Central', 'Outro'];

interface Props {
  origem: 'hero' | 'footer';
  tema?: 'light' | 'dark';
}

export function FormularioCadastro({ origem, tema = 'light' }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle');
  const [posicao, setPosicao] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [totalIndicacoes, setTotalIndicacoes] = useState(0);
  const [erro, setErro] = useState('');

  const searchParams = useSearchParams();
  const ref           = searchParams.get('ref');
  const utmSource     = searchParams.get('utm_source');
  const utmCampaign   = searchParams.get('utm_campaign');
  const utmMedium     = searchParams.get('utm_medium');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEstado('loading');
    try {
      const params = new URLSearchParams();
      if (ref)          params.set('ref', ref);
      if (utmSource)    params.set('utm_source', utmSource);
      if (utmCampaign)  params.set('utm_campaign', utmCampaign);
      if (utmMedium)    params.set('utm_medium', utmMedium);
      const qs = params.toString();
      const url = `/api/lista-espera${qs ? `?${qs}` : ''}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cargoInteresse: cargo, origem }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.erro ?? 'Algo deu errado.'); setEstado('erro'); return; }
      setPosicao(d.posicao);
      setReferralCode(d.referralCode);
      setTotalIndicacoes(d.totalIndicacoes ?? 0);
      setEstado('ok');
      // Dispara evento de conversão para o Meta Pixel
      if (typeof window !== 'undefined' && (window as { fbq?: (...a: unknown[]) => void }).fbq) {
        (window as { fbq?: (...a: unknown[]) => void }).fbq!('track', 'Lead', {
          content_name: 'Lista de espera O Tutor',
          content_category: 'Concurso público',
        });
      }
    } catch {
      setErro('Sem conexão. Tente novamente.');
      setEstado('erro');
    }
  }

  const isDark = tema === 'dark';
  const inputCls = `w-full px-4 py-3 rounded-xl border text-[15px] outline-none transition-all bg-white text-[#0D1117] placeholder:text-[#7A7D8A] focus:border-[#2B3DE8] focus:ring-2 focus:ring-[#2B3DE8]/20 ${isDark ? 'border-white/20' : 'border-[rgba(0,0,0,0.12)]'}`;

  if (estado === 'ok' && posicao && referralCode) {
    return <SucessoCadastro posicao={posicao} nome={nome} referralCode={referralCode} totalIndicacoes={totalIndicacoes} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <input type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required className={inputCls} />
      <input type="email" placeholder="Seu melhor e-mail" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
      <select value={cargo} onChange={e => setCargo(e.target.value)} className={inputCls + ' cursor-pointer appearance-none'}>
        <option value="">Qual concurso você busca? (opcional)</option>
        {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {erro && <p className="text-[13px] text-red-400 px-1">{erro}</p>}
      <button
        type="submit"
        disabled={estado === 'loading'}
        className="w-full py-4 bg-[#2B3DE8] text-white font-bold text-[16px] rounded-xl hover:bg-[#1E30D4] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#2B3DE8]/25 mt-1"
      >
        {estado === 'loading' ? 'Cadastrando...' : 'Quero meu acesso gratuito →'}
      </button>
      <p className={`text-center text-[12px] ${isDark ? 'text-white/50' : 'text-[#7A7D8A]'}`}>
        Sem cartão de crédito · Testadores ganham o Premium grátis por 3 meses
      </p>
    </form>
  );
}
