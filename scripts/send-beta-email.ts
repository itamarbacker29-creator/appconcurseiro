/**
 * Script de envio do email convite para beta testers do O Tutor.
 *
 * Uso:
 *   npx tsx scripts/send-beta-email.ts --modo aprovacao
 *   npx tsx scripts/send-beta-email.ts --modo producao
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const resend   = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FROM    = 'O Tutor <contato@otutor.com.br>';
const SUBJECT = 'Seu acesso beta ao O Tutor está liberado';

// ── Listas de destinatários ───────────────────────────────────────────────────

const APROVACAO = [
  'itamar.backer29@gmail.com',
  'vanessa.clg22@gmail.com',
  'eupeladeiroapp@gmail.com',
];

const SEM_PLAYSTORE = new Set([
  'analuciadavo@hotmail.com',
  'churchsagui@yahoo.com',
  'dalvamoro@outlook.com',
  'franjaekel@yahoo.com.br',
  'susula01@hotmail.com',
  'thiagosilva376@yahoo.com.br',
]);

const PRODUCAO = [
  'adam.evelyn@yahoo.com.br',
  'agnaldomarttins@gmail.com',
  'alex.ribeiro01071985@gmail.com',
  'alzenirp444@gmail.com',
  'apbdireito@yahoo.com.br',
  'argel.maycon.g@gmail.com',
  'carolbiologia93@gmail.com',
  'catiaanajulia.enzo@gmail.com',
  'catialuciaedilenethome@gmail.com',
  'cicerotse@gmail.com',
  'dalvamoro63@gmail.com',
  'danyelafps@gmail.com',
  'edsonpla22@gmail.com',
  'erlaniaf@gmail.com',
  'etbpmce22@gmail.com',
  'fc9421625@gmail.com',
  'hermesonalvez@gmail.com',
  'iranilima651@gmail.com',
  'ismael.carmo1@gmail.com',
  'itamar.backer29@gmail.com',
  'jazevedosalgado@gmail.com',
  'jeffcarlim@yahoo.com.br',
  'josineyja@gmail.com',
  'karolsinha28@hotmail.com',
  'kfiock@outlook.com',
  'lcrptc1974@gmail.com',
  'limoiano@gmail.com',
  'lisycristina@hotmail.com',
  'luzienevelozo202412@gmail.com',
  'marcelo242780@gmail.com',
  'marciagabriela1970@gmail.com',
  'marciagabrielasantana@gmail.com',
  'marcosrobertoappeldeoliveira@gmail.com',
  'marlizanardini@gmail.com',
  'mocambitepereira2025@gmail.com',
  'nerivaldosantos2011@gmail.com',
  'rachelcpinheiro@yahoo.com.br',
  'raicram14@gmail.com',
  'raicram1@hotmail.com',
  'rogeriofutema@gmail.com',
  'rogeriorf0812@gmail.com',
  'silvanymoreira68@gmail.com',
  'sjoseantoniof65@gmail.com',
  'ssdiasdafraga@gmail.com',
  'sulamitadeoliveira420@gmail.com',
  'susys9129@gmail.com',
  'tarapanoff.alessandra@gmail.com',
  'terezaadv1957@gmail.com',
  'vanessa.clg22@gmail.com',
  'velhopereiraaugustaluzia@gmail.com',
  // sem Play Store
  'analuciadavo@hotmail.com',
  'churchsagui@yahoo.com',
  'dalvamoro@outlook.com',
  'franjaekel@yahoo.com.br',
  'susula01@hotmail.com',
  'thiagosilva376@yahoo.com.br',
];

// ── Template HTML ─────────────────────────────────────────────────────────────

function gerarHtml(opts: {
  nome: string;
  referralCode: string | null;
  comPlayStore: boolean;
}): string {
  const { nome, referralCode, comPlayStore } = opts;
  const primeiroNome = nome.split(' ')[0] || 'Candidato';
  const linkIndicacao = referralCode
    ? `https://www.otutor.com.br?ref=${referralCode}`
    : 'https://www.otutor.com.br';
  const codigoIndicacao = referralCode ?? '—';

  const linhaPlayStore = comPlayStore
    ? `<p style="margin: 0 0 8px 0; font-size: 15px; color: #1F2937; line-height: 1.6;">
        Prefere no celular? Baixe o app Android:
        <a href="https://play.google.com/store/apps/details?id=br.com.otutor.twa"
          style="color: #17375E; font-weight: 600;">Play Store — O Tutor</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso beta — O Tutor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px;">

          <!-- Logo discreta -->
          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid #E5E7EB;">
              <span style="font-size: 16px; font-weight: 700; color: #17375E; font-family: Arial, sans-serif;">
                O Tutor
              </span>
            </td>
          </tr>

          <!-- Corpo do email -->
          <tr>
            <td style="padding-top: 32px;">

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Olá, ${primeiroNome},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Obrigado por ter se cadastrado como beta tester do <strong>O Tutor</strong>. Seu acesso já está liberado — você pode começar a usar agora mesmo.
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                O Tutor é uma plataforma de preparação para concursos públicos com simulados adaptativos, tutor de dúvidas por IA disponível 24h, plano de estudo personalizado e análise detalhada de editais por cargo.
              </p>

              <p style="margin: 0 0 8px 0; font-size: 15px; color: #1F2937; line-height: 1.6;">
                Acesse pelo navegador:
                <a href="https://www.otutor.com.br/login"
                  style="color: #17375E; font-weight: 600;">www.otutor.com.br/login</a>
              </p>

              ${linhaPlayStore}

              <p style="margin: 16px 0 8px 0; font-size: 15px; color: #1F2937; line-height: 1.6;">
                Após explorar a plataforma, conte o que achou pelo formulário de feedback:
                <a href="https://www.otutor.com.br/feedback"
                  style="color: #17375E; font-weight: 600;">www.otutor.com.br/feedback</a>
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Quem fornecer o feedback mais completo recebe <strong>até 6 meses de plano premium grátis</strong>.
              </p>

              <!-- Divisor sutil -->
              <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 24px 0;" />

              <!-- Indicação -->
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Tem amigos estudando para concursos? Compartilhe seu link de indicação — cada pessoa que se cadastrar pelo seu link gera benefícios para vocês dois.
              </p>

              <p style="margin: 0 0 4px 0; font-size: 13px; color: #6B7280;">
                Seu código de indicação:
                <strong style="color: #17375E; font-family: monospace; letter-spacing: 1px;">${codigoIndicacao}</strong>
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #6B7280;">
                Seu link:
                <a href="${linkIndicacao}" style="color: #17375E;">${linkIndicacao}</a>
              </p>

              <!-- Divisor sutil -->
              <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 24px 0;" />

              <p style="margin: 0 0 8px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Acompanhe as novidades nas redes sociais:
              </p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #4B5563;">
                Instagram:
                <a href="https://www.instagram.com/o_tutor_app/" style="color: #17375E;">@o_tutor_app</a>
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #4B5563;">
                Facebook:
                <a href="https://www.facebook.com/profile.php?id=61572357286929" style="color: #17375E;">O Tutor no Facebook</a>
              </p>

              <p style="margin: 0 0 4px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Qualquer dúvida, responda este email.
              </p>

              <p style="margin: 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Bons estudos,<br />
                <strong>Itamar Backer</strong><br />
                <span style="font-size: 13px; color: #6B7280;">O Tutor — contato@otutor.com.br</span>
              </p>

            </td>
          </tr>

          <!-- Footer mínimo -->
          <tr>
            <td style="padding-top: 40px; border-top: 1px solid #E5E7EB; margin-top: 40px;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.6;">
                Você recebeu este email por ter se cadastrado como beta tester do O Tutor.<br />
                &copy; 2025 O Tutor &mdash;
                <a href="https://www.otutor.com.br" style="color: #9CA3AF;">otutor.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Envio ─────────────────────────────────────────────────────────────────────

async function buscarReferral(email: string): Promise<{ nome: string; referralCode: string | null }> {
  const { data } = await supabase
    .from('leads')
    .select('nome, referral_code')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (data) return { nome: data.nome ?? email, referralCode: data.referral_code ?? null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  return { nome: profile?.nome ?? email, referralCode: null };
}

async function enviarPara(emails: string[]) {
  let ok = 0, erro = 0;

  for (const email of emails) {
    const { nome, referralCode } = await buscarReferral(email);
    const comPlayStore = !SEM_PLAYSTORE.has(email.toLowerCase());
    const html = gerarHtml({ nome, referralCode, comPlayStore });

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECT,
        html,
      });
      console.log(`[OK]  ${email} (${comPlayStore ? 'com' : 'sem'} PlayStore)`);
      ok++;
    } catch (e) {
      console.error(`[ERR] ${email}:`, e);
      erro++;
    }

    // Pausa entre envios para não acionar rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nConcluído: ${ok} enviados, ${erro} erros.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const modo = process.argv.includes('--modo')
  ? process.argv[process.argv.indexOf('--modo') + 1]
  : 'aprovacao';

if (modo === 'producao') {
  console.log(`Enviando para ${PRODUCAO.length} destinatários (PRODUÇÃO)...\n`);
  enviarPara(PRODUCAO);
} else {
  console.log(`Enviando para ${APROVACAO.length} endereços de aprovação...\n`);
  enviarPara(APROVACAO);
}
