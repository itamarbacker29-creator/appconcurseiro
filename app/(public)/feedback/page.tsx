'use client';

import { useState } from 'react';

const PERGUNTAS = [
  { id: 1,  tipo: 'escala', texto: 'Como você avalia sua experiência geral com o O Tutor?' },
  { id: 2,  tipo: 'escala', texto: 'O aplicativo atendeu às suas expectativas iniciais?' },
  { id: 3,  tipo: 'escala', texto: 'Quão fácil foi navegar pelo aplicativo?' },
  { id: 4,  tipo: 'escala', texto: 'Como você avalia a qualidade das questões dos simulados?' },
  { id: 5,  tipo: 'escala', texto: 'O plano de estudos gerado pela IA foi útil para você?' },
  { id: 6,  tipo: 'escala', texto: 'O Tutor IA respondeu bem às suas dúvidas?' },
  { id: 7,  tipo: 'escala', texto: 'Os flashcards foram úteis para revisar o conteúdo?' },
  { id: 8,  tipo: 'escala', texto: 'As apostilas em PDF e o leitor foram fáceis de usar?' },
  { id: 9,  tipo: 'escala', texto: 'A análise de participação nos editais foi relevante para você?' },
  { id: 10, tipo: 'escala', texto: 'Com que frequência você usa o aplicativo para estudar?' },
  { id: 11, tipo: 'escala', texto: 'Você sente que está evoluindo nos seus estudos com o O Tutor?' },
  { id: 12, tipo: 'escala', texto: 'O design e visual do app são agradáveis e funcionais?' },
  { id: 13, tipo: 'escala', texto: 'O aplicativo é rápido e estável?' },
  { id: 14, tipo: 'escala', texto: 'Qual a probabilidade de você indicar o O Tutor a um amigo?' },
  { id: 15, tipo: 'texto',  texto: 'Qual funcionalidade você mais gostou? Por quê?' },
  { id: 16, tipo: 'texto',  texto: 'O que te frustrou ou decepcionou no aplicativo?' },
  { id: 17, tipo: 'texto',  texto: 'O que está faltando que tornaria o O Tutor indispensável para você?' },
  { id: 18, tipo: 'texto',  texto: 'Você encontrou algum erro ou bug? Descreva o que aconteceu.' },
  { id: 19, tipo: 'texto',  texto: 'Alguma sugestão de melhoria para o plano de estudos ou simulados?' },
  { id: 20, tipo: 'texto',  texto: 'Algum comentário livre que queira compartilhar com a equipe?' },
  { id: 21, tipo: 'contato', texto: 'Seus dados de contato (para receber 6 meses de Elite grátis caso selecionado)' },
];

type Respostas = Record<number, string>;

function EscalaInput({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={[
            'w-10 h-10 rounded-lg text-[14px] font-bold border-2 transition-all',
            valor === String(n)
              ? 'border-(--accent) bg-(--accent) text-white'
              : 'border-(--border) text-(--ink-2) hover:border-(--accent) hover:text-(--accent)',
          ].join(' ')}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [respostas, setRespostas] = useState<Respostas>({});
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  function setResposta(id: number, val: string) {
    setRespostas(prev => ({ ...prev, [id]: val }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro('');

    const form = new FormData();
    form.append('respostas', JSON.stringify(respostas));
    form.append('nome', nome);
    form.append('email', email);
    if (arquivo) form.append('arquivo', arquivo);

    try {
      const res = await fetch('/api/feedback', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Erro ao enviar');
      setEnviado(true);
    } catch {
      setErro('Não foi possível enviar. Tente novamente.');
    }
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F4F1DA' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600" style={{ fontSize: 36 }}>check_circle</span>
          </div>
          <h2 className="text-[22px] font-bold text-(--ink)">Obrigado pelo feedback!</h2>
          <p className="text-[14px] text-(--ink-3) leading-relaxed">
            Sua opinião é fundamental para melhorarmos o O Tutor. Caso você seja selecionado para os <strong>6 meses de Elite grátis</strong>, entraremos em contato pelo e-mail informado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#F4F1DA' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[12px] font-bold text-(--accent) uppercase tracking-widest mb-2">Beta Testers</p>
          <h1 className="text-[28px] font-black text-(--ink) leading-tight">Seu feedback vale 6 meses de Elite</h1>
          <p className="text-[14px] text-(--ink-3) mt-2 max-w-md mx-auto">
            Leva menos de 5 minutos. Responda com honestidade — cada crítica nos ajuda a construir o melhor app de concursos do Brasil.
          </p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-6">
          {PERGUNTAS.filter(p => p.tipo !== 'contato').map((p, idx) => (
            <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-black/5">
              <p className="text-[13px] font-bold text-(--ink-3) mb-1">{idx + 1} / {PERGUNTAS.length - 1}</p>
              <p className="text-[15px] font-semibold text-(--ink) mb-4">{p.texto}</p>
              {p.tipo === 'escala' ? (
                <div>
                  <EscalaInput
                    valor={respostas[p.id] ?? ''}
                    onChange={v => setResposta(p.id, v)}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-(--ink-3)">Péssimo</span>
                    <span className="text-[11px] text-(--ink-3)">Excelente</span>
                  </div>
                </div>
              ) : (
                <textarea
                  rows={3}
                  placeholder="Escreva aqui..."
                  value={respostas[p.id] ?? ''}
                  onChange={e => setResposta(p.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] text-(--ink) outline-none focus:border-(--accent) transition-colors resize-none"
                />
              )}
            </div>
          ))}

          {/* Q21 — contato */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 18 }}>emoji_events</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-(--ink)">Dados de contato</p>
                <p className="text-[12px] text-(--ink-3) mt-0.5">
                  Quem fornecer o feedback mais completo recebe <strong>6 meses de Elite grátis</strong>.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 px-3 text-[14px] text-(--ink) outline-none focus:border-(--accent) transition-colors"
              />
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 px-3 text-[14px] text-(--ink) outline-none focus:border-(--accent) transition-colors"
              />
              <div>
                <p className="text-[12px] text-(--ink-3) mb-1.5">Screenshot de bug (opcional)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setArquivo(e.target.files?.[0] ?? null)}
                  className="text-[13px] text-(--ink-2) file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-gray-100 file:text-(--ink-2) hover:file:bg-gray-200 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {erro && <p className="text-[13px] text-red-500 text-center">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3.5 font-bold text-[15px] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#ffffff' }}
          >
            {enviando ? 'Enviando...' : 'Enviar feedback →'}
          </button>

          <p className="text-center text-[11px] text-(--ink-3)">
            Seus dados não serão compartilhados com terceiros.
          </p>
        </form>
      </div>
    </div>
  );
}
