'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { STREAM_ERROR_PREFIX } from '@/lib/ai/constants';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Tela de upgrade para plano free ─────────────────────────────────────────
function TelaBloqueada() {
  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-(--accent-light) flex items-center justify-center">
        <span className="material-symbols-outlined filled text-(--accent)" style={{ fontSize: '32px' }}>auto_awesome</span>
      </div>
      <div>
        <h1 className="text-[22px] font-bold text-(--ink)">Tutor IA 24/7</h1>
        <p className="text-[14px] text-(--ink-3) mt-2 max-w-[360px]">
          Tire dúvidas sobre qualquer matéria do seu concurso, com explicações baseadas em lei e jurisprudência.
        </p>
      </div>

      <div className="bg-(--surface) border border-(--border-strong) rounded-(--radius) p-5 w-full max-w-[360px] flex flex-col gap-4">
        <p className="text-[12px] font-semibold text-(--accent) uppercase tracking-wide">Disponível no plano Premium</p>
        <ul className="flex flex-col gap-2 text-[13px] text-(--ink-2) text-left">
          {[
            'Powered by Claude Haiku — modelo mais preciso para direito',
            'Referências em lei, artigos e jurisprudência',
            'Contexto do seu edital e banca',
            '50 perguntas/mês no Premium · ilimitado no Elite',
          ].map(b => (
            <li key={b} className="flex items-start gap-2">
              <span className="material-symbols-outlined filled text-(--teal)" style={{ fontSize: '16px', marginTop: '1px' }}>check_circle</span>
              {b}
            </li>
          ))}
        </ul>
        <Link
          href="/conta#plano"
          className="w-full py-2.5 rounded-(--radius-sm) bg-(--accent) text-white text-[14px] font-semibold text-center block transition-opacity hover:opacity-90"
        >
          Ver planos e fazer upgrade
        </Link>
      </div>
    </div>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function Bolha({ msg }: { msg: Mensagem }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-(--accent) flex items-center justify-center shrink-0 self-end">
          <span className="material-symbols-outlined filled text-white" style={{ fontSize: '16px' }}>auto_awesome</span>
        </div>
      )}
      <div
        className={[
          'max-w-[82%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-(--accent) text-white rounded-br-sm'
            : 'bg-(--surface-2) text-(--ink) rounded-bl-sm border border-(--border)',
        ].join(' ')}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Indicador de digitação ───────────────────────────────────────────────────
function Digitando() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-(--accent) flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined filled text-white" style={{ fontSize: '16px' }}>auto_awesome</span>
      </div>
      <div className="bg-(--surface-2) border border-(--border) px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-(--ink-3) animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Chat principal ───────────────────────────────────────────────────────────
function ChatTutor({ plano }: { plano: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, enviando]);

  async function enviar() {
    const texto = input.trim();
    if (!texto || enviando) return;

    const novaMensagem: Mensagem = { role: 'user', content: texto };
    const historico = [...mensagens, novaMensagem];

    setMensagens(historico);
    setInput('');
    setEnviando(true);
    setErro('');

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: historico }),
      });

      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? 'Erro desconhecido');
        setEnviando(false);
        return;
      }

      // Leitura em streaming
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let resposta = '';

      setMensagens(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resposta += decoder.decode(value, { stream: true });

        // Detecta erro enviado pelo servidor dentro do stream
        if (resposta.includes(STREAM_ERROR_PREFIX)) {
          const errMsg = resposta.split(STREAM_ERROR_PREFIX)[1] ?? '';
          const amigavel = errMsg.includes('API key')
            ? 'Chave de IA não configurada. Contate o suporte.'
            : errMsg.includes('overloaded') || errMsg.includes('529')
            ? 'A IA está sobrecarregada. Tente novamente em instantes.'
            : 'Erro ao processar sua dúvida. Tente novamente.';
          // Remove a última mensagem vazia e exibe o erro
          setMensagens(prev => prev.slice(0, -1));
          setErro(amigavel);
          break;
        }

        setMensagens(prev => {
          const copia = [...prev];
          copia[copia.length - 1] = { role: 'assistant', content: resposta };
          return copia;
        });
      }
    } catch {
      setErro('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const limiteLabel = plano === 'premium' ? '50 perguntas/mês' : 'ilimitado';

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100vh-2rem)] max-w-[720px] mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-(--border) flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-(--accent) flex items-center justify-center">
          <span className="material-symbols-outlined filled text-white" style={{ fontSize: '18px' }}>auto_awesome</span>
        </div>
        <div>
          <p className="text-[15px] font-bold text-(--ink)">Tutor IA</p>
          <p className="text-[11px] text-(--ink-3)">Claude Haiku · {limiteLabel}</p>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 no-scrollbar">
        {mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-12">
            <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: '48px' }}>forum</span>
            <div>
              <p className="text-[15px] font-semibold text-(--ink)">Olá! Como posso ajudar?</p>
              <p className="text-[13px] text-(--ink-3) mt-1 max-w-[300px]">
                Tire dúvidas de qualquer matéria do seu concurso. Respondo com referência legal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'O que é ato administrativo vinculado?',
                'Diferença entre cargo e emprego público',
                'Princípios da administração pública (LIMPE)',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="px-3 py-1.5 rounded-full bg-(--surface-2) border border-(--border) text-[12px] text-(--ink-2) hover:bg-(--accent-light) hover:text-(--accent-text) hover:border-(--accent)/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) => (
          <Bolha key={i} msg={m} />
        ))}

        {enviando && mensagens[mensagens.length - 1]?.role === 'user' && <Digitando />}

        {erro && (
          <div className="flex items-start gap-2 bg-(--danger-light) text-(--danger) rounded-(--radius-sm) px-3 py-2 text-[13px]">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px', marginTop: '1px' }}>error</span>
            {erro}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-(--border) shrink-0">
        <div className="flex gap-2 items-end bg-(--surface-2) rounded-2xl border border-(--border-strong) px-3 py-2 focus-within:border-(--accent)/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escreva sua dúvida... (Enter para enviar)"
            rows={1}
            disabled={enviando}
            className="flex-1 bg-transparent resize-none text-[14px] text-(--ink) placeholder:text-(--ink-3) outline-none max-h-[120px] leading-relaxed py-0.5"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || enviando}
            className="w-8 h-8 rounded-full bg-(--accent) flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>send</span>
          </button>
        </div>
        <p className="text-[11px] text-(--ink-3) text-center mt-1.5">
          Shift+Enter para nova linha · Enter para enviar
        </p>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function TutorPage() {
  const [plano, setPlano] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('plano').eq('id', user.id).single()
        .then(({ data }) => setPlano(data?.plano ?? 'free'));
    });
  }, []);

  if (plano === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (plano === 'free') return <TelaBloqueada />;

  return <ChatTutor plano={plano} />;
}
