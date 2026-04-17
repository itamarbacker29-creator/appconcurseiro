'use client';

import { useState, useEffect, useRef } from 'react';

const VAGAS_PRESENTE = 50;

const CARGOS = [
  'INSS', 'PRF', 'Receita Federal', 'Magistratura',
  'Polícia Civil', 'Tribunais', 'Banco Central', 'Outro',
];

interface WaitlistFormProps {
  onSuccess?: (posicao: number) => void;
}

export function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle');
  const [posicao, setPosicao] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function fetchTotal() {
      try {
        const r = await fetch('/api/lista-espera');
        const d = await r.json();
        setTotal(d.total ?? 0);
      } catch {}
    }
    fetchTotal();
    const iv = setInterval(fetchTotal, 30_000);
    return () => clearInterval(iv);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEstado('loading');
    try {
      const r = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cargoInteresse: cargo }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? 'Algo deu errado. Tente novamente.');
        setEstado('erro');
        return;
      }
      setPosicao(d.posicao);
      setEstado('ok');
      setTotal(t => (t ?? 0) + 1);
      onSuccess?.(d.posicao);
    } catch {
      setErro('Sem conexão. Tente novamente.');
      setEstado('erro');
    }
  }

  if (estado === 'ok') {
    return (
      <div className="w-full max-w-[480px] mx-auto rounded-2xl bg-white border border-[rgba(0,0,0,0.08)] p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#EEF0FF] flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#2B3DE8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-[20px] font-bold text-[#0D1117] mb-2">Você está dentro!</h3>
        {posicao && (
          <p className="text-[15px] text-[#3A3D4A] mb-4">
            Você é o <strong className="text-[#2B3DE8]">#{posicao}</strong> na lista.
            {posicao <= VAGAS_PRESENTE && (
              <span className="block mt-1 text-[13px] font-semibold text-[#2B3DE8]">
                🎁 Você garantiu os 3 meses do Premium grátis!
              </span>
            )}
          </p>
        )}
        <p className="text-[13px] text-[#7A7D8A]">
          Enviamos um e-mail de confirmação. Avisaremos quando o acesso abrir.
        </p>
      </div>
    );
  }

  const vagasRestantes = total !== null ? Math.max(0, VAGAS_PRESENTE - total) : null;
  const progresso = total !== null ? Math.min(100, (total / VAGAS_PRESENTE) * 100) : 0;

  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Progresso das vagas */}
      {total !== null && (
        <div className="mb-5">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="font-semibold text-[#3A3D4A]">
              {vagasRestantes !== null && vagasRestantes > 0
                ? `Restam ${vagasRestantes} vagas com o presente`
                : 'Vagas com presente esgotadas'}
            </span>
            <span className="text-[#7A7D8A]">{total}/{VAGAS_PRESENTE}</span>
          </div>
          <div className="h-2 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2B3DE8] rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-[15px] text-[#0D1117] placeholder:text-[#7A7D8A] outline-none focus:border-[#2B3DE8] focus:ring-2 focus:ring-[#2B3DE8]/20 transition-all bg-white"
        />
        <input
          type="email"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-[15px] text-[#0D1117] placeholder:text-[#7A7D8A] outline-none focus:border-[#2B3DE8] focus:ring-2 focus:ring-[#2B3DE8]/20 transition-all bg-white"
        />
        <select
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-[15px] text-[#7A7D8A] outline-none focus:border-[#2B3DE8] focus:ring-2 focus:ring-[#2B3DE8]/20 transition-all bg-white appearance-none cursor-pointer"
        >
          <option value="">Qual concurso você busca? (opcional)</option>
          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {erro && (
          <p className="text-[13px] text-red-500 px-1">{erro}</p>
        )}

        <button
          type="submit"
          disabled={estado === 'loading'}
          className="w-full py-3.5 rounded-xl bg-[#2B3DE8] text-white font-bold text-[16px] hover:bg-[#2231D0] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-[#2B3DE8]/30 mt-1"
        >
          {estado === 'loading' ? 'Cadastrando...' : 'Quero meu acesso gratuito →'}
        </button>
      </form>

      <p className="text-center text-[12px] text-[#7A7D8A] mt-3">
        Sem cartão de crédito · Os {VAGAS_PRESENTE} primeiros ganham 3 meses do Premium grátis
      </p>

      {total !== null && (
        <p className="text-center text-[13px] text-[#3A3D4A] font-medium mt-2">
          🔥 {total} {total === 1 ? 'pessoa já' : 'pessoas já'} na lista
        </p>
      )}
    </div>
  );
}
