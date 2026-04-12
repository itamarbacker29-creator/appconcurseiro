'use client';

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-(--ink-2)"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ink-3)">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            'w-full h-10 rounded-(--radius-sm) border px-3 text-[14px]',
            'bg-(--surface) text-(--ink) placeholder:text-(--ink-3)',
            'outline-none transition-all duration-150',
            icon ? 'pl-9' : '',
            error
              ? 'border-(--danger) focus:ring-2 focus:ring-(--danger)/20'
              : focused
              ? 'border-(--accent) ring-2 ring-(--accent)/15'
              : 'border-(--border-strong)',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[12px] text-(--danger)">{error}</span>
      )}
    </div>
  );
}
