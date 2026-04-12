import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hover?: boolean;
}

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export function Card({ children, className = '', padding = 'md', onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-(--surface) border border-(--border) rounded-(--radius)',
        paddings[padding],
        hover ? 'transition-shadow hover:shadow-md cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
