import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from('lista_espera')
    .select('nome, total_indicacoes, beneficio')
    .eq('referral_code', code)
    .single();

  if (!data) {
    return NextResponse.json({ erro: 'Código não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    nome: data.nome.split(' ')[0],
    totalIndicacoes: data.total_indicacoes,
    beneficio: data.beneficio,
  });
}
