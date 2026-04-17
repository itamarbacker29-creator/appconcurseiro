'use client';

import { useState, useEffect } from 'react';

const TOTAL_VAGAS = 100;

const AVATARES = [
  { iniciais: 'MC', cor: '#2B3DE8' },
  { iniciais: 'JF', cor: '#006c4a' },
  { iniciais: 'RP', cor: '#9333ea' },
  { iniciais: 'AS', cor: '#dc2626' },
  { iniciais: 'BL', cor: '#ea580c' },
];

const ENTRADAS = [
  { nome: 'Maria C.', cidade: 'Curitiba' },
  { nome: 'João F.', cidade: 'São Paulo' },
  { nome: 'Ana R.', cidade: 'Fortaleza' },
  { nome: 'Carlos M.', cidade: 'Belo Horizonte' },
  { nome: 'Juliana S.', cidade: 'Recife' },
  { nome: 'Pedro A.', cidade: 'Manaus' },
  { nome: 'Fernanda L.', cidade: 'Porto Alegre' },
  { nome: 'Rafael T.', cidade: 'Brasília' },
  { nome: 'Camila N.', cidade: 'Salvador' },
  { nome: 'Lucas B.', cidade: 'Goiânia' },
];

interface Props {
  tema?: 'light' | 'dark';
  mostrarBarra?: boolean;
}

export function ContadorVivos({ tema = 'light', mostrarBarra = false }: Props) {
  const [total, setTotal] = useState<number | null>(null);
  const [toast, setToast] = useState<{ nome: string; cidade: string } | null>(null);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [indiceToast, setIndiceToast] = useState(0);

  useEffect(() => {
    async function buscar() {
      try {
        const r = await fetch('/api/lista-espera/count');
        const d = await r.json();
        setTotal(d.count ?? 0);
      } catch {}
    }
    buscar();
    const iv = setInterval(buscar, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Toast aleatório a cada 45–90s
  useEffect(() => {
    function agendar() {
      const delay = 45_000 + Math.random() * 45_000;
      return setTimeout(() => {
        const entrada = ENTRADAS[indiceToast % ENTRADAS.length];
        setToast(entrada);
        setToastVisivel(true);
        setIndiceToast(i => i + 1);
        setTimeout(() => setToastVisivel(false), 4_000);
        agendar();
      }, delay);
    }
    const t = agendar();
    return () => clearTimeout(t);
  }, [indiceToast]);

  const isDark = tema === 'dark';
  const restam = total !== null ? Math.max(0, TOTAL_VAGAS - total) : null;
  const progresso = total !== null ? Math.min(100, (total / TOTAL_VAGAS) * 100) : 0;

  return (
    <>
      {/* Barra de progresso — opcional */}
      {mostrarBarra && total !== null && (
        <div className="w-full mb-4">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className={`font-bold ${isDark ? 'text-white/80' : 'text-[#3A3D4A]'}`}>
              {total} vagas preenchidas
            </span>
            <span className={isDark ? 'text-white/50' : 'text-[#7A7D8A]'}>de {TOTAL_VAGAS}</span>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[rgba(0,0,0,0.06)]'}`}>
            <div
              className="h-full bg-[#2B3DE8] rounded-full transition-all duration-700"
              style={{ width: `${progresso}%` }}
            />
          </div>
          {restam !== null && restam > 0 && (
            <p className="text-[12px] text-red-500 font-semibold mt-1.5">
              ⚡ Restam apenas {restam} vagas com esse benefício
            </p>
          )}
        </div>
      )}

      {/* Avatares + contador */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex -space-x-2">
          {AVATARES.map((a, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: a.cor }}
            >
              {a.iniciais}
            </div>
          ))}
        </div>
        {total !== null ? (
          <p className={`text-[13px] ${isDark ? 'text-white/70' : 'text-[#3A3D4A]'}`}>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-[#2B3DE8]'}`}>{total} pessoas</span>
            {' '}já garantiram sua vaga
          </p>
        ) : (
          <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-[#7A7D8A]'}`}>carregando...</p>
        )}
      </div>

      {/* Toast — canto inferior esquerdo */}
      {toast && (
        <div
          className={`fixed bottom-6 left-4 z-50 flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 shadow-lg transition-all duration-500 max-w-[260px] ${toastVisivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          <div className="w-8 h-8 rounded-full bg-[#E4F7F0] flex items-center justify-center shrink-0">
            <span className="text-[#006c4a] text-sm font-bold">✓</span>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#0D1117] leading-tight">{toast.nome} de {toast.cidade}</p>
            <p className="text-[11px] text-[#7A7D8A]">acaba de se cadastrar</p>
          </div>
        </div>
      )}
    </>
  );
}
