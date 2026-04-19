'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

const ESTILOS = [
  { id: 'videos', label: '▶ Vídeos (YouTube)' },
  { id: 'podcasts', label: '🎙 Podcasts' },
  { id: 'livros', label: '📚 Livros e apostilas' },
  { id: 'artigos', label: '📄 Artigos e resumos' },
  { id: 'flashcards', label: '◇ Flashcards' },
  { id: 'exercicios', label: '◉ Exercícios práticos' },
  { id: 'mapas_mentais', label: '◈ Mapas mentais' },
  { id: 'aulas_ao_vivo', label: '◎ Aulas ao vivo' },
];

const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: 'Grátis',
    cor: 'text-(--ink-3)',
    destaques: [
      '5 editais por busca',
      '5 simulados por mês',
      'IA: Gemini Flash',
      'Sem tutor de dúvidas',
    ],
  },
  {
    id: 'premium',
    nome: 'Premium',
    preco: 'R$ 29/mês',
    cor: 'text-(--accent)',
    destaques: [
      'Editais ilimitados',
      '30 simulados por mês',
      'IA de alta tecnologia (mais preciso)',
      'Tutor de dúvidas: 50 msgs/mês',
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    preco: 'R$ 49/mês',
    cor: 'text-(--teal)',
    destaques: [
      'Tudo ilimitado',
      'IA de alta tecnologia em tudo',
      'Tutor de dúvidas ilimitado',
      'Plano de estudo por IA',
    ],
  },
];

interface Perfil {
  nome: string;
  email: string;
  plano: string;
  data_prova: string | null;
  concurso_alvo_nome: string | null;
  estilos_aprendizado: string[] | null;
}

