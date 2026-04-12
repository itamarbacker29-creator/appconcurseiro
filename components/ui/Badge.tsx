import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:  'bg-(--surface-3) text-(--ink-2)',
  success:  'bg-(--teal-light) text-(--teal-text)',
  warning:  'bg-(--warning-light) text-amber-700',
  danger:   'bg-(--danger-light) text-(--danger)',
  accent:   'bg-(--accent-light) text-(--accent-text)',
  outline:  'bg-transparent border border-(--border-strong) text-(--ink-2)',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
