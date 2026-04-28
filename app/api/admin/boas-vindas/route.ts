import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

const OFFSET_INICIAL = 47;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.error('[boas-vindas] ADMIN_SECRET não configurada — endpoint desativado');
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY ?? '');

  const admin = createAdminClient();
  const { data: leads } = await admin
    .from('lista_espera')
    .select('email, nome, posicao, referral_code')
    .order('posicao', { ascending: true });

  if (!leads?.length) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const resultados: { email: string; status: string }[] = [];

  for (const lead of leads) {
    const posicaoExibida = (lead.posicao ?? 0) + OFFSET_INICIAL;
    const linkReferral = `https://otutor.com.br?ref=${lead.referral_code}`;
    const primeiroNome = (lead.nome ?? 'Concurseiro').split(' ')[0];

    try {
      await resend.emails.send({
        from: 'O Tutor <contato@otutor.com.br>',
        to: lead.email,
        subject: 'Bem-vindo ao programa de testes — O Tutor',
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h1 style="font-size:24px;font-weight:700;color:#0D1117;margin-bottom:8px">
              Bem-vindo ao beta, ${primeiroNome}!
            </h1>
            <p style="color:#3A3D4A;font-size:15px;line-height:1.6;margin-bottom:8px">
              Você é o testador <strong>#${posicaoExibida}</strong> na lista do O Tutor.
            </p>
            <p style="color:#3A3D4A;font-size:14px;line-height:1.6;margin-bottom:24px">
              Quando liberarmos seu acesso, você receberá outro e-mail. O Plano Premium será ativado automaticamente na sua conta como agradecimento pela participação nos testes.
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
            <p style="font-size:12px;color:#7A7D8A">O Tutor · otutor.com.br · contato@otutor.com.br</p>
          </div>
        `,
      });
      resultados.push({ email: lead.email, status: 'enviado' });
    } catch (e) {
      console.error(`[boas-vindas] Erro ao enviar para ${lead.email}:`, e);
      resultados.push({ email: lead.email, status: 'erro' });
    }
  }

  const enviados = resultados.filter(r => r.status === 'enviado').length;
  const erros = resultados.filter(r => r.status === 'erro').length;

  return NextResponse.json({ ok: true, enviados, erros, detalhes: resultados });
}
