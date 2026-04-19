'use client';

import { useState, useEffect, useCallback, useDeferredValue, useRef } from 'react';
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
  nivel: string;
  data_inscricao_fim: string;
  link_inscricao: string | null;
  link_fonte: string | null;
  banca: string;
  coletado_em: string;
}

const FILTROS_AREA = ['Todos', 'Federal', 'Estadual', 'Municipal', 'Segurança', 'Tributário', 'Saúde', 'Educação', 'Judiciário', 'Tecnologia'];
const FILTROS_NIVEL = new Set(['Federal', 'Estadual', 'Municipal']);
const FILTRO_AREA_MAP: Record<string, string> = {
  'Segurança': 'seguranca', 'Tributário': 'tributario', 'Saúde': 'saude',
  'Educação': 'educacao', 'Judiciário': 'judiciario', 'Tecnologia': 'tecnologia',
};
const ESTADOS = ['Todos','AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO','Nacional'];
const BANCAS = ['Todos','CEBRASPE','FGV','FCC','VUNESP','IBFC','IDECAN','AOCP','QUADRIX','IADES','FUNDATEC','NUBES','OBJETIVA'];
const ESCOLARIDADES = ['Todos', 'fundamental', 'medio', 'superior'];
const ORDENS = [
  { val: 'salario', label: 'Maior salário' },
  { val: 'recentes', label: 'Mais recentes' },
  { val: 'prazo', label: 'Prazo mais próximo' },
];
const POR_PAGINA = 20;

