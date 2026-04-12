'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IDENTIDADE } from '@/config/identidade';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',      icon: '◻' },
  { href: '/editais',     label: 'Editais',         icon: '◈' },
  { href: '/simulado',    label: 'Simulados',       icon: '◉' },
  { href: '/desempenho',  label: 'Desempenho',      icon: '◎' },
  { href: '/plano',       label: 'Plano de Estudo', icon: '◆' },
  { href: '/flashcards',  label: 'Flashcards',      icon: '◇' },
  { href: '/tutor',       label: 'Tutor IA',        icon: '◍' },
  { href: '/conta',       label: 'Conta',           icon: '◯' },
];

interface SidebarProps {
  user: { nome: string; email: string; plano: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] h-screen sticky top-0 border-r border-(--border) bg-(--surface) shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-(--border)">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-(--accent) flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
              </svg>
            </div>
            <span className="font-bold text-[14px] tracking-tight text-(--ink)">{IDENTIDADE.nomeCurto}</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-(--radius-sm) text-[13px] font-medium transition-all',
                  active
                    ? 'bg-(--accent-light) text-(--accent-text)'
                    : 'text-(--ink-2) hover:bg-(--surface-2) hover:text-(--ink)',
                ].join(' ')}
              >
                <span className="text-[16px] w-5 text-center">{item.icon}</span>
                {item.label}
                {item.href === '/conta' && user?.plano === 'premium' && (
                  <Badge variant="accent" className="ml-auto text-[9px]">PRO</Badge>
                )}
                {item.href === '/conta' && user?.plano === 'free' && (
                  <Badge variant="default" className="ml-auto text-[9px]">FREE</Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-(--border)">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.nome || user.email} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-(--ink) truncate">{user.nome || 'Usuário'}</p>
                <p className="text-[10px] text-(--ink-3) truncate">{user.plano}</p>
              </div>
              <button
                onClick={sair}
                className="text-(--ink-3) hover:text-(--danger) text-[12px] shrink-0 transition-colors"
                title="Sair"
              >
                ⎋
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-(--surface) border-t border-(--border) flex">
        {NAV.slice(0, 4).map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-(--accent)' : 'text-(--ink-3)',
              ].join(' ')}
            >
              <span className="text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
