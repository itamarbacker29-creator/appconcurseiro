'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SelecionarCargo } from './SelecionarCargo';

interface Props {
  editalId: string;
}

export function AcoesSalvarInscrito({ editalId }: Props) {
  const [salvo, setSalvo] = useState(false);
  const [inscrito, setInscrito] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvandoInscrito, setSalvandoInscrito] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCarregando(false); return; }

      const { data } = await supabase
        .from('editais_salvos')
        .select('inscrito')
        .eq('user_id', user.id)
        .eq('edital_id', editalId)
        .maybeSingle();

      setSalvo(!!data);
      setInscrito(data?.inscrito ?? false);
      setCarregando(false);
    }
    carregar();
  }, [editalId]);

  async function toggleSalvo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (salvo) {
      await supabase.from('editais_salvos').delete().match({ user_id: user.id, edital_id: editalId });
      setSalvo(false);
      setInscrito(false);
    } else {
      await supabase.from('editais_salvos').insert({ user_id: user.id, edital_id: editalId, inscrito: false });
      setSalvo(true);
    }
  }

  async function toggleInscrito() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSalvandoInscrito(true);

    const novoInscrito = !inscrito;

    if (!salvo) {
      // salvar automaticamente ao marcar como inscrito
      await supabase.from('editais_salvos').insert({ user_id: user.id, edital_id: editalId, inscrito: novoInscrito });
      setSalvo(true);
    } else {
      await supabase.from('editais_salvos').update({ inscrito: novoInscrito }).match({ user_id: user.id, edital_id: editalId });
    }

    setInscrito(novoInscrito);
    setSalvandoInscrito(false);
  }

  if (carregando) return null;

  return (
    <div className="mt-1">
    <div className="flex flex-wrap items-center gap-3">
      {/* Botão Salvar */}
      <button
        onClick={toggleSalvo}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
          salvo
            ? 'bg-(--accent-light) text-(--accent-text) border-(--accent)/30'
            : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent) hover:text-(--accent)'
        }`}
      >
        <span className={`material-symbols-outlined text-[17px] ${salvo ? 'filled' : ''}`}>bookmark</span>
        {salvo ? 'Salvo' : 'Salvar edital'}
      </button>

      {/* Botão Inscrito */}
      <button
        onClick={toggleInscrito}
        disabled={salvandoInscrito}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-all disabled:opacity-60 ${
          inscrito
            ? 'bg-success-bg text-success border-success/30'
            : 'border-(--border-strong) text-(--ink-2) hover:border-success hover:text-success'
        }`}
      >
        <span className={`material-symbols-outlined text-[17px] ${inscrito ? 'filled' : ''}`}>
          {inscrito ? 'how_to_reg' : 'person_add'}
        </span>
        {inscrito ? 'Inscrito ✓' : 'Marcar como inscrito'}
      </button>

      {inscrito && (
        <span className="text-[11px] text-(--ink-3) italic">
          O countdown da prova é exibido no seu Plano de Estudo.
        </span>
      )}
    </div>
    {salvo && <SelecionarCargo editalId={editalId} />}
    </div>
  );
}
