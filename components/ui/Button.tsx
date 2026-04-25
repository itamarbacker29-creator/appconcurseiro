'use client';

import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  primary: 'bg-(--accent) hover:bg-(--accent-hover) text-white border-transparent',
  ghost:   'bg-transparent hover:bg-(--surface-2) text-(--ink) border-(--border-strong)',
  danger:  'bg-(--danger) hover:opacity-90 text-white border-transparent',
  success: 'bg-(--teal) hover:opacity-90 text-white border-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'text-[13px] px-3 py-1.5 h-8',
  md: 'text-[14px] px-4 py-2 h-9',
  lg: 'text-[15px] px-6 py-2.5 h-11',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold rounded-(--radius-sm)',
        'border transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        styles[variant],
        sizes[size],
        className,
      ].join(' ')}
      style={variant === 'primary' || variant === 'danger' || variant === 'success' ? { color: '#ffffff', ...props.style } : props.style}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
