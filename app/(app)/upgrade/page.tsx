'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { PLANOS as PRICING } from '@/lib/pricing';

type PlanoId = 'free' | 'premium' | 'elite';
type StatusCheckout = 'idle' | 'loading' | 'aguardando' | 'success' | 'error';

function mascararCPF(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

const PLANOS = [
  {
    id: 'free' as PlanoId,
    nome: 'Free',
    subtitulo: 'Para começar',
    cor: 'text-gray-500',
    beneficios: [
      '3 simulados por mês',
      '1 pergunta ao Tutor IA por dia',
      '1 Raio-X de edital por mês',
      '1 PDF → até 5 flashcards por mês',
    ],
  },
  {
    id: 'premium' as PlanoId,
    nome: 'Premium',
    subtitulo: 'Para quem estuda todo dia',
    cor: 'text-(--accent)',
    beneficios: [
      'Simulados ilimitados',
      'Tutor IA 24/7 — 30 mensagens/mês',
      'Plano de estudo personalizado',
      'Raio-X do edital ilimitado',
      'Upload de 5 PDFs/mês → flashcards',
      'Marca-texto em apostilas',
    ],
  },
  {
    id: 'elite' as PlanoId,
    nome: 'Elite',
    subtitulo: 'Para quem quer a aprovação',
    cor: 'text-(--teal)',
    beneficios: [
      'Tudo do Premium',
      'Tutor IA 24/7 ilimitado',
      'Plano de estudo por edital específico',
      'Recomendação personalizada de concursos',
      'Upload ilimitado de PDFs → flashcards',
      'Análise de chance de aprovação em tempo real',
    ],
  },
];

export default function UpgradePage() {
  const { toast } = useToast();
  const [planoAtual, setPlanoAtual] = useState<PlanoId>('free');
  const [planoExpiraEm, setPlanoExpiraEm] = useState<string | null>(null);
  const [planoIniciadoEm, setPlanoIniciadoEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkout
  const [modalPlano, setModalPlano] = useState<'premium' | 'elite' | null>(null);
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('mensal');
  const [cpf, setCpf] = useState('');
  const [statusCheckout, setStatusCheckout] = useState<StatusCheckout>('idle');
  const [erroCheckout, setErroCheckout] = useState('');
  const checkoutUrlRef = useRef('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('plano, plano_expira_em, plano_iniciado_em')
        .eq('id', user.id)
        .single();
      setPlanoAtual((data?.plano ?? 'free') as PlanoId);
      setPlanoExpiraEm(data?.plano_expira_em ?? null);
      setPlanoIniciadoEm(data?.plano_iniciado_em ?? null);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirModal(plano: 'premium' | 'elite') {
    setCpf('');
    setStatusCheckout('idle');
    setErroCheckout('');
    setPeriodo('mensal');
    setModalPlano(plano);
  }

  async function handleCheckout() {
    if (!modalPlano) return;
    const cpfDigitos = cpf.replace(/\D/g, '');
    if (cpfDigitos.length !== 11) { setErroCheckout('CPF inválido.'); return; }
    setStatusCheckout('loading');
    setErroCheckout('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/checkout/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ plano: modalPlano, periodo, cpf: cpfDigitos }),
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

  async function handleVerificar() {
    setStatusCheckout('loading');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
    if (data?.plano && data.plano !== 'free') {
      setPlanoAtual(data.plano as PlanoId);
      setStatusCheckout('success');
      toast('Plano ativado!', 'success');
      setTimeout(() => { setModalPlano(null); setStatusCheckout('idle'); }, 1500);
    } else {
      setErroCheckout('Pagamento ainda não confirmado. Aguarde e tente novamente.');
      setStatusCheckout('aguardando');
    }
  }

  async function handleCancelar() {
    const dentroDoArrependimento = planoIniciadoEm
      ? (Date.now() - new Date(planoIniciadoEm).getTime()) < 7 * 24 * 60 * 60 * 1000
      : false;
    const msg = dentroDoArrependimento
      ? 'Você está dentro dos 7 dias. Cancelar gerará reembolso total. Confirmar?'
      : 'Confirmar cancelamento? O acesso continua até o fim do período pago.';
    if (!window.confirm(msg)) return;
    setCancelando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/checkout/cancelar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? 'Erro ao cancelar.', 'error'); return; }
      if (data.reembolsado) {
        setPlanoAtual('free');
        toast('Assinatura cancelada. Reembolso solicitado.', 'success');
      } else if (data.acesso_ate) {
        toast(`Renovação cancelada. Acesso até ${new Date(data.acesso_ate).toLocaleDateString('pt-BR')}.`, 'success');
      } else {
        toast('Assinatura cancelada.', 'success');
      }
    } catch {
      toast('Falha de conexão.', 'error');
    } finally {
      setCancelando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[860px] mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-(--ink)">Planos</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">
          Plano atual: <strong>{planoAtual.charAt(0).toUpperCase() + planoAtual.slice(1)}</strong>
          {planoExpiraEm && planoAtual !== 'free' && (
            <> · acesso até {new Date(planoExpiraEm).toLocaleDateString('pt-BR')}</>
          )}
        </p>
      </div>

      {/* Cards de plano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANOS.map(p => {
          const atual = p.id === planoAtual;
          const podeUpgrade = planoAtual === 'free' || (planoAtual === 'premium' && p.id === 'elite');
          const pricing = p.id !== 'free' ? PRICING[p.id as 'premium' | 'elite'] : null;

          return (
            <div
              key={p.id}
              className={[
                'rounded-(--radius) border-2 p-5 flex flex-col gap-4 transition-all',
                atual ? 'border-(--accent) bg-(--accent-light)' : 'border-(--border) bg-(--surface)',
              ].join(' ')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[15px] font-bold ${p.cor}`}>{p.nome}</span>
                  <p className="text-[12px] text-(--ink-3) mt-0.5">{p.subtitulo}</p>
                </div>
                {atual && <Badge variant="accent" className="text-[9px] shrink-0">Atual</Badge>}
              </div>

              <div>
                {pricing ? (
                  <>
                    <p className="text-[26px] font-black text-(--ink) leading-none">
                      R$ {pricing.preco_mensal.toFixed(2).replace('.', ',')}
                      <span className="text-[13px] font-normal text-(--ink-3)">/mês</span>
                    </p>
                    <p className="text-[11px] text-(--teal) font-semibold mt-1">
                      Anual: R$ {pricing.preco_anual_mensal.toFixed(2).replace('.', ',')}/mês (25% off)
                    </p>
                  </>
                ) : (
                  <p className="text-[26px] font-black text-(--ink)">Grátis</p>
                )}
              </div>

              <ul className="flex flex-col gap-1.5 flex-1">
                {p.beneficios.map(b => (
                  <li key={b} className="text-[12px] text-(--ink-2) flex items-start gap-1.5">
                    <span className="text-(--teal) shrink-0 font-bold mt-0.5">✓</span> {b}
                  </li>
                ))}
              </ul>

              {podeUpgrade && p.id !== 'free' && (
                <Button
                  size="sm"
                  variant={p.id === 'elite' ? 'primary' : 'ghost'}
                  onClick={() => abrirModal(p.id as 'premium' | 'elite')}
                >
                  Assinar {p.nome}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelar */}
      {planoAtual !== 'free' && (
        <div className="text-center">
          <button
            onClick={handleCancelar}
            disabled={cancelando}
            className="text-[12px] text-(--ink-3) hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {cancelando ? 'Cancelando...' : 'Cancelar assinatura'}
          </button>
        </div>
      )}

      {/* Modal checkout */}
      {modalPlano && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-(--surface) rounded-(--radius) p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-(--ink)">
                Assinar {PLANOS.find(p => p.id === modalPlano)?.nome}
              </h3>
              <button onClick={() => setModalPlano(null)} className="w-8 h-8 rounded-full bg-(--surface-2) flex items-center justify-center text-(--ink-3)">✕</button>
            </div>

            {/* Toggle mensal/anual */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-[13px] font-semibold ${periodo === 'mensal' ? 'text-(--ink)' : 'text-(--ink-3)'}`}>Mensal</span>
              <button
                onClick={() => setPeriodo(p => p === 'mensal' ? 'anual' : 'mensal')}
                className={`relative w-10 h-5 rounded-full transition-colors ${periodo === 'anual' ? 'bg-(--accent)' : 'bg-(--border-strong)'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${periodo === 'anual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-[13px] font-semibold ${periodo === 'anual' ? 'text-(--ink)' : 'text-(--ink-3)'}`}>
                Anual
                {periodo === 'anual' && <span className="ml-1 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">25% off</span>}
              </span>
            </div>

            {/* Preço */}
            <div className="bg-(--accent-light) border border-(--accent) rounded-(--radius-sm) p-3 text-center">
              <p className="text-[13px] font-semibold text-(--ink)">
                {PLANOS.find(p => p.id === modalPlano)?.nome} · {periodo === 'anual' ? 'Anual' : 'Mensal'}
              </p>
              {periodo === 'anual' && (
                <p className="text-[12px] text-(--ink-3) line-through">
                  R$ {PRICING[modalPlano].preco_mensal.toFixed(2).replace('.', ',')}/mês
                </p>
              )}
              <p className="text-[22px] font-bold text-(--accent)">
                R$ {(periodo === 'anual' ? PRICING[modalPlano].preco_anual_mensal : PRICING[modalPlano].preco_mensal).toFixed(2).replace('.', ',')}
                <span className="text-[13px] font-normal text-(--ink-3)">/mês</span>
              </p>
              {periodo === 'anual' && (
                <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                  Cobrado R$ {PRICING[modalPlano].preco_anual_total.toFixed(2).replace('.', ',')} por ano
                </p>
              )}
              <p className="text-[11px] text-(--ink-3) mt-0.5">PIX, cartão ou boleto</p>
            </div>

            {statusCheckout === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-(--radius-sm) p-3 text-center text-[14px] font-bold text-green-700">
                ✓ Plano ativado!
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
                <Button onClick={handleCheckout} disabled={cpf.replace(/\D/g, '').length !== 11}>
                  Continuar para o pagamento ↗
                </Button>
              </div>
            )}

            {statusCheckout === 'loading' && <Button disabled loading>Processando...</Button>}

            {statusCheckout === 'aguardando' && (
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-(--radius-sm) p-3 text-[13px] text-amber-800">
                  Checkout aberto em nova aba. Após pagar, clique em verificar.
                </div>
                <Button onClick={handleVerificar}>Verificar ativação</Button>
                <button
                  onClick={() => window.open(checkoutUrlRef.current, '_blank', 'noopener,noreferrer')}
                  className="text-[13px] text-(--ink-3) hover:text-(--accent) transition-colors"
                >
                  ↗ Reabrir checkout
                </button>
              </div>
            )}

            {erroCheckout && <p className="text-[12px] text-red-500 text-center">{erroCheckout}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
