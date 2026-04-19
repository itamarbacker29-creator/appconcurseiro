'use client';

import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

interface Edital {
  id: string;
  orgao: string;
  cargo: string;
  escolaridade: string;
  vagas: number;
  salario: number;
  estado: string;
  area: string;
  data_inscricao_fim: string;
  link_inscricao: string | null;
  link_fonte: string | null;
  banca: string;
  coletado_em: string;
}

// Federal/Estadual/Municipal filtram pelo campo `nivel`; os demais filtram por `area`
const FILTROS = ['Todos', 'Federal', 'Estadual', 'Municipal', 'Segurança', 'Tributário', 'Saúde', 'Educação', 'Judiciário', 'Tecnologia'];
const FILTROS_NIVEL = new Set(['Federal', 'Estadual', 'Municipal']);
const FILTRO_AREA: Record<string, string> = {
  'Segurança': 'seguranca',
  'Tributário': 'tributario',
  'Saúde': 'saude',
  'Educação': 'educacao',
  'Judiciário': 'judiciario',
  'Tecnologia': 'tecnologia',
};
const ESCOLARIDADES = ['Todos', 'fundamental', 'medio', 'superior'];
const ORDENS = [
  { val: 'salario', label: 'Maior salário' },
  { val: 'recentes', label: 'Mais recentes' },
  { val: 'prazo', label: 'Prazo mais próximo' },
];

