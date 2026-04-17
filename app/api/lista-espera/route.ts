import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET() {
  const admin = createAdminClient();
  const { count } = await admin
    .from('lista_espera')
    .select('id', { count: 'exact', head: true });
  return NextResponse.json({ total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nome = String(body.nome ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const cargoInteresse = String(body.cargoInteresse ?? '').trim() || null;
  const origem = req.nextUrl.searchParams.get('utm_source') ?? 'landing';

  if (!nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ erro: 'Nome e e-mail válidos são obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: inserido, error } = await admin
    .from('lista_espera')
    .insert({ nome, email, cargo_interesse: cargoInteresse, origem })
    .select('posicao')
    .single();

  let posicao: number | null = inserido?.posicao ?? null;

  if (error) {
    if (error.code !== '23505') {
      console.error('[lista-espera]', error);
      return NextResponse.json({ erro: 'Erro ao cadastrar. Tente novamente.' }, { status: 500 });
    }
    // e-mail já existe — buscar posição
    const { data: existente } = await admin
      .from('lista_espera')
      .select('posicao')
      .eq('email', email)
      .single();
    posicao = existente?.posicao ?? null;
  }

  // E-mail de confirmação — falha silenciosa se Resend não configurado
  if (resend) {
    try {
      await resend.emails.send({
        from: 'O Tutor <noreply@otutor.com.br>',
        to: email,
        subject: 'Você está na lista — O Tutor',
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h1 style="font-size:24px;font-weight:700;color:#0D1117;margin-bottom:8px">
              Você está dentro, ${nome.split(' ')[0]}!
            </h1>
            <p style="color:#3A3D4A;font-size:15px;line-height:1.6;margin-bottom:24px">
              Você é o <strong>#${posicao}</strong> na lista de espera do O Tutor.
            </p>
            <div style="background:#EEF0FF;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="font-size:14px;font-weight:600;color:#2B3DE8;margin:0 0 8px">Seu presente de lançamento</p>
              <p style="font-size:13px;color:#3A3D4A;margin:0;line-height:1.5">
                Os primeiros 50 cadastros ganham <strong>3 meses do Plano Premium gratuitos</strong>
                assim que o app abrir. Isso inclui tutor IA ilimitado, simulados adaptativos,
                raio-X de edital e muito mais.
              </p>
            </div>
            <p style="font-size:13px;color:#7A7D8A;line-height:1.6">
              Avisaremos por aqui quando o acesso abrir. Nenhuma ação necessária da sua parte.
            </p>
            <hr style="border:none;border-top:1px solid #EEEEF6;margin:24px 0"/>
            <p style="font-size:12px;color:#7A7D8A">O Tutor · otutor.com.br · contato@otutor.com.br</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[lista-espera] Resend error:', e);
    }
  }

  return NextResponse.json({ ok: true, posicao });
}
