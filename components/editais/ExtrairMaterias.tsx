'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ExtrairMaterias({ editalId }: { editalId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'erro'>('idle');
  const router = useRouter();

  async function extrair() {
    setStatus('loading');
    try {
      const r = await fetch(`/api/editais/${editalId}/extrair-materias`, { method: 'POST' });
      if (r.ok) {
        router.refresh();
      } else {
        setStatus('erro');
      }
    } catch {
      setStatus('erro');
    }
  }

  if (status === 'erro') {
    return (
      <p className="text-[13px] text-(--danger) text-center max-w-xs">
        Não foi possível extrair as matérias. O PDF do edital pode não estar disponível ainda.
      </p>
    );
  }

  return (
    <button
      onClick={extrair}
      disabled={status === 'loading'}
      className="flex items-center gap-2 px-4 py-2 bg-(--accent) text-white text-[13px] font-semibold rounded-(--radius-sm) disabled:opacity-60 hover:opacity-90 transition-opacity"
      style={{ color: '#ffffff' }}
    >
      {status === 'loading' ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Extraindo matérias…
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
          Extrair matérias agora
        </>
      )}
    </button>
  );
}
