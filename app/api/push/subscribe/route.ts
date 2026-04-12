import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const subscription = await req.json();

  await supabase.from('profiles').update({
    push_subscription: subscription,
  }).eq('id', user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await supabase.from('profiles').update({ push_subscription: null }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
