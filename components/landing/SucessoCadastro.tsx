'use client';

const RECOMPENSAS = [
  { indicacoes: 3, beneficio: 'Sobe para o Top 20% da fila', icone: '⚡' },
  { indicacoes: 5, beneficio: '3 meses Premium garantidos', icone: '🎁' },
  { indicacoes: 10, beneficio: '6 meses Premium grátis', icone: '🏆' },
];

interface Props {
  posicao: number;
  nome: string;
  referralCode: string;
  totalIndicacoes: number;
}

export function SucessoCadastro({ posicao, nome, referralCode, totalIndicacoes }: Props) {
  const primeiroNome = nome.split(' ')[0];
  const link = `https://otutor.com.br?ref=${referralCode}`;
  const textoWhatsApp = encodeURIComponent(
    `Entrei na lista de espera do O Tutor — um app de IA para concursos que monta simulado adaptativo e te diz exatamente o que estudar! Entra comigo: ${link}`
  );

  function copiar() {
    navigator.clipboard.writeText(link).catch(() => {});
    const btn = document.getElementById('btn-copiar');
    if (btn) {
      btn.textContent = 'Copiado!';
      setTimeout(() => { if (btn) btn.textContent = 'Copiar link'; }, 2000);
    }
  }

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl bg-white border border-[rgba(0,0,0,0.08)] p-8 text-center shadow-sm">
      {/* Ícone de sucesso */}
      <div className="w-14 h-14 rounded-full bg-[#EEF0FF] flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#2B3DE8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h3 className="text-[20px] font-bold text-[#0D1117] mb-1">
        Você está dentro, {primeiroNome}!
      </h3>
      <p className="text-[15px] text-[#3A3D4A] mb-5">
        Você é o <strong className="text-[#2B3DE8]">#{posicao}</strong> na lista.
      </p>

      {/* Bloco de indicação */}
      <div className="bg-[#F7F8FC] rounded-xl p-5 mb-5 text-left border border-[rgba(0,0,0,0.06)]">
        <p className="text-[13px] font-bold text-[#0D1117] mb-1">Suba na fila indicando amigos</p>
        <p className="text-[12px] text-[#7A7D8A] mb-4">
          Cada amigo que se cadastrar pelo seu link te dá benefícios:
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {RECOMPENSAS.map(r => (
            <div key={r.indicacoes} className="flex items-center gap-3">
              <span className="text-[18px]">{r.icone}</span>
              <div>
                <span className="text-[12px] font-bold text-[#2B3DE8]">{r.indicacoes} indicações</span>
                <span className="text-[12px] text-[#3A3D4A]"> → {r.beneficio}</span>
              </div>
            </div>
          ))}
        </div>

        {totalIndicacoes > 0 && (
          <p className="text-[12px] font-semibold text-[#006c4a] mb-3">
            ✓ Você já tem {totalIndicacoes} indicaç{totalIndicacoes === 1 ? 'ão' : 'ões'}!
          </p>
        )}

        {/* Link */}
        <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.10)] px-3 py-2 text-[11px] text-[#3A3D4A] font-mono break-all mb-3">
          {link}
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            id="btn-copiar"
            onClick={copiar}
            className="flex-1 py-2.5 rounded-lg border border-[rgba(43,61,232,0.3)] text-[13px] font-semibold text-[#2B3DE8] hover:bg-[#EEF0FF] transition-colors"
          >
            Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${textoWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-lg bg-[#25D366] text-white text-[13px] font-semibold text-center hover:bg-[#1ebe5d] transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <p className="text-[12px] text-[#7A7D8A]">
        Enviamos um e-mail com seu link. Avisaremos quando o acesso abrir.
      </p>
    </div>
  );
}
