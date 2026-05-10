/**
 * Email de acompanhamento para os 57 beta testers.
 *
 * Uso:
 *   npx tsx scripts/send-followup-email.ts --modo aprovacao
 *   npx tsx scripts/send-followup-email.ts --modo producao
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const resend = new Resend(RESEND_API_KEY);

const FROM    = 'O Tutor <contato@otutor.com.br>';
const SUBJECT = 'Os feedbacks estão ótimos — aproveite suas 2 semanas';

const APROVACAO = [
  'itamar.backer29@gmail.com',
  'vanessa.clg22@gmail.com',
  'eupeladeiroapp@gmail.com',
];

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
  'uredaj@gmail.com',
  'analuciadavo@hotmail.com',
  'churchsagui@yahoo.com',
  'dalvamoro@outlook.com',
  'franjaekel@yahoo.com.br',
  'susula01@hotmail.com',
  'thiagosilva376@yahoo.com.br',
];

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Os feedbacks estão ótimos</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px;">

          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid #E5E7EB;">
              <span style="font-size: 16px; font-weight: 700; color: #17375E; font-family: Arial, sans-serif;">
                O Tutor
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 32px;">

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Olá,
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Os feedbacks que estamos recebendo estão sendo <strong>muito bons</strong> — obrigado a todos que já acessaram e compartilharam suas impressões. Isso está ajudando a deixar a plataforma cada vez melhor.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Aproveite as duas semanas de acesso <strong>Elite</strong> para explorar tudo: simulados adaptativos, tutor de IA, plano de estudo e análise de editais. Qualquer sugestão ou crítica é muito bem-vinda.
              </p>

              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #17375E; line-height: 1.6;">
                Formas de acessar:
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6;">
                    <span style="font-size: 13px; color: #6B7280; font-family: Arial, sans-serif;">Navegador (web e iPhone)</span><br />
                    <a href="https://www.otutor.com.br/login"
                      style="font-size: 15px; color: #17375E; font-weight: 600; text-decoration: none;">
                      www.otutor.com.br/login
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <span style="font-size: 13px; color: #6B7280; font-family: Arial, sans-serif;">App Android (Play Store)</span><br />
                    <a href="https://play.google.com/store/apps/details?id=br.com.otutor.twa"
                      style="font-size: 15px; color: #17375E; font-weight: 600; text-decoration: none;">
                      Play Store — O Tutor
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Qualquer dúvida ou feedback, é só responder este email.
              </p>

              <p style="margin: 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Bons estudos,<br />
                <strong>O Tutor</strong><br />
                <span style="font-size: 13px; color: #6B7280;">contato@otutor.com.br</span>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top: 40px; border-top: 1px solid #E5E7EB; margin-top: 40px;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.6;">
                Você recebeu este email por fazer parte do grupo de beta testers do O Tutor.<br />
                &copy; 2026 O Tutor &mdash;
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

async function enviarPara(emails: string[]) {
  let ok = 0, erro = 0;

  for (const email of emails) {
    try {
      await resend.emails.send({ from: FROM, to: email, subject: SUBJECT, html: HTML });
      console.log(`[OK]  ${email}`);
      ok++;
    } catch (e) {
      console.error(`[ERR] ${email}:`, e);
      erro++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nConcluído: ${ok} enviados, ${erro} erros.`);
}

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
