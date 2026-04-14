'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function FlashcardsPage() {
  return (
    <div className="p-4 md:p-6 max-w-[600px] mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-(--accent-light) flex items-center justify-center text-3xl">
        ◇
      </div>
      <div>
        <h1 className="text-[22px] font-bold text-(--ink)">Flashcards</h1>
        <p className="text-[14px] text-(--ink-3) mt-2 max-w-[360px]">
          Revise os conteúdos das matérias com flashcards gerados automaticamente a partir dos seus erros e do conteúdo dos editais.
        </p>
      </div>
      <div className="bg-(--surface-2) border border-(--border) rounded-(--radius) p-4 w-full max-w-[320px]">
        <p className="text-[12px] font-semibold text-(--accent) uppercase tracking-wide mb-1">Em breve</p>
        <p className="text-[13px] text-(--ink-2)">
          Os flashcards são criados automaticamente quando você erra uma questão duas vezes seguidas. Disponível em breve.
        </p>
      </div>
      <Link href="/simulado">
        <Button variant="ghost">Fazer um simulado agora</Button>
      </Link>
    </div>
  );
}
