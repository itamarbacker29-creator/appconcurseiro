'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PLANOS as PRICING } from '@/lib/pricing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { NotificacoesPush } from '@/components/ui/NotificacoesPush';

const FORMACOES = [
  'Ensino Médio completo', 'Graduação em andamento', 'Direito', 'Administração',
  'Contabilidade', 'Engenharia', 'Psicologia', 'Nutrição', 'Enfermagem',
  'Medicina', 'Outra graduação',
];
const CONSELHOS = ['OAB','CREA','CRM','CRO','CRP','CRN','COREN','Outro'];

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
      'Todos os editais, sem limite',
      '5 simulados completos por mês',
      '1 pergunta ao Tutor IA por dia',
      'Diagnóstico de desempenho por matéria',
      '1 Raio-X de edital por mês',
      '1 PDF → até 5 flashcards por mês',
    ],
  },
  {
    id: 'premium',
    nome: 'Premium',
    preco: 'R$ 19,90/mês',
    cor: 'text-(--accent)',
    destaques: [
      'Todos os editais, sem limite',
      'Simulados ilimitados',
      'Tutor IA 24/7 — 30 mensagens/mês',
      'Plano de estudo personalizado',
      'Raio-X do edital ilimitado',
      'Upload de 5 PDFs/mês → flashcards',
      'Marca-texto em apostilas',
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    preco: 'R$ 29,90/mês',
    cor: 'text-(--teal)',
    destaques: [
      'Tudo do Premium',
      'Tutor IA 24/7 ilimitado',
      'Plano de estudo por edital específico',
      'Recomendação personalizada de concursos',
      'Upload ilimitado de PDFs → flashcards',
      'Análise de chance de aprovação em tempo real',
      'Alertas prioritários de editais',
    ],
  },
];