export default function EditaisPage() {
  const [aba, setAba] = useState<'todos' | 'salvos'>('todos');
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [offset, setOffset] = useState(0);

  const [busca, setBusca] = useState('');
  const [area, setArea] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [banca, setBanca] = useState('Todos');
  const [escolaridade, setEscolaridade] = useState('Todos');
  const [apenasAbertas, setApenasAbertas] = useState(false);
  const [ordem, setOrdem] = useState('salario');

  const [salvos, setSalvos] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const salvosCarregados = useRef(false);
  const buscaDeferida = useDeferredValue(busca);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from('editais_salvos').select('edital_id').eq('user_id', user.id)
        .then(({ data }) => {
          const ids = (data ?? []).map(d => d.edital_id);
          setSalvos(ids);
          salvosCarregados.current = true;
        });
    });
  }, []);

  const buildQuery = useCallback((off: number, salvosList: string[]) => {
    if (aba === 'salvos') {
      if (salvosList.length === 0) return null;
      return supabase
        .from('editais')
        .select('id,orgao,cargo,escolaridade,vagas,salario,estado,area,nivel,data_inscricao_fim,link_inscricao,link_fonte,banca,coletado_em')
        .in('id', salvosList)
        .range(off, off + POR_PAGINA - 1);
    }

    let q = supabase
      .from('editais')
      .select('id,orgao,cargo,escolaridade,vagas,salario,estado,area,nivel,data_inscricao_fim,link_inscricao,link_fonte,banca,coletado_em')
      .eq('status', 'ativo');

    if (area !== 'Todos') {
      if (FILTROS_NIVEL.has(area)) q = q.eq('nivel', area.toLowerCase());
      else q = q.eq('area', FILTRO_AREA_MAP[area] ?? area.toLowerCase());
    }
    if (estado !== 'Todos') q = q.eq('estado', estado);
    if (banca !== 'Todos') q = q.ilike('banca', `%${banca}%`);
    if (escolaridade !== 'Todos') q = q.eq('escolaridade', escolaridade);
    if (apenasAbertas) q = q.gte('data_inscricao_fim', new Date().toISOString().split('T')[0]);
    if (buscaDeferida) q = q.or(`orgao.ilike.%${buscaDeferida}%,cargo.ilike.%${buscaDeferida}%`);

    if (ordem === 'salario') q = q.order('salario', { ascending: false, nullsFirst: false });
    else if (ordem === 'prazo') q = q.order('data_inscricao_fim', { ascending: true, nullsFirst: false });
    else q = q.order('coletado_em', { ascending: false, nullsFirst: false });

    return q.range(off, off + POR_PAGINA - 1);
  }, [aba, area, estado, banca, escolaridade, apenasAbertas, buscaDeferida, ordem]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    const q = buildQuery(0, salvos);
    if (!q) { setEditais([]); setTemMais(false); setLoading(false); return; }
    try {
      const { data, error } = await q;
      if (error) throw error;
      setEditais(data ?? []);
      setTemMais((data?.length ?? 0) === POR_PAGINA);
    } catch {
      setEditais([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, salvos]);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarMais() {
    const novoOffset = offset + POR_PAGINA;
    setCarregandoMais(true);
    const q = buildQuery(novoOffset, salvos);
    if (!q) { setCarregandoMais(false); return; }
    try {
      const { data } = await q;
      setEditais(prev => [...prev, ...(data ?? [])]);
      setTemMais((data?.length ?? 0) === POR_PAGINA);
      setOffset(novoOffset);
    } finally {
      setCarregandoMais(false);
    }
  }

  async function toggleSalvar(editalId: string) {
    if (!userId) return;
    if (salvos.includes(editalId)) {
      await supabase.from('editais_salvos').delete().match({ user_id: userId, edital_id: editalId });
      setSalvos(prev => prev.filter(id => id !== editalId));
      if (aba === 'salvos') setEditais(prev => prev.filter(e => e.id !== editalId));
    } else {
      await supabase.from('editais_salvos').insert({ user_id: userId, edital_id: editalId });
      setSalvos(prev => [...prev, editalId]);
    }
  }

  function urgencia(dataFim: string) {
    const dias = Math.ceil((new Date(dataFim).getTime() - Date.now()) / 86400000);
    return { dias, urgente: dias <= 5 && dias >= 0, encerrado: dias < 0 };
  }

  const filtrosAtivos = [
    area !== 'Todos' && { label: area, clear: () => setArea('Todos') },
    estado !== 'Todos' && { label: estado, clear: () => setEstado('Todos') },
    banca !== 'Todos' && { label: banca, clear: () => setBanca('Todos') },
    escolaridade !== 'Todos' && { label: escolaridade, clear: () => setEscolaridade('Todos') },
    apenasAbertas && { label: 'Abertas', clear: () => setApenasAbertas(false) },
    busca && { label: `"${busca}"`, clear: () => setBusca('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  function limparTudo() {
    setArea('Todos'); setEstado('Todos'); setBanca('Todos');
    setEscolaridade('Todos'); setApenasAbertas(false); setBusca('');
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-(--ink)">Editais</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Monitoramento automático de concursos públicos.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-(--surface-2) rounded-(--radius-sm) w-fit">
        {(['todos', 'salvos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`px-4 py-1.5 rounded-(--radius-sm) text-[13px] font-semibold transition-all ${
              aba === t ? 'bg-(--surface) text-(--ink) shadow-sm' : 'text-(--ink-3) hover:text-(--ink-2)'
            }`}
          >
            {t === 'todos' ? 'Todos' : `Salvos${salvos.length > 0 ? ` (${salvos.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Filtros — ocultos na aba Salvos */}
      {aba === 'todos' && (
        <div className="flex flex-col gap-3 mb-5">
          <Input
            placeholder="Buscar por órgão ou cargo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          {/* Chips de área */}
          <div className="flex flex-wrap gap-2">
            {FILTROS_AREA.map(a => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
                  area === a
                    ? 'bg-(--accent) text-white border-(--accent)'
                    : 'border-(--border-strong) text-(--ink-3) hover:border-(--accent)'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { val: estado, set: setEstado, opts: ESTADOS, placeholder: 'Estado' },
              { val: banca, set: setBanca, opts: BANCAS, placeholder: 'Banca' },
              { val: escolaridade, set: setEscolaridade, opts: ESCOLARIDADES, placeholder: 'Escolaridade' },
            ] as { val: string; set: (v: string) => void; opts: string[]; placeholder: string }[]).map(({ val, set, opts, placeholder }) => (
              <select
                key={placeholder}
                value={val}
                onChange={e => set(e.target.value)}
                className={`h-8 px-3 rounded-(--radius-sm) border text-[12px] bg-(--surface) text-(--ink) outline-none transition-colors ${
                  val !== 'Todos' ? 'border-(--accent) text-(--accent) font-semibold' : 'border-(--border-strong)'
                }`}
              >
                {opts.map(o => <option key={o} value={o}>{o === 'Todos' ? placeholder : o}</option>)}
              </select>
            ))}
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

          {/* Chips de filtros ativos */}
          {filtrosAtivos.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-(--ink-3) font-medium shrink-0">Filtrando:</span>
              {filtrosAtivos.map(f => (
                <button
                  key={f.label}
                  onClick={f.clear}
                  className="flex items-center gap-1 px-2 py-0.5 bg-(--accent-light) text-(--accent) rounded-full text-[11px] font-semibold hover:bg-(--accent) hover:text-white transition-all"
                >
                  {f.label} ✕
                </button>
              ))}
              <button
                onClick={limparTudo}
                className="text-[11px] text-(--ink-3) hover:text-(--danger) transition-colors underline"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : editais.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-2">
          {aba === 'salvos' ? (
            <>
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 40 }}>bookmark</span>
              <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum edital salvo ainda.</p>
              <button
                onClick={() => setAba('todos')}
                className="text-[13px] text-(--accent) hover:underline font-medium"
              >
                Explorar todos os editais →
              </button>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 40 }}>search_off</span>
              <p className="text-[15px] font-semibold text-(--ink-2)">Nenhum edital encontrado.</p>
              {filtrosAtivos.length > 0 ? (
                <button onClick={limparTudo} className="text-[13px] text-(--accent) hover:underline font-medium">
                  Limpar filtros
                </button>
              ) : (
                <p className="text-[13px] text-(--ink-3)">Tente ajustar os filtros.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-[12px] text-(--ink-3) mb-3">
            {editais.length} edital{editais.length !== 1 ? 'is' : ''}{temMais ? '+' : ''}
          </p>
          <div className="flex flex-col gap-3">
            {editais.map(e => {
              const { dias, urgente, encerrado } = e.data_inscricao_fim
                ? urgencia(e.data_inscricao_fim)
                : { dias: -1, urgente: false, encerrado: false };
              const isSalvo = salvos.includes(e.id);
              const isNovo = (Date.now() - new Date(e.coletado_em).getTime()) < 86400000 * 2;

              return (
                <Card
                  key={e.id}
                  padding="md"
                  className={`flex flex-col gap-3 transition-all ${urgente ? 'border-red-200' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{e.orgao}</span>
                        {isNovo && <Badge variant="success" className="text-[9px]">Novo</Badge>}
                        {urgente && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 rounded-full text-[10px] font-bold text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                            {dias}d restantes
                          </span>
                        )}
                        {encerrado && <Badge variant="default" className="text-[9px] opacity-60">Encerrado</Badge>}
                      </div>
                      <Link href={`/editais/${e.id}`}>
                        <h3 className="text-[14px] font-bold text-(--ink) hover:text-(--accent) transition-colors leading-tight">
                          {e.cargo}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {e.escolaridade && <Badge variant="default">{e.escolaridade}</Badge>}
                        {e.vagas > 0 && <span className="text-[11px] text-(--ink-3)">{e.vagas.toLocaleString()} vagas</span>}
                        {e.banca && <span className="text-[11px] text-(--ink-3)">{e.banca}</span>}
                        {e.estado && <span className="text-[11px] text-(--ink-3)">{e.estado}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {e.salario > 0 && (
                        <span className="text-[15px] font-bold text-(--teal)">
                          R$ {e.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <button
                        onClick={() => toggleSalvar(e.id)}
                        className={`text-[22px] leading-none transition-colors ${isSalvo ? 'text-red-500' : 'text-(--ink-3) hover:text-red-400'}`}
                        title={isSalvo ? 'Remover dos salvos' : 'Salvar edital'}
                      >
                        {isSalvo ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>

                  {e.data_inscricao_fim && !encerrado && (
                    <p className={`text-[11px] font-medium ${urgente ? 'text-red-500' : 'text-(--ink-3)'}`}>
                      Inscrições até {new Date(e.data_inscricao_fim).toLocaleDateString('pt-BR')}
                      {dias >= 0 && ` · ${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {e.link_inscricao ? (
                      <a href={e.link_inscricao} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="primary">Inscrever-se ↗</Button>
                      </a>
                    ) : e.link_fonte ? (
                      <a
                        href={e.link_fonte}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Link do portal de origem — procure o link oficial de inscrição"
                      >
                        <Button size="sm" variant="ghost">Ver anúncio ↗</Button>
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

          {temMais && (
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={carregarMais} loading={carregandoMais}>
                Carregar mais editais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
