import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { verificarLimite, limitadores } from '@/lib/ratelimit';

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const BUCKET = 'apostilas';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('plano').eq('id', user.id).single();
  const plano = profile?.plano ?? 'free';

  if (plano === 'free') {
    const { permitido } = await verificarLimite(limitadores.uploadFree, user.id);
    if (!permitido) return NextResponse.json({ error: 'Limite de 1 PDF/mês no plano gratuito. Faça upgrade para Premium.' }, { status: 429 });
  } else if (plano === 'premium') {
    const { permitido } = await verificarLimite(limitadores.uploadPremium, user.id);
    if (!permitido) return NextResponse.json({ error: 'Limite de 5 PDFs/mês no plano Premium atingido. Faça upgrade para Elite.' }, { status: 429 });
  }
  // elite: sem limite

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const titulo = (formData.get('titulo') as string | null)?.trim() || null;
  const materia = (formData.get('materia') as string | null)?.trim() || null;
  const editalId = (formData.get('editalId') as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Apenas PDFs são aceitos.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 20 MB.' }, { status: 400 });

  const buffer = new Uint8Array(await file.arrayBuffer());
  const fileName = `${user.id}/${crypto.randomUUID()}.pdf`;

  const adminClient = createAdminClient();

  // Garante que o bucket existe
  await adminClient.storage.createBucket(BUCKET, { public: false }).catch(() => { /* já existe */ });

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    console.error('[materiais/upload] Storage error:', uploadError);
    return NextResponse.json({ error: 'Falha ao salvar o arquivo. Tente novamente.' }, { status: 500 });
  }

  const { data: material, error: dbError } = await adminClient
    .from('materiais')
    .insert({
      user_id: user.id,
      nome_arquivo: file.name,
      titulo: titulo ?? file.name.replace(/\.pdf$/i, ''),
      materia: materia ?? null,
      edital_id: editalId ?? null,
      url_storage: fileName,
      tamanho_bytes: file.size,
      processado: false,
    })
    .select('id')
    .single();

  if (dbError || !material) {
    console.error('[materiais/upload] DB error:', dbError);
    await adminClient.storage.from(BUCKET).remove([fileName]);
    return NextResponse.json({ error: 'Falha ao registrar o arquivo.' }, { status: 500 });
  }

  return NextResponse.json({ id: material.id });
}
