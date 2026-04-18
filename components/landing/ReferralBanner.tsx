'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralBanner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [nomeIndicador, setNomeIndicador] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/lista-espera/referral/${encodeURIComponent(ref)}`)
      .then(r => r.json())
      .then(d => { if (d.nome) setNomeIndicador(d.nome); })
      .catch(() => {});
  }, [ref]);

  if (!ref || nomeIndicador === null) return null;

  return (
    <div className="w-full bg-[#EEF0FF] border-b border-[rgba(43,61,232,0.15)] px-4 py-3">
      <p className="text-center text-[13px] text-[#2B3DE8] font-semibold">
        🎁 <strong>{nomeIndicador}</strong> te convidou! Cadastre-se e ambos ganham benefícios exclusivos.
      </p>
    </div>
  );
}
