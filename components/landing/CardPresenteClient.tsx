'use client';

import { useState, useEffect } from 'react';

const TOTAL_VAGAS = 100;

const FEATURES = [
  'Plano de estudos diário com IA',
  'Simulado adaptativo (motor IRT)',
  'Tutor IA com referência em lei',
  'Raio-X do seu desempenho',
  'Todos os editais monitorados',
  'Flashcards automáticos por erro',
];

const COMPROMISSOS = [
  'Testar o app por pelo menos 2 semanas',
  'Reportar bugs e sugestões via e-mail',
  'Responder uma pesquisa rápida ao final',
];

interface Props {
  mesesPremio?: number;
}

export function CardPresenteClient({ mesesPremio = 3 }: Props) {
  const [total, setTotal] = useState<number>(47);

  useEffect(() => {
    fetch('/api/lista-espera/count')
      .then(r => r.json())
      .then(d => setTotal(d.count ?? 47))
      .catch(() => {});
    const iv = setInterval(() => {
      fetch('/api/lista-espera/count')
        .then(r => r.json())
        .then(d => setTotal(d.count ?? 47))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  const restam = Math.max(0, TOTAL_VAGAS - total);
  const progresso = Math.min(100, (total / TOTAL_VAGAS) * 100);

  return (
    <div style={{ border: '2px solid #2B3DE8', borderRadius: 20, padding: '28px 32px', background: '#EEF0FF' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>🧪</span>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2B3DE8', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
            Recompensa para beta testers
          </p>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0D1117', margin: 0 }}>
            Até 6 meses do Plano Premium grátis
          </h3>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: '#2B3DE8' }}>{total} testadores inscritos</span>
          <span style={{ color: '#7A7D8A' }}>meta: {TOTAL_VAGAS}</span>
        </div>
        <div style={{ width: '100%', height: 12, background: 'white', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(43,61,232,0.2)' }}>
          <div
            style={{ height: '100%', background: '#2B3DE8', borderRadius: 99, width: `${progresso}%`, transition: 'width 1s ease' }}
          />
        </div>
        {restam > 0 ? (
          <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 8 }}>
            ⚡ Ainda aceitamos {restam} testadores nesta fase
          </p>
        ) : (
          <p style={{ fontSize: 13, color: '#006c4a', fontWeight: 600, marginTop: 8 }}>
            ✓ Vagas desta fase preenchidas — você ainda pode entrar na fila
          </p>
        )}
      </div>

      {/* O que você ganha */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#3A3D4A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        O que você ganha
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20 }}>
        {FEATURES.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3A3D4A' }}>
            <span style={{ color: '#006c4a', fontWeight: 700 }}>✓</span> {item}
          </div>
        ))}
      </div>

      {/* O que pedimos */}
      <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(43,61,232,0.12)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#3A3D4A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          O que pedimos em troca
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {COMPROMISSOS.map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#3A3D4A' }}>
              <span style={{ color: '#2B3DE8', fontWeight: 700, flexShrink: 0 }}>→</span> {c}
            </div>
          ))}
        </div>
      </div>

      {/* Preço */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 20 }}>
        <span style={{ fontSize: 16, color: '#7A7D8A', textDecoration: 'line-through' }}>
          R${(24.9 * mesesPremio).toFixed(0).replace('.', ',')}
        </span>
        <span style={{ fontSize: 40, fontWeight: 900, color: '#0D1117', lineHeight: 1 }}>R$0</span>
        <span style={{ fontSize: 13, color: '#3A3D4A' }}>pelos primeiros 3–6 meses</span>
      </div>
    </div>
  );
}
