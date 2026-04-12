'use client';

import Link from 'next/link';
import { IDENTIDADE } from '@/config/identidade';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-(--surface) border-b border-(--border) flex items-center">
      <div className="max-w-[860px] mx-auto w-full px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-(--accent) flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight text-(--ink)">
            {IDENTIDADE.nomeCurto}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="#editais" className="text-[14px] text-(--ink-2) hover:text-(--ink) transition-colors">Editais</Link>
          <Link href="#simulados" className="text-[14px] text-(--ink-2) hover:text-(--ink) transition-colors">Simulados</Link>
          <Link href="#precos" className="text-[14px] text-(--ink-2) hover:text-(--ink) transition-colors">Planos</Link>
        </div>

        <Link href="/login">
          <Button size="sm">Entrar grátis</Button>
        </Link>
      </div>
    </nav>
  );
}
