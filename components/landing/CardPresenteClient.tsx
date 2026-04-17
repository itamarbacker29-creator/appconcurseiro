'use client';

import { useState, useEffect } from 'react';

const TOTAL_VAGAS = 100;

const FEATURES = [
  'Tutor IA ilimitado', 'Todos os editais',
  'Simulado adaptativo', 'Upload de apostilas',
  'Raio-X do edital', 'Plano de estudo com IA',
];

export function CardPresenteClient() {
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
        <span style={{ fontSize: 32 }}>🎁</span>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2B3DE8', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
            Presente para os primeiros 50
          </p>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0D1117', margin: 0 }}>
            3 meses do Plano Premium grátis
          </h3>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: '#2B3DE8' }}>{total} vagas preenchidas</span>
          <span style={{ color: '#7A7D8A' }}>de {TOTAL_VAGAS}</span>
        </div>
        <div style={{ width: '100%', height: 12, background: 'white', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(43,61,232,0.2)' }}>
          <div
            style={{ height: '100%', background: '#2B3DE8', borderRadius: 99, width: `${progresso}%`, transition: 'width 1s ease' }}
          />
        </div>
        <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 8 }}>
          ⚡ Restam apenas {restam} vagas com esse benefício
        </p>
      </div>

      {/* Preço */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: '#7A7D8A', textDecoration: 'line-through' }}>R$74,70</span>
        <span style={{ fontSize: 40, fontWeight: 900, color: '#0D1117', lineHeight: 1 }}>R$0</span>
        <span style={{ fontSize: 13, color: '#3A3D4A' }}>pelos primeiros 3 meses</span>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
        {FEATURES.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3A3D4A' }}>
            <span style={{ color: '#006c4a', fontWeight: 700 }}>✓</span> {item}
          </div>
        ))}
      </div>
    </div>
  );
}
