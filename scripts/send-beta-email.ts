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

const resend    = new Resend(RESEND_API_KEY);
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);

const FROM = 'O Tutor <contato@otutor.com.br>';
const SUBJECT = '🎓 Você foi convidado para testar o O Tutor — acesso exclusivo beta';

// ── Listas de destinatários ───────────────────────────────────────────────────

/** Endereços de aprovação — envia primeiro para o Itamar revisar */
const APROVACAO = [
  'itamar.backer29@gmail.com',
  'vanessa.clg22@gmail.com',
  'eupeladeiroapp@gmail.com',
];

/** Usuários que NÃO têm conta Google → sem link da Play Store */
const SEM_PLAYSTORE = new Set([
  'analuciadavo@hotmail.com',
  'churchsagui@yahoo.com',
  'dalvamoro@outlook.com',
  'franjaekel@yahoo.com.br',
  'susula01@hotmail.com',
  'thiagosilva376@yahoo.com.br',
]);

/** Lista completa de produção */
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
  const linkIndicacao = referralCode ? `https://otutor.com.br?ref=${referralCode}` : 'https://otutor.com.br';
  const codigoIndicacao = referralCode ?? '—';

  const blocoPlayStore = comPlayStore ? `
    <tr>
      <td style="padding: 0 0 12px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="40" valign="top" style="padding-top: 3px;">
              <span style="font-size: 22px;">📱</span>
            </td>
            <td valign="top">
              <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #17375E;">Via Android (Play Store)</p>
              <p style="margin: 0; font-size: 13px; color: #4B5563;">
                <a href="https://bit.ly/4cPVVck" style="color: #17375E; font-weight: 600;">Clique aqui para baixar o app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite Beta — O Tutor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1DA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">

  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F4F1DA;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Card principal -->
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #17375E; padding: 28px 32px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="https://otutor.com.br/logo.png" alt="O Tutor" width="48" height="48"
                      style="display: inline-block; vertical-align: middle; border-radius: 10px;" />
                    <span style="display: inline-block; vertical-align: middle; margin-left: 12px;
                      font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">
                      O Tutor
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.6); letter-spacing: 1px; text-transform: uppercase;">
                      Acesso Exclusivo Beta
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Destaque laranja -->
          <tr>
            <td style="background-color: #F97316; padding: 14px 32px; text-align: center;">
              <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.3px;">
                🎓 Você faz parte do grupo seleto de beta testers do O Tutor!
              </p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 36px 32px;">

              <!-- Saudação -->
              <p style="margin: 0 0 20px 0; font-size: 20px; font-weight: 800; color: #17375E;">
                Olá, ${primeiroNome}! 👋
              </p>

              <!-- Agradecimento -->
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.7;">
                Muito obrigado por aceitar participar dos testes do <strong>O Tutor</strong>! Sua participação é fundamental para construirmos a melhor plataforma de preparação para concursos públicos do Brasil.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.7;">
                O O Tutor foi desenvolvido <strong>por e para concurseiros</strong> — com simulados adaptativos, plano de estudos por IA, tutor de dúvidas disponível 24h e análise personalizada de editais. Cada feedback que você nos enviar será lido e usado diretamente para aprimorar a plataforma.
              </p>

              <!-- Divisor -->
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 0 0 24px 0;" />

              <!-- Seu link de indicação -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background-color: #F0F4FF; border-radius: 12px; border: 1px solid #C7D2FE; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1px; text-transform: uppercase;">
                      Seu link de indicação exclusivo
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #4B5563; line-height: 1.5;">
                      Compartilhe com amigos que também estão estudando para concursos. Cada pessoa que se cadastrar pelo seu link garante benefícios para você e para eles.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #EEF2FF; border-radius: 8px; padding: 8px 16px; border: 1px dashed #A5B4FC;">
                          <span style="font-size: 13px; font-weight: 700; color: #4338CA; font-family: monospace; letter-spacing: 1px;">
                            Código: ${codigoIndicacao}
                          </span>
                        </td>
                        <td style="padding-left: 12px;">
                          <a href="${linkIndicacao}"
                            style="display: inline-block; background-color: #4338CA; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">
                            Copiar link →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Como testar -->
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #17375E;">
                Como testar o O Tutor:
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Web -->
                <tr>
                  <td style="padding: 0 0 12px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="40" valign="top" style="padding-top: 3px;">
                          <span style="font-size: 22px;">🌐</span>
                        </td>
                        <td valign="top">
                          <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #17375E;">Via navegador (Web)</p>
                          <p style="margin: 0; font-size: 13px; color: #4B5563;">
                            <a href="https://bit.ly/3QxTnIo" style="color: #17375E; font-weight: 600;">Clique aqui para acessar a plataforma</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${blocoPlayStore}

              </table>

              <!-- CTA principal -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="https://bit.ly/3QxTnIo"
                      style="display: inline-block; background-color: #17375E; color: #FFFFFF; font-size: 15px; font-weight: 800; padding: 14px 36px; border-radius: 10px; text-decoration: none; letter-spacing: 0.3px;">
                      Começar a testar agora →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divisor -->
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 0 0 24px 0;" />

              <!-- Feedback -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background-color: #FFF7ED; border-radius: 12px; border: 1px solid #FED7AA; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #C2410C;">
                      📝 Compartilhe sua opinião
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #4B5563; line-height: 1.6;">
                      Após explorar a plataforma, conte o que achou. Seu feedback é o combustível que impulsiona a nossa evolução — e <strong>quem fornecer o feedback mais completo recebe até 6 meses de plano premium grátis</strong>.
                    </p>
                    <a href="https://bit.ly/4d87FYP"
                      style="display: inline-block; background-color: #F97316; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                      Enviar feedback →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Redes sociais -->
              <p style="margin: 0 0 14px 0; font-size: 14px; color: #6B7280; text-align: center;">
                Acompanhe as novidades do O Tutor nas redes sociais:
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://bit.ly/49b32uy"
                      style="display: inline-block; background-color: #17375E; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px; text-decoration: none; margin-right: 8px;">
                      📸 Instagram
                    </a>
                    <a href="https://bit.ly/4cPgrcX"
                      style="display: inline-block; background-color: #1877F2; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px; text-decoration: none;">
                      👍 Facebook
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #9CA3AF;">
                Você recebeu este email por fazer parte do programa beta do <strong>O Tutor</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                © 2025 O Tutor — <a href="https://otutor.com.br" style="color: #6B7280;">otutor.com.br</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card principal -->

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

  // Tenta na tabela profiles caso o usuário já tenha criado conta
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
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nConcluído: ${ok} enviados, ${erro} erros.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const modo = process.argv.includes('--modo') ? process.argv[process.argv.indexOf('--modo') + 1] : 'aprovacao';

if (modo === 'producao') {
  console.log(`Enviando para ${PRODUCAO.length} destinatários (PRODUÇÃO)...\n`);
  enviarPara(PRODUCAO);
} else {
  console.log(`Enviando para ${APROVACAO.length} endereços de aprovação...\n`);
  enviarPara(APROVACAO);
}