export default function ContaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [salvandoEstilos, setSalvandoEstilos] = useState(false);
  const [confirmandoSair, setConfirmandoSair] = useState(false);

  const [concursoNome, setConcursoNome] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [estilos, setEstilos] = useState<string[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('nome, plano, data_prova, concurso_alvo_nome, estilos_aprendizado')
        .eq('id', user.id)
        .single();

      const p: Perfil = {
        nome: data?.nome ?? '',
        email: user.email ?? '',
        plano: data?.plano ?? 'free',
        data_prova: data?.data_prova ?? null,
        concurso_alvo_nome: data?.concurso_alvo_nome ?? null,
        estilos_aprendizado: data?.estilos_aprendizado ?? null,
      };
      setPerfil(p);
      setConcursoNome(p.concurso_alvo_nome ?? '');
      setDataProva(p.data_prova ?? '');
      setEstilos(p.estilos_aprendizado ?? []);
      setLoading(false);
    }
    carregar();
  }, [router]);

  function toggleEstilo(id: string) {
    setEstilos(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  }

  async function salvarPerfil() {
    setSalvandoPerfil(true);
    try {
      const res = await fetch('/api/conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurso_alvo_nome: concursoNome, data_prova: dataProva }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast(json.error ?? 'Erro ao salvar perfil', 'error');
      } else {
        toast('Perfil atualizado!', 'success');
      }
    } catch {
      toast('Falha de conexão. Verifique sua internet.', 'error');
    }
    setSalvandoPerfil(false);
  }

  async function salvarEstilos() {
    setSalvandoEstilos(true);
    try {
      const res = await fetch('/api/conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estilos_aprendizado: estilos }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast(json.error ?? 'Erro ao salvar preferências', 'error');
      } else {
        toast('Preferências salvas!', 'success');
      }
    } catch {
      toast('Falha de conexão. Verifique sua internet.', 'error');
    }
    setSalvandoEstilos(false);
  }

  async function sair() {
    if (!confirmandoSair) { setConfirmandoSair(true); return; }
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!perfil) return null;

  const planoAtual = PLANOS.find(p => p.id === perfil.plano) ?? PLANOS[0];

  return (
    <div className="p-4 md:p-6 max-w-[700px] mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-(--ink)">Conta e Preferências</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Personalize sua experiência de estudo.</p>
      </div>

      {/* Header do usuário */}
      <div className="flex items-center gap-4 p-4 bg-(--surface) border border-(--border) rounded-(--radius)">
        <div className="w-12 h-12 rounded-full bg-(--accent) flex items-center justify-center text-white font-bold text-[18px] shrink-0">
          {(perfil.nome || perfil.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-(--ink) truncate">{perfil.nome || 'Candidato'}</p>
          <p className="text-[12px] text-(--ink-3) truncate">{perfil.email}</p>
        </div>
        <Badge variant={perfil.plano === 'free' ? 'default' : 'accent'}>
          {planoAtual.nome.toUpperCase()}
        </Badge>
      </div>

      {/* Meu concurso alvo */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-(--ink)">Meu concurso alvo</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-(--ink-3)">Concurso ou cargo</label>
            <Input
              placeholder="Ex: Receita Federal — Auditor Fiscal"
              value={concursoNome}
              onChange={e => setConcursoNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-(--ink-3)">Data da prova</label>
            <input
              type="date"
              value={dataProva}
              onChange={e => setDataProva(e.target.value)}
              className="h-10 rounded-(--radius-sm) border border-(--border-strong) px-3 text-[14px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
            />
          </div>
        </div>
        <Button loading={salvandoPerfil} onClick={salvarPerfil} className="self-start">
          Salvar
        </Button>
      </section>

      {/* Estilo de aprendizado */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-(--ink)">Como você prefere estudar?</h2>
          <p className="text-[12px] text-(--ink-3) mt-1">Usamos isso para personalizar o plano de estudos com os melhores recursos para você.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ESTILOS.map(e => (
            <button
              key={e.id}
              onClick={() => toggleEstilo(e.id)}
              className={[
                'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                estilos.includes(e.id)
                  ? 'bg-(--accent) text-white border-(--accent)'
                  : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)',
              ].join(' ')}
            >
              {e.label}
            </button>
          ))}
        </div>
        <Button loading={salvandoEstilos} onClick={salvarEstilos} variant="ghost" className="self-start">
          Salvar preferências
        </Button>
      </section>

      {/* Plano atual e upgrade */}
      <section id="plano" className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-(--ink)">Seu plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANOS.map(p => {
            const atual = p.id === perfil.plano;
            return (
              <div
                key={p.id}
                className={[
                  'rounded-(--radius) border-2 p-4 flex flex-col gap-3 transition-all',
                  atual ? 'border-(--accent) bg-(--accent-light)' : 'border-(--border)',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[15px] font-bold ${p.cor}`}>{p.nome}</span>
                  {atual && <Badge variant="accent" className="text-[9px]">Atual</Badge>}
                </div>
                <p className="text-[13px] font-semibold text-(--ink)">{p.preco}</p>
                <ul className="flex flex-col gap-1.5">
                  {p.destaques.map(d => (
                    <li key={d} className="text-[12px] text-(--ink-2) flex items-start gap-1.5">
                      <span className="text-(--teal) shrink-0 mt-0.5">✓</span> {d}
                    </li>
                  ))}
                </ul>
                {!atual && (
                  <Button size="sm" variant={p.id === 'elite' ? 'primary' : 'ghost'} className="mt-auto">
                    Fazer upgrade
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {perfil.plano !== 'free' && (
          <p className="text-[12px] text-(--ink-3) text-center">
            Para cancelar ou alterar seu plano, entre em contato com o suporte.
          </p>
        )}
      </section>

      {/* Logout */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-(--ink)">Sessão</h2>
        <p className="text-[13px] text-(--ink-3)">Logado como <strong>{perfil.email}</strong></p>
        {confirmandoSair ? (
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-(--danger) font-medium">Confirmar saída?</p>
            <Button variant="danger" onClick={sair} className="self-start">Sim, sair</Button>
            <Button variant="ghost" onClick={() => setConfirmandoSair(false)} className="self-start">Cancelar</Button>
          </div>
        ) : (
          <Button variant="danger" onClick={sair} className="self-start">
            Sair da conta
          </Button>
        )}
      </section>
    </div>
  );
}
