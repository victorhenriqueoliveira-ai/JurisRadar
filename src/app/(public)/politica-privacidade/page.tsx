import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = {
  title: 'Política de Privacidade — JurisRadar',
};

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPageLayout title="Política de Privacidade" updatedAt="23 de outubro de 2026">
      <p>
        Esta Política de Privacidade descreve como o JurisRadar coleta, usa, armazena e
        protege dados pessoais no contexto da Plataforma, em conformidade com a Lei nº
        13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD). Ao utilizar o Serviço,
        você concorda com as práticas descritas aqui.
      </p>

      <h2>1. Dados que coletamos</h2>
      <p>Coletamos as seguintes categorias de dados pessoais:</p>
      <ul>
        <li><strong>Dados de cadastro:</strong> nome, e-mail, senha (armazenada de forma criptografada), CPF e, quando informado, número e UF de inscrição na OAB;</li>
        <li><strong>Dados do escritório:</strong> razão social ou nome fantasia, CNPJ e área de atuação, quando fornecidos;</li>
        <li><strong>Dados de uso:</strong> registros de acesso, endereço IP, data e hora de ações realizadas na Plataforma, para fins de segurança e prevenção a fraudes (incluindo rate limiting de cadastro);</li>
        <li><strong>Dados inseridos por você:</strong> informações de processos, clientes, partes processuais, notas, documentos e comunicações registradas no curso do uso do CRM — dados esses de titularidade e responsabilidade do usuário/escritório, tratados pelo JurisRadar como operador, a seu pedido;</li>
        <li><strong>Dados de pagamento:</strong> processados por processadores de pagamento parceiros (gateway de cobrança); o JurisRadar não armazena números completos de cartão de crédito.</li>
      </ul>

      <h2>2. Para que usamos os dados</h2>
      <p>Utilizamos os dados pessoais coletados para:</p>
      <ul>
        <li>Criar e manter sua conta e a conta do escritório, e autenticar seu acesso;</li>
        <li>Fornecer as funcionalidades da Plataforma (CRM, calendário, notificações, financeiro);</li>
        <li>Enviar comunicações operacionais essenciais (alertas de prazo, confirmações, avisos de segurança);</li>
        <li>Processar cobranças e repasses financeiros referentes à assinatura e, quando aplicável, aos honorários geridos pelo escritório na Plataforma;</li>
        <li>Prevenir fraudes, abusos e uso automatizado indevido (ex.: limite de tentativas de cadastro por IP);</li>
        <li>Cumprir obrigações legais e regulatórias aplicáveis.</li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        O tratamento de dados pessoais pelo JurisRadar se baseia, conforme o caso, na
        execução de contrato (prestação do Serviço contratado), no cumprimento de obrigação
        legal, no legítimo interesse (segurança e prevenção a fraudes) e, quando aplicável, no
        consentimento do titular — como o aceite expresso a estes Termos e a esta Política no
        momento do cadastro.
      </p>

      <h2>4. Compartilhamento de dados</h2>
      <p>Podemos compartilhar dados pessoais com:</p>
      <ul>
        <li><strong>Provedores de infraestrutura e hospedagem</strong>, para operação técnica da Plataforma (banco de dados, e-mail transacional, armazenamento de arquivos);</li>
        <li><strong>Processadores de pagamento</strong>, para cobrança da assinatura e processamento de repasses financeiros do escritório;</li>
        <li><strong>Autoridades públicas</strong>, quando exigido por lei, ordem judicial ou para exercício regular de direitos.</li>
      </ul>
      <p>
        Não vendemos dados pessoais a terceiros para fins de publicidade.
      </p>

      <h2>5. Armazenamento e segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados
        pessoais contra acesso não autorizado, perda ou alteração indevida, incluindo
        criptografia de senhas, controle de acesso por organização (isolamento multi-tenant)
        e registro de autenticação. Nenhum sistema é absolutamente seguro; em caso de
        incidente de segurança relevante, comunicaremos os titulares afetados e a Autoridade
        Nacional de Proteção de Dados (ANPD), conforme exigido em lei.
      </p>

      <h2>6. Retenção dos dados</h2>
      <p>
        Mantemos os dados pessoais pelo tempo necessário ao cumprimento das finalidades
        descritas nesta Política, ao cumprimento de obrigações legais (como prazos fiscais e
        regulatórios) e à defesa de direitos em processos judiciais ou administrativos. Dados
        de processos e demais registros inseridos pelo escritório são mantidos enquanto a
        conta estiver ativa e podem ser excluídos mediante solicitação, observadas eventuais
        obrigações legais de retenção.
      </p>

      <h2>7. Seus direitos como titular</h2>
      <p>Nos termos da LGPD, você pode solicitar, a qualquer momento:</p>
      <ul>
        <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
        <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
        <li>Revogação do consentimento, quando essa for a base legal do tratamento;</li>
        <li>Informação sobre as entidades com as quais compartilhamos seus dados.</li>
      </ul>
      <p>
        Solicitações podem ser feitas pelo canal de suporte disponível dentro da Plataforma.
      </p>

      <h2>8. Dados de terceiros inseridos na Plataforma</h2>
      <p>
        Como parte da natureza do serviço, escritórios de advocacia podem registrar na
        Plataforma dados de partes processuais e outros terceiros relacionados aos casos
        acompanhados. Nesse cenário, o JurisRadar atua como <strong>operador</strong> dos dados,
        tratando-os conforme as instruções do escritório (controlador), que é responsável por
        possuir base legal adequada para o tratamento desses dados de terceiros, inclusive no
        que diz respeito a eventual sigilo processual aplicável.
      </p>

      <h2>9. Cookies e tecnologias similares</h2>
      <p>
        Utilizamos cookies essenciais para autenticação e funcionamento da sessão. Não
        utilizamos cookies de rastreamento publicitário de terceiros.
      </p>

      <h2>10. Alterações desta Política</h2>
      <p>
        Esta Política pode ser atualizada periodicamente. Mudanças relevantes serão
        comunicadas por e-mail ou aviso na Plataforma, com indicação da nova data de
        atualização no topo desta página.
      </p>

      <h2>11. Encarregado de Dados (DPO) e contato</h2>
      <p>
        Para exercer seus direitos como titular de dados ou esclarecer dúvidas sobre esta
        Política, utilize o canal de suporte disponível dentro da Plataforma.
      </p>
    </LegalPageLayout>
  );
}
