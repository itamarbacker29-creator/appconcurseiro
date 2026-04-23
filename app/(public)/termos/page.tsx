import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — O Tutor',
  description: 'Termos de Uso da plataforma O Tutor para preparação de concursos públicos.',
};

export default function TermosPage() {
  return (
    <div className="max-w-[780px] mx-auto px-6 py-12">
      <h1 className="text-[28px] font-black text-[#0D1117] mb-2">Termos de Uso</h1>
      <p className="text-[13px] text-[#6B7280] mb-10">Última atualização: 22 de abril de 2026</p>

      <Section title="1. Aceitação dos Termos">
        <p>
          Ao acessar ou utilizar a plataforma <strong>O Tutor</strong> — disponível em{' '}
          <strong>www.otutor.com.br</strong> e nos aplicativos móveis — você declara ter lido,
          compreendido e concordado integralmente com estes Termos de Uso, bem como com a nossa
          Política de Privacidade.
        </p>
        <p>
          Se você não concordar com qualquer parte destes termos, não utilize a plataforma.
          O uso continuado após alterações publicadas constitui aceitação das novas condições.
        </p>
      </Section>

      <Section title="2. Descrição do Serviço">
        <p>
          O Tutor é uma plataforma de preparação para concursos públicos brasileiros que oferece:
        </p>
        <ul>
          <li>Simulados adaptativos com banco de questões reais e geradas por inteligência artificial;</li>
          <li>Planos de estudo personalizados com base em editais e desempenho do usuário;</li>
          <li>Flashcards de revisão, incluindo geração automática a partir de apostilas em PDF;</li>
          <li>Análise de desempenho e acompanhamento de evolução por matéria;</li>
          <li>Leitor de apostilas com integração de IA para criação de conteúdo de estudo.</li>
        </ul>
        <p>
          O serviço é oferecido nos planos <strong>Free</strong>, <strong>Premium</strong> e{' '}
          <strong>Elite</strong>, com funcionalidades distintas conforme descrito na página de preços.
        </p>
      </Section>

      <Section title="3. Cadastro e Conta">
        <p>
          Para utilizar a plataforma, você deve criar uma conta fornecendo informações verdadeiras,
          precisas e atualizadas. É de sua responsabilidade:
        </p>
        <ul>
          <li>Manter a confidencialidade de suas credenciais de acesso;</li>
          <li>Notificar imediatamente qualquer uso não autorizado da sua conta;</li>
          <li>Garantir que você possui 16 anos ou mais, ou autorização dos responsáveis legais;</li>
          <li>Não compartilhar sua conta com terceiros.</li>
        </ul>
        <p>
          Reservamo-nos o direito de encerrar contas que violem estes termos, sem aviso prévio.
        </p>
      </Section>

      <Section title="4. Planos, Pagamentos e Cancelamento">
        <p>
          Os planos pagos (Premium e Elite) são cobrados de forma recorrente (mensal ou anual),
          processados por meio do <strong>Stripe</strong>, plataforma segura de pagamentos.
        </p>
        <ul>
          <li>
            <strong>Renovação automática:</strong> As assinaturas são renovadas automaticamente ao
            final de cada período, salvo cancelamento pelo usuário.
          </li>
          <li>
            <strong>Cancelamento:</strong> Pode ser realizado a qualquer momento pela área de conta.
            O acesso às funcionalidades pagas permanece ativo até o fim do período vigente.
          </li>
          <li>
            <strong>Reembolso:</strong> Oferecemos reembolso integral nos primeiros 7 (sete) dias
            após a contratação, conforme o Código de Defesa do Consumidor (Art. 49, Lei 8.078/1990).
          </li>
          <li>
            <strong>Alteração de preços:</strong> Eventuais reajustes serão comunicados com
            antecedência mínima de 30 dias.
          </li>
        </ul>
      </Section>

      <Section title="5. Uso Aceitável">
        <p>Ao utilizar O Tutor, você concorda em não:</p>
        <ul>
          <li>Copiar, redistribuir ou revender o conteúdo da plataforma sem autorização;</li>
          <li>Utilizar mecanismos automatizados (bots, scrapers) para acessar o serviço;</li>
          <li>Tentar obter acesso não autorizado a sistemas ou dados de outros usuários;</li>
          <li>Publicar ou transmitir conteúdo ofensivo, ilegal ou que viole direitos de terceiros;</li>
          <li>Usar a plataforma para qualquer finalidade ilegal ou não autorizada;</li>
          <li>Interferir na integridade ou no desempenho do serviço.</li>
        </ul>
      </Section>

      <Section title="6. Propriedade Intelectual">
        <p>
          Todo o conteúdo da plataforma — incluindo textos, design, logotipos, software, banco de
          questões gerado por IA e materiais de estudo — é de propriedade exclusiva de O Tutor ou
          de seus licenciantes e está protegido pela legislação brasileira de propriedade intelectual
          (Lei 9.610/1998).
        </p>
        <p>
          As questões extraídas de provas oficiais são de domínio público, de acordo com a
          legislação aplicável, e sua reprodução na plataforma tem finalidade exclusivamente
          educacional.
        </p>
        <p>
          É concedida ao usuário uma licença limitada, pessoal, intransferível e não exclusiva
          para uso da plataforma exclusivamente para fins de estudo pessoal.
        </p>
      </Section>

      <Section title="7. Conteúdo Gerado por Inteligência Artificial">
        <p>
          Parte do conteúdo disponibilizado — incluindo questões, flashcards e planos de estudo —
          é gerado por modelos de inteligência artificial. Embora nos esforcemos para garantir
          qualidade e precisão, este conteúdo pode conter erros.
        </p>
        <p>
          O Tutor não garante a exatidão absoluta do conteúdo gerado por IA e recomenda que o
          usuário consulte sempre as fontes oficiais (legislação, doutrina, editais) para confirmação.
        </p>
      </Section>

      <Section title="8. Limitação de Responsabilidade">
        <p>
          O Tutor é disponibilizado &quot;no estado em que se encontra&quot;, sem garantias de
          disponibilidade ininterrupta. Não nos responsabilizamos por:
        </p>
        <ul>
          <li>Danos decorrentes de interrupções temporárias do serviço;</li>
          <li>Resultados obtidos pelo usuário em concursos públicos;</li>
          <li>Perdas de dados causadas por fatores fora de nosso controle;</li>
          <li>Conteúdo de terceiros acessado por links externos à plataforma.</li>
        </ul>
        <p>
          Nossa responsabilidade total, em qualquer hipótese, fica limitada ao valor pago pelo
          usuário nos últimos 3 (três) meses de assinatura.
        </p>
      </Section>

      <Section title="9. Modificações do Serviço">
        <p>
          Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer funcionalidade
          da plataforma a qualquer momento. Em caso de descontinuação de plano pago, reembolsaremos
          o valor proporcional ao período não utilizado.
        </p>
      </Section>

      <Section title="10. Lei Aplicável e Foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo a Lei
          Geral de Proteção de Dados (Lei 13.709/2018) e o Marco Civil da Internet
          (Lei 12.965/2014). Fica eleito o foro da comarca de <strong>São Paulo/SP</strong> para
          dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado
          que seja.
        </p>
      </Section>

      <Section title="11. Contato">
        <p>
          Em caso de dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail:{' '}
          <a href="mailto:contato@otutor.com.br" className="text-[#5B7BF8] hover:underline">
            contato@otutor.com.br
          </a>
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
