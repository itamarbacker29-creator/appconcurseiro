import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — O Tutor',
  description: 'Política de Privacidade da plataforma O Tutor, em conformidade com a LGPD.',
};

export default function PrivacidadePage() {
  return (
    <div className="max-w-[780px] mx-auto px-6 py-12">
      <h1 className="text-[28px] font-black text-[#0D1117] mb-2">Política de Privacidade</h1>
      <p className="text-[13px] text-[#6B7280] mb-10">Última atualização: 22 de abril de 2026</p>

      <Section title="1. Identificação do Controlador">
        <p>
          Esta Política de Privacidade descreve como a plataforma <strong>O Tutor</strong>{' '}
          (<strong>www.otutor.com.br</strong>) coleta, utiliza, armazena e protege os dados
          pessoais dos usuários, em conformidade com a{' '}
          <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong> e demais
          normas aplicáveis.
        </p>
        <p>
          <strong>Controlador de Dados:</strong> O Tutor<br />
          <strong>E-mail de contato:</strong>{' '}
          <a href="mailto:privacidade@otutor.com.br" className="text-[#5B7BF8] hover:underline">
            privacidade@otutor.com.br
          </a>
        </p>
      </Section>

      <Section title="2. Dados Pessoais Coletados">
        <p>Coletamos os seguintes dados pessoais:</p>
        <Subsection title="2.1 Dados fornecidos pelo usuário">
          <ul>
            <li><strong>Cadastro:</strong> nome, endereço de e-mail e senha (armazenada em hash);</li>
            <li><strong>Perfil:</strong> data prevista de concurso, matérias de interesse, nível de estudo;</li>
            <li><strong>Pagamento:</strong> dados de cobrança processados diretamente pelo Stripe (não armazenamos dados de cartão);</li>
            <li><strong>Conteúdo enviado:</strong> arquivos PDF de apostilas enviados pelo usuário para a plataforma.</li>
          </ul>
        </Subsection>
        <Subsection title="2.2 Dados coletados automaticamente">
          <ul>
            <li><strong>Desempenho:</strong> respostas a questões, tempo gasto, taxa de acerto, evolução por matéria;</li>
            <li><strong>Uso:</strong> páginas acessadas, funcionalidades utilizadas, data e hora de acesso;</li>
            <li><strong>Dispositivo:</strong> tipo de dispositivo, sistema operacional, navegador, endereço IP;</li>
            <li><strong>Cookies e armazenamento local:</strong> sessão, preferências de interface, estado do tour de onboarding.</li>
          </ul>
        </Subsection>
      </Section>

      <Section title="3. Finalidades do Tratamento">
        <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
        <ul>
          <li><strong>Prestação do serviço:</strong> criação e gerenciamento de conta, personalização de planos de estudo e simulados adaptativos;</li>
          <li><strong>Melhoria do produto:</strong> análise de desempenho agregado para aprimorar o algoritmo de aprendizagem;</li>
          <li><strong>Comunicação:</strong> envio de e-mails transacionais (confirmação de cadastro, recuperação de senha) e notificações sobre seu progresso;</li>
          <li><strong>Cobrança:</strong> processamento e gestão de assinaturas pagas;</li>
          <li><strong>Segurança:</strong> prevenção de fraudes e uso indevido da plataforma;</li>
          <li><strong>Cumprimento legal:</strong> atendimento a obrigações legais e regulatórias.</li>
        </ul>
      </Section>

      <Section title="4. Base Legal para o Tratamento">
        <p>O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais (Art. 7º e 11º da LGPD):</p>
        <ul>
          <li><strong>Execução de contrato:</strong> para a prestação dos serviços contratados;</li>
          <li><strong>Consentimento:</strong> para envio de comunicações de marketing (revogável a qualquer tempo);</li>
          <li><strong>Legítimo interesse:</strong> para análise de uso e melhoria do produto;</li>
          <li><strong>Cumprimento de obrigação legal:</strong> para atendimento a requisitos fiscais e regulatórios.</li>
        </ul>
      </Section>

      <Section title="5. Compartilhamento de Dados">
        <p>
          Não vendemos seus dados pessoais. Compartilhamos informações apenas com os seguintes
          parceiros, na medida necessária para a prestação do serviço:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> — infraestrutura de banco de dados e autenticação,
            com servidores localizados nos EUA (adequação ao nível de proteção exigido pela LGPD
            por meio de cláusulas contratuais padrão);
          </li>
          <li>
            <strong>Google LLC (Gemini AI)</strong> — geração de conteúdo educacional por
            inteligência artificial (os PDFs enviados são processados pela API do Google e não
            são retidos para treinamento de modelos);
          </li>
          <li>
            <strong>Anthropic PBC</strong> — processamento de análises de conteúdo por
            inteligência artificial (dados não são retidos para treinamento);
          </li>
          <li>
            <strong>Stripe Inc.</strong> — processamento de pagamentos (dados de cartão nunca
            transitam por nossos servidores);
          </li>
          <li>
            <strong>Vercel Inc.</strong> — hospedagem da plataforma web;
          </li>
          <li>
            <strong>Autoridades públicas:</strong> quando exigido por lei, ordem judicial ou
            requisição de autoridade competente.
          </li>
        </ul>
      </Section>

      <Section title="6. Transferência Internacional de Dados">
        <p>
          Alguns de nossos parceiros estão localizados fora do Brasil. Realizamos transferências
          internacionais de dados apenas para países que garantam nível adequado de proteção ou
          mediante mecanismos contratuais aprovados pela ANPD (cláusulas-padrão), conforme
          exigido pelo Art. 33 da LGPD.
        </p>
      </Section>

      <Section title="7. Retenção de Dados">
        <p>
          Mantemos seus dados pessoais pelo tempo necessário para a prestação do serviço e
          cumprimento de obrigações legais:
        </p>
        <ul>
          <li><strong>Dados de conta ativa:</strong> enquanto a conta existir;</li>
          <li><strong>Dados após exclusão da conta:</strong> até 90 dias (backups automáticos), salvo obrigação legal de retenção maior;</li>
          <li><strong>Registros de acesso (Marco Civil):</strong> 6 meses, conforme exigência legal;</li>
          <li><strong>Dados fiscais e financeiros:</strong> 5 anos, conforme legislação tributária.</li>
        </ul>
      </Section>

      <Section title="8. Segurança dos Dados">
        <p>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
        <ul>
          <li>Transmissão de dados via HTTPS/TLS;</li>
          <li>Senhas armazenadas exclusivamente em formato hash (bcrypt);</li>
          <li>Controle de acesso baseado em perfis (Row Level Security no banco de dados);</li>
          <li>Monitoramento de atividades suspeitas;</li>
          <li>Armazenamento de arquivos em bucket privado com URLs assinadas por tempo limitado.</li>
        </ul>
        <p>
          Em caso de incidente de segurança que possa gerar risco relevante aos titulares,
          notificaremos a ANPD e os usuários afetados no prazo previsto pela LGPD.
        </p>
      </Section>

      <Section title="9. Seus Direitos como Titular (LGPD)">
        <p>
          Nos termos dos Arts. 17 a 22 da LGPD, você tem os seguintes direitos em relação aos
          seus dados pessoais:
        </p>
        <ul>
          <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia;</li>
          <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade;</li>
          <li><strong>Portabilidade:</strong> exportar seus dados em formato estruturado;</li>
          <li><strong>Eliminação:</strong> excluir dados tratados com base no consentimento;</li>
          <li><strong>Revogação do consentimento:</strong> retirar consentimento a qualquer momento;</li>
          <li><strong>Oposição:</strong> opor-se ao tratamento realizado com base em legítimo interesse;</li>
          <li><strong>Informação:</strong> ser informado sobre o compartilhamento dos seus dados.</li>
        </ul>
        <p>
          Para exercer qualquer desses direitos, entre em contato pelo e-mail{' '}
          <a href="mailto:privacidade@otutor.com.br" className="text-[#5B7BF8] hover:underline">
            privacidade@otutor.com.br
          </a>
          . Responderemos em até 15 dias úteis.
        </p>
      </Section>

      <Section title="10. Cookies e Tecnologias de Rastreamento">
        <p>Utilizamos os seguintes tipos de cookies e armazenamento local:</p>
        <ul>
          <li>
            <strong>Estritamente necessários:</strong> sessão de autenticação, preferências de
            segurança — não podem ser desativados;
          </li>
          <li>
            <strong>Funcionais:</strong> preferências de interface (tema, estado do tour) —
            armazenados localmente no dispositivo;
          </li>
          <li>
            <strong>Analíticos:</strong> dados de uso agregados para melhoria do produto;
          </li>
          <li>
            <strong>Marketing (opcional):</strong> Meta Pixel para campanhas publicitárias,
            ativado apenas com seu consentimento.
          </li>
        </ul>
      </Section>

      <Section title="11. Crianças e Adolescentes">
        <p>
          O Tutor não é direcionado a crianças menores de 13 anos. Para usuários entre 13 e 18
          anos, o cadastro requer autorização dos responsáveis legais. Caso identifiquemos coleta
          inadvertida de dados de menores sem autorização, procederemos à exclusão imediata.
        </p>
      </Section>

      <Section title="12. Alterações nesta Política">
        <p>
          Esta Política pode ser atualizada periodicamente. Notificaremos usuários ativos sobre
          alterações relevantes por e-mail ou aviso na plataforma. A continuidade do uso após
          a publicação de alterações constitui aceitação das novas condições.
        </p>
      </Section>

      <Section title="13. Contato e Encarregado de Dados (DPO)">
        <p>
          Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais:
        </p>
        <p>
          <strong>E-mail:</strong>{' '}
          <a href="mailto:privacidade@otutor.com.br" className="text-[#5B7BF8] hover:underline">
            privacidade@otutor.com.br
          </a>
          <br />
          <strong>Site:</strong> www.otutor.com.br/privacidade
        </p>
        <p>
          Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados
          (ANPD) pelo site{' '}
          <span className="text-[#374151]">www.gov.br/anpd</span>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[16px] font-bold text-[#0D1117] mb-3">{title}</h2>
      <div className="flex flex-col gap-3 text-[14px] text-[#374151] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-[#0D1117] mb-1.5">{title}</p>
      {children}
    </div>
  );
}
