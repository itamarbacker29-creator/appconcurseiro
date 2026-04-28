'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ExtrairMateriasAuto({ editalId }: { editalId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/editais/${editalId}/extrair-materias`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelado && data?.materias?.length > 0) router.refresh();
      })
      .catch(() => { /* falha silenciosa */ });
    return () => { cancelado = true; };
  }, [editalId, router]);

  return null;
}
