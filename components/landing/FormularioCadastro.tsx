'use client';

import { useState } from 'react';

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
  const [erro, setErro] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEstado('loading');
    try {
      const r = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cargoInteresse: cargo, origem }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.erro ?? 'Algo deu errado.'); setEstado('erro'); return; }
      setPosicao(d.posicao);
      setEstado('ok');
    } catch {
      setErro('Sem conexão. Tente novamente.');
      setEstado('erro');
    }
  }

  const isDark = tema === 'dark';
  const inputCls = `w-full px-4 py-3 rounded-xl border text-[15px] outline-none transition-all bg-white text-[#0D1117] placeholder:text-[#7A7D8A] focus:border-[#2B3DE8] focus:ring-2 focus:ring-[#2B3DE8]/20 ${isDark ? 'border-white/20' : 'border-[rgba(0,0,0,0.12)]'}`;

  if (estado === 'ok') {
    return (
      <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/10 border border-white/20' : 'bg-[#E4F7F0] border border-[#006c4a]/20'}`}>
        <div className="text-4xl mb-4">🎉</div>
        <h3 className={`text-[20px] font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0D1117]'}`}>Você está dentro!</h3>
        {posicao && (
          <p className={`text-[15px] mb-1 ${isDark ? 'text-white/80' : 'text-[#3A3D4A]'}`}>
            Você é o <strong className="text-[#2B3DE8]">#{posicao}</strong> na fila.
          </p>
        )}
        <p className={`text-[13px] ${isDark ? 'text-white/60' : 'text-[#7A7D8A]'}`}>Confira seu e-mail para a confirmação.</p>
      </div>
    );
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
        Sem cartão de crédito · Os 50 primeiros ganham 3 meses do Premium grátis
      </p>
    </form>
  );
}
