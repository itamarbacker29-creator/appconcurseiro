import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export const revalidate = 3600; // cache por 1 hora

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('editais')
      .select('id, orgao, cargo, salario, vagas, banca, data_fim_inscricao, status')
      .in('status', ['ativo', 'previsto'])
      .not('salario', 'is', null)
      .order('salario', { ascending: false })
      .limit(6);

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[maiores-salarios]', err);
    return NextResponse.json([], { status: 200 }); // falha silenciosa — seção fica vazia
  }
}
