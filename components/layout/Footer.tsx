import Link from 'next/link';
import { IDENTIDADE } from '@/config/identidade';

export function Footer() {
  return (
    <footer className="border-t border-(--border) bg-(--surface-2) py-8 mt-auto">
      <div className="max-w-[860px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-(--accent) flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-(--ink)">{IDENTIDADE.nomeCurto}</span>
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
