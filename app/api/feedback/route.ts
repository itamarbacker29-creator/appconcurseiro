import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const respostasRaw = form.get('respostas');
    const nome = form.get('nome') as string | null;
    const email = form.get('email') as string | null;
    const arquivo = form.get('arquivo') as File | null;

    const respostas = respostasRaw ? JSON.parse(respostasRaw as string) : {};

    let screenshot_url: string | null = null;
    if (arquivo && arquivo.size > 0) {
      const ext = arquivo.name.split('.').pop() ?? 'jpg';
      const path = `feedback/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from('uploads')
        .upload(path, buffer, { contentType: arquivo.type, upsert: false });
      if (!upErr) {
        const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path);
        screenshot_url = urlData.publicUrl;
      }
    }

    const { error } = await supabaseAdmin.from('feedbacks_beta').insert({
      nome: nome || null,
      email: email || null,
      respostas,
      screenshot_url,
    });

    if (error) {
      console.error('[feedback]', error);
      return NextResponse.json({ error: 'Falha ao salvar feedback. Tente novamente.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[feedback]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
