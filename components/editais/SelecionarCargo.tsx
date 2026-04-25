'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Cargo {
  id: string;
  nome: string;
  salario: number | null;
  vagas: number | null;
}

interface Props {
  editalId: string;
}

export function SelecionarCargo({ editalId }: Props) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargoSalvo, setCargoSalvo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: cargosData }, { data: salvo }] = await Promise.all([
        supabase.from('cargos').select('id,nome,salario,vagas').eq('edital_id', editalId).order('nome'),
        supabase.from('editais_salvos').select('cargo_id').eq('user_id', user.id).eq('edital_id', editalId).maybeSingle(),
      ]);

      setCargos(cargosData ?? []);
      setCargoSalvo(salvo?.cargo_id ?? null);
    }
    carregar();
  }, [editalId]);

  async function selecionarCargo(cargoId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSalvando(true);
    await supabase
      .from('editais_salvos')
      .update({ cargo_id: cargoId })
      .match({ user_id: user.id, edital_id: editalId });
    setCargoSalvo(cargoId);
    setSalvando(false);
  }

  if (cargos.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-(--surface-2) rounded-(--radius-sm) border border-(--border)">
      <p className="text-[12px] font-semibold text-(--ink-2) mb-2">
        Qual cargo você está disputando?
      </p>
      <div className="flex flex-col gap-1.5">
        {cargos.map(c => (
          <button
            key={c.id}
            onClick={() => selecionarCargo(c.id)}
            disabled={salvando}
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm border text-left text-[12px] transition-all ${
              cargoSalvo === c.id
                ? 'bg-(--accent-light) border-(--accent)/30 text-(--accent-text)'
                : 'bg-(--surface) border-(--border) text-(--ink-2) hover:border-(--accent)/40'
            }`}
          >
            <span className="font-medium">{c.nome}</span>
            <div className="flex items-center gap-2 shrink-0 text-(--ink-3)">
              {c.salario && (
                <span>{c.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              )}
              {cargoSalvo === c.id && (
                <span className="material-symbols-outlined filled text-(--accent) text-[16px]">check_circle</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
