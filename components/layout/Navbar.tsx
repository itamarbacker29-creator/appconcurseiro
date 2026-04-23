'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IDENTIDADE } from '@/config/identidade';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-(--surface) border-b border-(--border) flex items-center">
      <div className="max-w-[860px] mx-auto w-full px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="O Tutor" width={34} height={34} priority />
          <span className="font-black text-[16px] tracking-tight text-(--accent)" style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
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
