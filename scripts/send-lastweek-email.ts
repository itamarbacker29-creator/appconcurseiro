/**
 * Email de última semana de testes para beta testers.
 *
 * Uso:
 *   npx tsx scripts/send-lastweek-email.ts --modo aprovacao
 *   npx tsx scripts/send-lastweek-email.ts --modo producao
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const resend = new Resend(RESEND_API_KEY);

const FROM    = 'O Tutor <contato@otutor.com.br>';
const SUBJECT = 'Última semana de acesso Elite — não esqueça do feedback';

const TESTERS: { nome: string; email: string }[] = [
  { nome: 'Abner',      email: 'mocambitepereira2025@gmail.com' },
  { nome: 'Agnaldo',    email: 'agnaldomarttins@gmail.com' },
  { nome: 'Alessandra', email: 'tarapanoff.alessandra@gmail.com' },
  { nome: 'Alex',       email: 'alex.ribeiro01071985@gmail.com' },
  { nome: 'Alzenir',    email: 'alzenirp444@gmail.com' },
  { nome: 'Ana',        email: 'analuciadavo@hotmail.com' },
  { nome: 'Anderson',   email: 'apbdireito@yahoo.com.br' },
  { nome: 'Argel',      email: 'argel.maycon.g@gmail.com' },
  { nome: 'Augusta',    email: 'velhopereiraaugustaluzia@gmail.com' },
  { nome: 'Caroline',   email: 'carolbiologia93@gmail.com' },
  { nome: 'Catia',      email: 'catialuciaedilenethome@gmail.com' },
  { nome: 'Catia',      email: 'catiaanajulia.enzo@gmail.com' },
  { nome: 'Cição',      email: 'cicerotse@gmail.com' },
  { nome: 'Dalva',      email: 'dalvamoro63@gmail.com' },
  { nome: 'Dalva',      email: 'dalvamoro@outlook.com' },
  { nome: 'Daniela',    email: 'danyelafps@gmail.com' },
  { nome: 'Edmir',      email: 'etbpmce22@gmail.com' },
  { nome: 'Edson',      email: 'edsonpla22@gmail.com' },
  { nome: 'Erlania',    email: 'erlaniaf@gmail.com' },
  { nome: 'Eve',        email: 'adam.evelyn@yahoo.com.br' },
  { nome: 'Fernanda',   email: 'fc9421625@gmail.com' },
  { nome: 'Francine',   email: 'franjaekel@yahoo.com.br' },
  { nome: 'Hermeson',   email: 'hermesonalvez@gmail.com' },
  { nome: 'Irani',      email: 'iranilima651@gmail.com' },
  { nome: 'Ismael',     email: 'ismael.carmo1@gmail.com' },
  { nome: 'Jefferson',  email: 'jeffcarlim@yahoo.com.br' },
  { nome: 'José',       email: 'jazevedosalgado@gmail.com' },
  { nome: 'Josiney',    email: 'josineyja@gmail.com' },
  { nome: 'Juan',       email: 'uredaj@gmail.com' },
  { nome: 'Karla',      email: 'kfiock@outlook.com' },
  { nome: 'Karoline',   email: 'karolsinha28@hotmail.com' },
  { nome: 'Kelly',      email: 'susys9129@gmail.com' },
  { nome: 'Lidiane',    email: 'limoiano@gmail.com' },
  { nome: 'Lisiane',    email: 'lisycristina@hotmail.com' },
  { nome: 'Luis Carlos',email: 'lcrptc1974@gmail.com' },
  { nome: 'Luziene',    email: 'luzienevelozo202412@gmail.com' },
  { nome: 'Marcelo',    email: 'marcelo242780@gmail.com' },
  { nome: 'Marcia',     email: 'raicram14@gmail.com' },
  { nome: 'Marcia',     email: 'raicram1@hotmail.com' },
  { nome: 'Marcia',     email: 'marciagabriela1970@gmail.com' },
  { nome: 'Márcia',     email: 'marciagabrielasantana@gmail.com' },
  { nome: 'Marcos',     email: 'marcosrobertoappeldeoliveira@gmail.com' },
  { nome: 'Marli',      email: 'marlizanardini@gmail.com' },
  { nome: 'Nerivaldo',  email: 'nerivaldosantos2011@gmail.com' },
  { nome: 'Rachel',     email: 'rachelcpinheiro@yahoo.com.br' },
  { nome: 'Roberto',    email: 'churchsagui@yahoo.com' },
  { nome: 'Rogério',    email: 'rogeriorf0812@gmail.com' },
  { nome: 'Rogério',    email: 'rogeriofutema@gmail.com' },
  { nome: 'Silvany',    email: 'silvanymoreira68@gmail.com' },
  { nome: 'Simone',     email: 'ssdiasdafraga@gmail.com' },
  { nome: 'Sulamita',   email: 'sulamitadeoliveira420@gmail.com' },
  { nome: 'Sulamita',   email: 'susula01@hotmail.com' },
  { nome: 'Tereza',     email: 'terezaadv1957@gmail.com' },
  { nome: 'Thiago',     email: 'thiagosilva376@yahoo.com.br' },
  { nome: 'Vânia',      email: 'sjoseantoniof65@gmail.com' },
  { nome: 'Vanessa',    email: 'vanessa.clg22@gmail.com' },
];

const APROVACAO = [
  { nome: 'Itamar', email: 'itamar.backer29@gmail.com' },
  { nome: 'Teste',  email: 'eupeladeiroapp@gmail.com' },
];

function gerarHtml(nome: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Última semana de acesso Elite</title>
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

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Oi, <strong>${nome}</strong>!
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Esta é a <strong>última semana</strong> do seu acesso Elite ao O Tutor.
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Se ainda não explorou a plataforma, ainda dá tempo — entre agora e aproveite os simulados adaptativos, o tutor de IA e o plano de estudo personalizado:
              </p>

              <p style="margin: 0 0 24px 0;">
                <a href="https://www.otutor.com.br/login"
                  style="color: #17375E; font-weight: 700; font-size: 16px; text-decoration: none;">
                  👉 www.otutor.com.br/login
                </a>
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                E se já usou, sua opinião é muito importante para nós. Leva menos de 2 minutos:
              </p>

              <p style="margin: 0 0 32px 0;">
                <a href="https://www.otutor.com.br/feedback"
                  style="color: #17375E; font-weight: 700; font-size: 16px; text-decoration: none;">
                  📝 www.otutor.com.br/feedback
                </a>
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Qualquer dúvida, é só responder este email.
              </p>

              <p style="margin: 0; font-size: 15px; color: #1F2937; line-height: 1.7;">
                Equipe O Tutor<br />
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
}

async function enviarPara(lista: { nome: string; email: string }[]) {
  let ok = 0, erro = 0;

  for (const { nome, email } of lista) {
    try {
      await resend.emails.send({ from: FROM, to: email, subject: SUBJECT, html: gerarHtml(nome) });
      console.log(`[OK]  ${email} (${nome})`);
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
  console.log(`Enviando para ${TESTERS.length} destinatários (PRODUÇÃO)...\n`);
  enviarPara(TESTERS);
} else {
  console.log(`Enviando para ${APROVACAO.length} endereços de aprovação...\n`);
  enviarPara(APROVACAO);
}
