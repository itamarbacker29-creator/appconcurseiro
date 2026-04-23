'use client';

import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Cell, Tooltip,
} from 'recharts';

interface ChartEntry {
  data: string;
  taxa: number;
}

interface Props {
  dados: ChartEntry[];
}

export function DesempenhoChart({ dados }: Props) {
  if (dados.length === 0) return null;

  return (
    <div className="bg-(--surface) rounded-(--radius) p-5 border border-(--border)">
      <h3 className="text-[15px] font-bold text-brand-navy mb-4">Evolução (últimos 14 dias)</h3>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={dados} barSize={18} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="data"
            tick={{ fontSize: 10, fill: '#8A9BB0' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: 'rgba(23,55,94,0.05)' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(23,55,94,0.12)', color: '#17375E' }}
            formatter={(v: number) => [`${v}%`, 'Taxa']}
          />
          <ReferenceLine
            y={60}
            stroke="#2D9E6B"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Meta 60%', position: 'right', fontSize: 10, fill: '#2D9E6B', fontWeight: 'bold' }}
          />
          <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
            {dados.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.taxa >= 60 ? '#2D9E6B' : entry.taxa >= 40 ? '#E8870A' : '#C93333'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3">
        {[
          { color: 'bg-success', label: 'Acima da meta' },
          { color: 'bg-warning-2', label: 'Em progresso' },
          { color: 'bg-danger-2', label: 'Precisa melhorar' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-[11px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
