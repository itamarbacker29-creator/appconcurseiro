import Link from 'next/link';
import { IDENTIDADE } from '@/config/identidade';

export function Footer() {
  return (
    <footer className="border-t border-(--border) bg-(--surface-2) py-8 mt-auto">
      <div className="max-w-[860px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="O Tutor" width={26} height={26} />
          <span className="text-[13px] font-black text-(--accent)" style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>{IDENTIDADE.nomeCurto}</span>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/privacidade" className="text-[12px] text-(--ink-3) hover:text-(--ink-2) transition-colors">Privacidade</Link>
          <Link href="/termos" className="text-[12px] text-(--ink-3) hover:text-(--ink-2) transition-colors">Termos</Link>
          <a href={`mailto:${IDENTIDADE.emailContato}`} className="text-[12px] text-(--ink-3) hover:text-(--ink-2) transition-colors">Contato</a>
        </div>

        <p className="text-[11px] text-(--ink-3)">
          © 2025 {IDENTIDADE.nomeApp} · {IDENTIDADE.dominioPrincipal} · LGPD compliant
        </p>
      </div>
    </footer>
  );
}