function mascararCPF(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

type StatusCheckout = 'idle' | 'loading' | 'aguardando' | 'success' | 'error';

interface Perfil {
  nome: string;
  email: string;
  plano: string;
  plano_expira_em: string | null;
  plano_iniciado_em: string | null;
  data_prova: string | null;
  concurso_alvo_nome: string | null;
  estilos_aprendizado: string[] | null;
  formacao: string | null;
  registros_conselho: string[] | null;
  pcd: boolean;
  elegivel_cota_racial: boolean;
  elegivel_cota_indigena: boolean;
  elegivel_cota_quilombola: boolean;
  elegivel_isencao_taxa: boolean;
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
  // Elegibilidade
  const [formacao, setFormacao] = useState('');
  const [conselhos, setConselhos] = useState<string[]>([]);
  const [pcd, setPcd] = useState(false);
  const [cotaRacial, setCotaRacial] = useState(false);
  const [cotaIndigena, setCotaIndigena] = useState(false);
  const [cotaQuilombola, setCotaQuilombola] = useState(false);
  const [isencao, setIsencao] = useState(false);
  const [salvandoElegibilidade, setSalvandoElegibilidade] = useState(false);

  // Checkout Asaas
  const [modalPlano, setModalPlano] = useState<'premium' | 'elite' | null>(null);
  const [cpf, setCpf] = useState('');
  const [statusCheckout, setStatusCheckout] = useState<StatusCheckout>('idle');
  const [erroCheckout, setErroCheckout] = useState('');
  const checkoutUrlRef = useRef('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('nome, plano, plano_expira_em, plano_iniciado_em, data_prova, concurso_alvo_nome, estilos_aprendizado, formacao, registros_conselho, pcd, elegivel_cota_racial, elegivel_cota_indigena, elegivel_cota_quilombola, elegivel_isencao_taxa')
        .eq('id', user.id)
        .single();

      const p: Perfil = {
        nome: data?.nome ?? '',
        email: user.email ?? '',
        plano: data?.plano ?? 'free',
        plano_expira_em: data?.plano_expira_em ?? null,
        plano_iniciado_em: data?.plano_iniciado_em ?? null,
        data_prova: data?.data_prova ?? null,
        concurso_alvo_nome: data?.concurso_alvo_nome ?? null,
        estilos_aprendizado: data?.estilos_aprendizado ?? null,
        formacao: data?.formacao ?? null,
        registros_conselho: data?.registros_conselho ?? null,
        pcd: data?.pcd ?? false,
        elegivel_cota_racial: data?.elegivel_cota_racial ?? false,
        elegivel_cota_indigena: data?.elegivel_cota_indigena ?? false,
        elegivel_cota_quilombola: data?.elegivel_cota_quilombola ?? false,
        elegivel_isencao_taxa: data?.elegivel_isencao_taxa ?? false,
      };
      setPerfil(p);
      setConcursoNome(p.concurso_alvo_nome ?? '');
      setDataProva(p.data_prova ?? '');
      setEstilos(p.estilos_aprendizado ?? []);
      setFormacao(p.formacao ?? '');
      setConselhos(p.registros_conselho ?? []);
      setPcd(p.pcd);
      setCotaRacial(p.elegivel_cota_racial);
      setCotaIndigena(p.elegivel_cota_indigena);
      setCotaQuilombola(p.elegivel_cota_quilombola);
      setIsencao(p.elegivel_isencao_taxa);
      setLoading(false);
    }
    carregar();
  }, [router]);

  function toggleEstilo(id: string) {
    setEstilos(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  }

  function toggleConselho(c: string) {
    setConselhos(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function salvarElegibilidade() {
    setSalvandoElegibilidade(true);
    try {
      const res = await fetch('/api/conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formacao: formacao || null,
          registros_conselho: conselhos,
          pcd, elegivel_cota_racial: cotaRacial,
          elegivel_cota_indigena: cotaIndigena,
          elegivel_cota_quilombola: cotaQuilombola,
          elegivel_isencao_taxa: isencao,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast(json.error ?? 'Erro ao salvar', 'error');
      } else {
        toast('Perfil de elegibilidade salvo!', 'success');
      }
    } catch {
      toast('Falha de conexão.', 'error');
    }
    setSalvandoElegibilidade(false);
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

  async function handleCheckout() {
    if (!modalPlano) return;
    const cpfDigitos = cpf.replace(/\D/g, '');
    if (cpfDigitos.length !== 11) {
      setErroCheckout('CPF inválido. Digite os 11 dígitos.');
      return;
    }
    setStatusCheckout('loading');
    setErroCheckout('');
    try {
      const res = await fetch('/api/checkout/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: modalPlano, cpf: cpfDigitos }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setErroCheckout(data.error ?? 'Erro ao gerar link de pagamento.');
        setStatusCheckout('error');
        return;
      }
      checkoutUrlRef.current = data.checkoutUrl;
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      setStatusCheckout('aguardando');
    } catch {
      setErroCheckout('Falha de conexão. Tente novamente.');
      setStatusCheckout('error');
    }
  }

  async function handleVerificarAtivacao() {
    setStatusCheckout('loading');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
    if (data?.plano !== 'free' && data?.plano) {
      setPerfil(prev => prev ? { ...prev, plano: data.plano } : prev);
      setStatusCheckout('success');
      toast('Plano ativado com sucesso!', 'success');
      setTimeout(() => { setModalPlano(null); setStatusCheckout('idle'); setCpf(''); }, 1500);
    } else {
      setErroCheckout('Pagamento ainda não confirmado. Aguarde e tente novamente.');
      setStatusCheckout('aguardando');
    }
  }

  async function handleCancelar() {
    if (!perfil || perfil.plano === 'free') return;
    const dentroDoArrependimento = perfil.plano_iniciado_em
      ? (Date.now() - new Date(perfil.plano_iniciado_em).getTime()) < 7 * 24 * 60 * 60 * 1000
      : false;
    const msg = dentroDoArrependimento
      ? 'Você está dentro dos 7 dias. Cancelar gerará reembolso total. Confirmar?'
      : 'Confirmar cancelamento? O acesso continua até o fim do período pago.';
    if (!window.confirm(msg)) return;
    setCancelando(true);
    try {
      const res = await fetch('/api/checkout/cancelar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? 'Erro ao cancelar.', 'error'); return; }
      setPerfil(prev => prev ? { ...prev, plano: data.reembolsado ? 'free' : prev.plano } : prev);
      if (data.reembolsado) {
        toast('Assinatura cancelada. Reembolso solicitado.', 'success');
      } else if (data.acesso_ate) {
        const ate = new Date(data.acesso_ate).toLocaleDateString('pt-BR');
        toast(`Renovação cancelada. Acesso até ${ate}.`, 'success');
      } else {
        toast('Assinatura cancelada.', 'success');
      }
    } catch {
      toast('Falha de conexão.', 'error');
    } finally {
      setCancelando(false);
    }
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

      {/* Perfil de elegibilidade */}
      <section id="elegibilidade" className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-(--ink)">Perfil de elegibilidade</h2>
          <p className="text-[12px] text-(--ink-3) mt-1">Usado para analisar se você é elegível aos editais e se concorre por cotas.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-(--ink-3)">Formação</label>
          <select value={formacao} onChange={e => setFormacao(e.target.value)}
            className="h-10 rounded-sm border border-(--border-strong) px-3 text-[14px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors">
            <option value="">Selecione</option>
            {FORMACOES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-(--ink-3)">Registros em conselho profissional</label>
          <div className="flex flex-wrap gap-2">
            {CONSELHOS.map(c => (
              <button key={c} onClick={() => toggleConselho(c)}
                className={[
                  'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                  conselhos.includes(c) ? 'bg-(--accent) text-white border-(--accent)' : 'border-(--border-strong) text-(--ink-2) hover:border-(--accent)',
                ].join(' ')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-(--ink-3)">Situações especiais</label>
          {[
            { val: pcd, set: setPcd, label: 'Pessoa com Deficiência (PcD)' },
            { val: cotaRacial, set: setCotaRacial, label: 'Preto ou pardo (cota racial)' },
            { val: cotaIndigena, set: setCotaIndigena, label: 'Indígena' },
            { val: cotaQuilombola, set: setCotaQuilombola, label: 'Quilombola' },
            { val: isencao, set: setIsencao, label: 'Inscrito no CadÚnico ou doador de medula (isenção de taxa)' },
          ].map(item => (
            <label key={item.label} className="flex items-center gap-2 text-[13px] text-(--ink-2) cursor-pointer">
              <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} className="accent-(--accent)" />
              {item.label}
            </label>
          ))}
        </div>
        <Button loading={salvandoElegibilidade} onClick={salvarElegibilidade} className="self-start">
          Salvar elegibilidade
        </Button>
      </section>

      {/* Plano atual e upgrade */}
      <section id="plano" className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-(--ink)">Seu plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANOS.map(p => {
            const atual = p.id === perfil.plano;
            const podeUpgrade = perfil.plano === 'free' || (perfil.plano === 'premium' && p.id === 'elite');
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
                {podeUpgrade && p.id !== 'free' && (
                  <Button
                    size="sm"
                    variant={p.id === 'elite' ? 'primary' : 'ghost'}
                    className="mt-auto"
                    onClick={() => { setCpf(''); setStatusCheckout('idle'); setErroCheckout(''); setModalPlano(p.id as 'premium' | 'elite'); }}
                  >
                    Fazer upgrade
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {perfil.plano !== 'free' && (
          <div className="text-center">
            {perfil.plano_expira_em && (
              <p className="text-[12px] text-(--ink-3) mb-2">
                Acesso ativo até {new Date(perfil.plano_expira_em).toLocaleDateString('pt-BR')}
              </p>
            )}
            <button
              onClick={handleCancelar}
              disabled={cancelando}
              className="text-[12px] text-(--ink-3) hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {cancelando ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          </div>
        )}
      </section>

      {/* Modal de checkout Asaas */}
      {modalPlano && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-(--surface) rounded-(--radius) p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-(--ink)">
                Assinar plano {PLANOS.find(p => p.id === modalPlano)?.nome}
              </h3>
              <button
                onClick={() => setModalPlano(null)}
                className="w-8 h-8 rounded-full bg-(--surface-2) flex items-center justify-center text-(--ink-3) hover:bg-(--border)"
              >
                ✕
              </button>
            </div>

            <div className="bg-(--accent-light) border border-(--accent) rounded-(--radius-sm) p-3 text-center">
              <p className="text-[13px] font-semibold text-(--ink)">
                {PLANOS.find(p => p.id === modalPlano)?.nome}
              </p>
              <p className="text-[22px] font-bold text-(--accent)">
                R$ {modalPlano ? PRICING[modalPlano].preco_mensal.toFixed(2).replace('.', ',') : ''}
                <span className="text-[13px] font-normal text-(--ink-3)">/mês</span>
              </p>
              <p className="text-[11px] text-(--ink-3) mt-0.5">PIX, cartão ou boleto</p>
            </div>

            {statusCheckout === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-(--radius-sm) p-3 text-center text-[14px] font-bold text-green-700">
                ✓ Plano ativado com sucesso!
              </div>
            )}

            {(statusCheckout === 'idle' || statusCheckout === 'error') && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-medium text-(--ink-3) block mb-1.5">CPF para cobrança</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={e => setCpf(mascararCPF(e.target.value))}
                    className="w-full h-11 border-2 border-(--border-strong) rounded-(--radius-sm) px-4 text-[16px] font-bold tracking-widest text-center focus:border-(--accent) outline-none bg-(--surface)"
                    autoFocus
                  />
                  <p className="text-[11px] text-(--ink-3) mt-1 text-center">Exigido pelo processador de pagamentos</p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={cpf.replace(/\D/g, '').length !== 11}
                >
                  Continuar para o pagamento ↗
                </Button>
              </div>
            )}

            {statusCheckout === 'loading' && (
              <Button disabled loading>Gerando link...</Button>
            )}

            {statusCheckout === 'aguardando' && (
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-(--radius-sm) p-3 text-[13px] text-amber-800">
                  Checkout aberto em nova aba. Após pagar, clique em verificar.
                </div>
                <Button onClick={handleVerificarAtivacao}>Verificar ativação</Button>
                <button
                  onClick={() => window.open(checkoutUrlRef.current, '_blank', 'noopener,noreferrer')}
                  className="text-[13px] text-(--ink-3) hover:text-(--accent) transition-colors flex items-center justify-center gap-1"
                >
                  ↗ Reabrir checkout
                </button>
              </div>
            )}

            {erroCheckout && (
              <p className="text-[12px] text-red-500 text-center">{erroCheckout}</p>
            )}
          </div>
        </div>
      )}

      {/* Notificações push */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-(--ink)">Notificações</h2>
        <p className="text-[13px] text-(--ink-3)">Receba lembretes diários de estudo e alertas de novos editais no seu interesse.</p>
        <NotificacoesPush />
      </section>

      {/* Tour */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-(--ink)">Tour guiado</h2>
        <p className="text-[13px] text-(--ink-3)">Reveja o tour de onboarding a qualquer momento.</p>
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            try { localStorage.removeItem('otutor_tour_v4'); } catch { /* */ }
            window.dispatchEvent(new Event('otutor:reiniciar-tour'));
          }}
        >
          <span className="material-symbols-outlined text-[16px] mr-1">tour</span>
          Refazer tour guiado
        </Button>
      </section>

      {/* Feedback */}
      <section className="bg-(--surface) border border-(--border) rounded-(--radius) p-5 flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-(--ink)">Feedback</h2>
        <p className="text-[13px] text-(--ink-3)">Sua opinião ajuda a melhorar a plataforma.</p>
        <a href="/feedback">
          <Button variant="ghost" className="self-start">
            <span className="material-symbols-outlined text-[16px] mr-1">rate_review</span>
            Deixar feedback
          </Button>
        </a>
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
