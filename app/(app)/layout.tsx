import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, plano, onboarding_completo')
    .eq('id', user.id)
    .single();

  // Redireciona para onboarding se ainda não completou
  if (profile && !profile.onboarding_completo) {
    redirect('/onboarding');
  }

  const userData = {
    nome: profile?.nome ?? user.email?.split('@')[0] ?? 'Usuário',
    email: user.email ?? '',
    plano: profile?.plano ?? 'free',
  };

  return (
    <div className="flex min-h-screen bg-(--surface-2)">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
