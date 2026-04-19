'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  editalId: string;
  pioreMateria: string | null;
}

export function RecomendacaoIA({ editalId, pioreMateria }: Props) {
  const [rec, setRec] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/editais/${editalId}/recomendacao`)
      .then(r => r.json())
      .then(d => setRec(d.recomendacao ?? null))
      .catch(() => setRec(null))
      .finally(() => setLoading(false));
  }, [editalId]);

  const fallback = pioreMateria
    ? `Priorize ${pioreMateria} — é onde você tem o maior gap em relação ao perfil de aprovados. Faça simulados focados nessa matéria para subir seu desempenho rapidamente.`
    : 'Faça simulados das matérias deste edital para receber uma recomendação personalizada.';

  return (
    <div className="bg-(--accent-light) border border-(--accent)/20 rounded-(--radius) p-4 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined filled text-(--accent)" style={{ fontSize: 18 }}>auto_awesome</span>
        <h3 className="text-[13px] font-bold text-(--accent)">Recomendação de estudo</h3>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2 mt-1">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>
      ) : (
        <p className="text-[13px] text-(--ink-2) leading-relaxed">
          {rec ?? fallback}
        </p>
      )}
    </div>
  );
}
