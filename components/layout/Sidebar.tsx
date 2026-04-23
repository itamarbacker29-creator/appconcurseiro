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
  { href: '/dashboard',   label: 'Dashboard',      icon: 'home' },
  { href: '/editais',     label: 'Editais',         icon: 'description' },
  { href: '/simulado',    label: 'Simulados',       icon: 'quiz' },
  { href: '/desempenho',  label: 'Desempenho',      icon: 'bar_chart' },
  { href: '/estimativa',  label: 'Estimativa',      icon: 'emoji_events' },
  { href: '/plano',       label: 'Plano de Estudo', icon: 'calendar_month' },
  { href: '/flashcards',  label: 'Flashcards',      icon: 'style' },
  { href: '/apostilas',   label: 'Apostilas',       icon: 'menu_book' },
  { href: '/tutor',       label: 'Tutor IA',        icon: 'auto_awesome' },
  { href: '/conta',       label: 'Conta',           icon: 'manage_accounts' },
];

const MOBILE_NAV_HREFS = ['/dashboard', '/editais', '/simulado', '/desempenho', '/conta'];

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
            <img src="/logo.png" alt="O Tutor" width={32} height={32} />
            <span className="font-black text-[15px] tracking-tight text-(--accent)" style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              {IDENTIDADE.nomeCurto}
            </span>
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
                data-tour={`nav-${item.href.slice(1)}`}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-(--radius-sm) text-[13px] font-medium transition-all',
                  active
                    ? 'bg-(--accent-light) text-(--accent-text)'
                    : 'text-(--ink-2) hover:bg-(--surface-2) hover:text-(--ink)',
                ].join(' ')}
              >
                <span className={`material-symbols-outlined text-[20px] w-5 text-center ${active ? 'filled' : ''}`} style={{ fontSize: '20px' }}>
                  {item.icon}
                </span>
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

      {/* Mobile bottom tab bar — Dashboard, Editais, Simulados, Desempenho, Conta */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-(--border) flex justify-around items-center px-2 py-1">
        {NAV.filter(item => MOBILE_NAV_HREFS.includes(item.href)).map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={`nav-${item.href.slice(1)}`}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-[10px] font-semibold',
                active ? 'text-brand-navy bg-brand-navy/8' : 'text-text-muted',
              ].join(' ')}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '22px',
                  fontVariationSettings: active ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