export default function EditaisPage() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [area, setArea] = useState('Todos');
  const [escolaridade, setEscolaridade] = useState('Todos');
  const [apenasAbertas, setApenasAbertas] = useState(false);
  const [ordem, setOrdem] = useState('salario');
  const [salvos, setSalvos] = useState<string[]>([]);
  const buscaDeferida = useDeferredValue(busca);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('editais')
        .select('id,orgao,cargo,escolaridade,vagas,salario,estado,area,nivel,data_inscricao_fim,link_inscricao,link_fonte,banca,coletado_em')
        .eq('status', 'ativo');

      if (area !== 'Todos') {
        if (FILTROS_NIVEL.has(area)) {
          query = query.eq('nivel', area.toLowerCase());
        } else {
          query = query.eq('area', FILTRO_AREA[area] ?? area.toLowerCase());
        }
      }
      if (escolaridade !== 'Todos') query = query.eq('escolaridade', escolaridade);
      if (apenasAbertas) query = query.gte('data_inscricao_fim', new Date().toISOString().split('T')[0]);
      if (buscaDeferida) query = query.or(`orgao.ilike.%${buscaDeferida}%,cargo.ilike.%${buscaDeferida}%`);

      // NULLS LAST: editais sem salário ficam no fim
      if (ordem === 'salario') query = query.order('salario', { ascending: false, nullsFirst: false });
      else if (ordem === 'prazo') query = query.order('data_inscricao_fim', { ascending: true, nullsFirst: false });
      else query = query.order('coletado_em', { ascending: false, nullsFirst: false });

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setEditais(data ?? []);
    } catch {
      setEditais([]);
    } finally {
      setLoading(false);
    }
  }, [area, escolaridade, apenasAbertas, buscaDeferida, ordem]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('editais_salvos').select('edital_id').eq('user_id', user.id)
        .then(({ data }) => setSalvos((data ?? []).map(d => d.edital_id)));
    });
  }, []);

  async function toggleSalvar(editalId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (salvos.includes(editalId)) {
      await supabase.from('editais_salvos').delete().match({ user_id: user.id, edital_id: editalId });
      setSalvos(prev => prev.filter(id => id !== editalId));
    } else {
      await supabase.from('editais_salvos').insert({ user_id: user.id, edital_id: editalId });
      setSalvos(prev => [...prev, editalId]);
    }
  }

  function urgencia(dataFim: string): { dias: number; urgente: boolean; novo: boolean } {
    const fim = new Date(dataFim);
    const dias = Math.ceil((fim.getTime() - Date.now()) / 86400000);
    return { dias, urgente: dias <= 5 && dias >= 0, novo: false };
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-(--ink)">Editais</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Monitoramento automático de concursos públicos.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-6">
        <Input
          placeholder="Buscar por órgão ou cargo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(a => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
                area === a ? 'bg-(--accent) text-white border-(--accent)' : 'border-(--border-strong) text-(--ink-3) hover:border-(--accent)'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={escolaridade}
            onChange={e => setEscolaridade(e.target.value)}
            className="h-8 px-3 rounded-(--radius-sm) border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none"
          >
            {ESCOLARIDADES.map(e => <option key={e} value={e}>{e === 'Todos' ? 'Escolaridade' : e}</option>)}
          </select>
          <select
            value={ordem}
            onChange={e => setOrdem(e.target.value)}
            className="h-8 px-3 rounded-(--radius-sm) border border-(--border-strong) text-[12px] bg-(--surface) text-(--ink) outline-none"
          >
            {ORDENS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-[12px] text-(--ink-2) cursor-pointer">
            <input
              type="checkbox"
              checked={apenasAbertas}
              onChange={e => setApenasAbertas(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Inscrições abertas
          </label>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : editais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum edital encontrado.</p>
          <p className="text-[13px] text-(--ink-3) mt-1">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {editais.map(e => {
            const { dias, urgente } = e.data_inscricao_fim ? urgencia(e.data_inscricao_fim) : { dias: -1, urgente: false };
            const isSalvo = salvos.includes(e.id);
            const isNovo = (Date.now() - new Date(e.coletado_em).getTime()) < 86400000;

            return (
              <Card key={e.id} padding="md" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{e.orgao}</span>
                      {isNovo && <Badge variant="success" className="text-[9px]">Novo</Badge>}
                    </div>
                    <Link href={`/editais/${e.id}`}>
                      <h3 className="text-[14px] font-bold text-(--ink) hover:text-(--accent) transition-colors leading-tight">{e.cargo}</h3>
                    </Link>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {e.escolaridade && <Badge variant="default">{e.escolaridade}</Badge>}
                      {e.vagas && <span className="text-[11px] text-(--ink-3)">{e.vagas.toLocaleString()} vagas</span>}
                      {e.banca && <span className="text-[11px] text-(--ink-3)">{e.banca}</span>}
                      {e.estado && <span className="text-[11px] text-(--ink-3)">{e.estado}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {e.salario && (
                      <span className="text-[14px] font-bold text-(--teal)">
                        R$ {e.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <button
                      onClick={() => toggleSalvar(e.id)}
                      className={`text-[18px] transition-colors ${isSalvo ? 'text-red-500' : 'text-(--ink-3) hover:text-red-400'}`}
                      title={isSalvo ? 'Remover dos salvos' : 'Salvar edital'}
                    >
                      {isSalvo ? '♥' : '♡'}
                    </button>
                  </div>
                </div>

                {e.data_inscricao_fim && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${urgente ? 'text-red-500' : 'text-(--ink-3)'}`}>
                    {urgente && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                    Inscrições até {new Date(e.data_inscricao_fim).toLocaleDateString('pt-BR')}
                    {dias >= 0 && <span className="ml-1">({dias} dia{dias !== 1 ? 's' : ''})</span>}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {e.link_inscricao ? (
                    <a href={e.link_inscricao} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="primary">Inscrever-se ↗</Button>
                    </a>
                  ) : e.link_fonte ? (
                    <a href={e.link_fonte} target="_blank" rel="noopener noreferrer" title="Link do portal de origem — procure o link oficial de inscrição nesta página">
                      <Button size="sm" variant="ghost">Ver anúncio do edital ↗</Button>
                    </a>
                  ) : null}
                  <Link href={`/editais/${e.id}`}>
                    <Button size="sm" variant="ghost">Ver detalhes</Button>
                  </Link>
                  {isSalvo && (
                    <Link href={`/simulado?edital=${e.id}`}>
                      <Button size="sm" variant="ghost">Iniciar simulado</Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
