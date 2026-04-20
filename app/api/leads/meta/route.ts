import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const WEBHOOK_SECRET = process.env.META_WEBHOOK_SECRET;
const OFFSET_INICIAL = 47;

export async function POST(req: NextRequest) {
  // Valida segredo no header
  const secret = req.headers.get('x-webhook-secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  console.log('[leads/meta] body recebido:', JSON.stringify(body));

  // Extrai campos independente de como o Make.com estrutura o payload.
  // Suporta: campo direto, aninhado em field_data, ou bundle completo do Make.
  const fd = body.field_data ?? body.fieldData ?? body['Field data'] ?? {};

  function pick(...keys: string[]): string {
    for (const k of keys) {
      const v = body[k] ?? fd[k];
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    return '';
  }

  const nome = pick('Full name', 'full_name', 'nome_completo', 'nome');
  const email = pick('Email', 'e-mail', 'email').toLowerCase();
  const concursoRaw = body['Qual concurso você busca?'] ?? fd['Qual concurso você busca?'] ?? body.qual_concurso ?? '';
  const cargoInteresse = (Array.isArray(concursoRaw) ? concursoRaw[0] : String(concursoRaw)).trim() || null;

  if (!nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'nome e email obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: inserido, error } = await admin
    .from('lista_espera')
    .insert({
      nome,
      email,
      cargo_interesse: cargoInteresse,
      origem: 'meta_ads',
      utm_source: 'meta',
      utm_medium: 'lead_ads',
      utm_campaign: String(body.campaign_name ?? '').trim() || null,
    })
    .select('posicao, referral_code, total_indicacoes')
    .single();

  let posicao: number | null = inserido?.posicao ?? null;
  let referralCode: string | null = inserido?.referral_code ?? null;

  if (error) {
    if (error.code !== '23505') {
      console.error('[leads/meta]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Email duplicado — retorna dados existentes sem erro
    const { data: existente } = await admin
      .from('lista_espera')
      .select('posicao, referral_code')
      .eq('email', email)
      .single();
    posicao = existente?.posicao ?? null;
    referralCode = existente?.referral_code ?? null;
  }

  const posicaoExibida = posicao !== null ? posicao + OFFSET_INICIAL : null;

  // Envia e-mail de boas-vindas
  if (resend && referralCode) {
    try {
      const linkReferral = `https://otutor.com.br?ref=${referralCode}`;
      await resend.emails.send({
        from: 'O Tutor <noreply@otutor.com.br>',
        to: email,
        subject: 'Bem-vindo ao programa de testes — O Tutor',
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h1 style="font-size:24px;font-weight:700;color:#0D1117;margin-bottom:8px">
              Bem-vindo ao beta, ${nome.split(' ')[0]}!
            </h1>
            <p style="color:#3A3D4A;font-size:15px;line-height:1.6;margin-bottom:8px">
              Você é o testador <strong>#${posicaoExibida}</strong> na lista do O Tutor.
            </p>
            <p style="color:#3A3D4A;font-size:14px;line-height:1.6;margin-bottom:24px">
              Quando liberarmos seu acesso, você receberá outro e-mail. O Plano Premium será ativado automaticamente na sua conta.
            </p>
            <div style="background:#EEF0FF;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="font-size:14px;font-weight:600;color:#2B3DE8;margin:0 0 8px">Indique outros concurseiros!</p>
              <p style="font-size:13px;color:#3A3D4A;margin:0 0 12px;line-height:1.5">
                Indique 3 amigos e entre no <strong>Top 20%</strong> da fila.<br/>
                Indique 5 e garanta <strong>3 meses Premium</strong>.<br/>
                Indique 10 e garanta <strong>6 meses Premium</strong>.
              </p>
              <a href="${linkReferral}" style="display:inline-block;background:#2B3DE8;color:white;font-size:14px;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none">
                Compartilhar meu link →
              </a>
            </div>
            <p style="font-size:12px;color:#7A7D8A;word-break:break-all">Seu link: ${linkReferral}</p>
            <hr style="border:none;border-top:1px solid #EEEEF6;margin:24px 0"/>
            <p style="font-size:12px;color:#7A7D8A">O Tutor · otutor.com.br</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[leads/meta] Resend error:', e);
    }
  }

  return NextResponse.json({ ok: true, posicao: posicaoExibida, referralCode });
}
