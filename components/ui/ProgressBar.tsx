interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'accent' | 'teal' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const colors = {
  accent:  'bg-(--accent)',
  teal:    'bg-(--teal)',
  warning: 'bg-(--warning)',
  danger:  'bg-(--danger)',
};

const heights = { sm: 'h-1.5', md: 'h-2.5' };

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  color = 'accent',
  size = 'md',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="flex flex-col gap-1">
      {(label || showPercent) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-[12px] text-(--ink-2)">{label}</span>}
          {showPercent && <span className="text-[12px] font-semibold text-(--ink)">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-(--surface-3) rounded-full overflow-hidden`}>
        <div
          className={`${heights[size]} ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
