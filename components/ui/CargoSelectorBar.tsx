'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Edital {
  id: string;
  orgao: string;
  cargo: string;
}

interface Props {
  basePath: string;
  selectedId?: string | null;
}

export function CargoSelectorBar({ basePath, selectedId }: Props) {
  const router = useRouter();
  const [editais, setEditais] = useState<Edital[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('editais_salvos')
        .select('edital_id, editais(id, orgao, cargo)')
        .eq('user_id', user.id)
        .limit(20)
        .then(({ data }) => {
          const list: Edital[] = (data ?? [])
            .map((d: { editais: Edital | null }) => d.editais)
            .filter((e): e is Edital => !!e);
          setEditais(list);
        });
    });
  }, []);

  if (editais.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 16 }}>filter_list</span>
      <select
        value={selectedId ?? ''}
        onChange={e => {
          const val = e.target.value;
          router.push(val ? `${basePath}?edital=${val}` : basePath);
        }}
        className="h-8 rounded-sm border border-(--border-strong) px-2 text-[12px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
      >
        <option value="">Todas as matérias</option>
        {editais.map(e => (
          <option key={e.id} value={e.id}>
            {e.orgao} — {e.cargo.length > 40 ? e.cargo.slice(0, 40) + '…' : e.cargo}
          </option>
        ))}
      </select>
    </div>
  );
}
