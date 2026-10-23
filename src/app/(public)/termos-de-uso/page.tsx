import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = {
  title: 'Termos de Uso — JurisRadar',
};

export default function TermosDeUsoPage() {
  return (
    <LegalPageLayout title="Termos de Uso" updatedAt="23 de outubro de 2026">
      <p>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma JurisRadar
        (&quot;Plataforma&quot;, &quot;Serviço&quot;), um software como serviço (SaaS) voltado à gestão de
        processos jurídicos, monitoramento de publicações e diários oficiais, e organização
        da rotina de escritórios de advocacia. Ao criar uma conta ou utilizar o Serviço, você
        concorda integralmente com estes Termos e com a nossa{' '}
        <a href="/politica-privacidade">Política de Privacidade</a>.
      </p>

      <h2>1. Quem pode usar o JurisRadar</h2>
      <p>
        O Serviço é destinado a advogados, estagiários e demais profissionais vinculados a
        escritórios de advocacia, para uso profissional. Ao se cadastrar, você declara ter
        capacidade civil plena e fornecer informações verdadeiras, completas e atualizadas,
        incluindo nome, CPF e, quando aplicável, número de inscrição na OAB.
      </p>

      <h2>2. Conta e responsabilidade pelo acesso</h2>
      <p>
        Você é responsável por manter a confidencialidade da senha da sua conta e por todas as
        atividades realizadas sob seu login. Comunique-nos imediatamente em caso de uso não
        autorizado ou suspeita de violação de segurança. Cada escritório (organização) pode
        convidar membros adicionais, atribuindo papéis (sócio, associado, estagiário) com
        níveis de permissão distintos dentro da Plataforma.
      </p>

      <h2>3. Descrição do Serviço</h2>
      <p>O JurisRadar oferece, entre outras funcionalidades:</p>
      <ul>
        <li>Monitoramento de publicações em diários oficiais e sistemas públicos (DJEN, DataJud/CNJ, PJe, DJe) a partir de fontes oficiais de acesso público;</li>
        <li>CRM de processos, com histórico de movimentações, notas e anexos;</li>
        <li>Calendário de prazos e audiências, com alertas automáticos;</li>
        <li>Gestão financeira de honorários, cobranças e repasses;</li>
        <li>Ferramentas de organização interna (tarefas, quadro Kanban).</li>
      </ul>
      <p>
        O JurisRadar não presta serviços de advocacia, não emite pareceres jurídicos e não
        substitui o acompanhamento processual feito pelo profissional habilitado. As
        informações exibidas na Plataforma têm caráter informativo e são obtidas de fontes
        públicas de terceiros (tribunais e órgãos oficiais) — o usuário é responsável por
        confirmar prazos e movimentações diretamente nos sistemas oficiais antes de tomar
        qualquer decisão processual.
      </p>

      <h2>4. Assinatura, período de teste e pagamento</h2>
      <p>
        O acesso à Plataforma é oferecido mediante assinatura paga, com período de teste
        gratuito inicial conforme indicado no momento do cadastro. Após o período de teste,
        a cobrança será realizada automaticamente de acordo com o plano escolhido, até que a
        assinatura seja cancelada. Valores, formas de pagamento e condições de cancelamento
        são informados na tela de assinatura e podem ser alterados mediante aviso prévio.
      </p>

      <h2>5. Dados de terceiros e sigilo processual</h2>
      <p>
        No curso do uso da Plataforma, você poderá inserir ou visualizar dados de terceiros
        (partes processuais, clientes, testemunhas) necessários à condução dos processos sob
        sua responsabilidade. Você declara possuir base legal e legitimidade para o tratamento
        desses dados (nos termos da Lei nº 13.709/2018 — LGPD) e se compromete a respeitar o
        sigilo profissional e eventuais segredos de justiça aplicáveis aos processos
        acompanhados, não utilizando a Plataforma para fins alheios à sua atividade
        profissional.
      </p>

      <h2>6. Uso aceitável</h2>
      <p>Ao usar o JurisRadar, você concorda em não:</p>
      <ul>
        <li>Utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
        <li>Tentar acessar dados de outras organizações sem autorização;</li>
        <li>Automatizar o cadastro de contas ou burlar limites técnicos de uso (rate limiting, autenticação);</li>
        <li>Realizar engenharia reversa, copiar ou redistribuir o software da Plataforma;</li>
        <li>Sobrecarregar deliberadamente a infraestrutura do Serviço.</li>
      </ul>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O software, marca, layout e demais elementos da Plataforma são de titularidade do
        JurisRadar e protegidos por legislação de propriedade intelectual. Os dados que você
        insere na Plataforma (processos, notas, documentos) permanecem de sua titularidade;
        concedemos a você uma licença de uso não exclusiva do Serviço, pelo período em que a
        assinatura estiver ativa.
      </p>

      <h2>8. Disponibilidade e limitação de responsabilidade</h2>
      <p>
        Envidamos esforços razoáveis para manter o Serviço disponível e os dados de
        monitoramento atualizados, mas não garantimos disponibilidade ininterrupta, nem a
        exatidão absoluta de dados obtidos de fontes públicas de terceiros (tribunais,
        diários oficiais), que podem apresentar instabilidade ou atraso fora do nosso
        controle. Na máxima extensão permitida por lei, o JurisRadar não se responsabiliza por
        perda de prazo processual ou qualquer dano decorrente do uso ou da indisponibilidade
        do Serviço, cabendo ao profissional de direito a conferência das informações nos
        sistemas oficiais.
      </p>

      <h2>9. Cancelamento e suspensão</h2>
      <p>
        Você pode cancelar sua assinatura a qualquer momento pela própria Plataforma.
        Podemos suspender ou encerrar contas que violem estes Termos, mediante notificação,
        exceto em casos de violação grave ou risco à segurança, quando a suspensão poderá ser
        imediata.
      </p>

      <h2>10. Alterações destes Termos</h2>
      <p>
        Podemos atualizar estes Termos periodicamente para refletir mudanças no Serviço ou na
        legislação aplicável. Alterações relevantes serão comunicadas por e-mail ou aviso na
        Plataforma, e o uso continuado do Serviço após a vigência da nova versão implica
        concordância com os termos atualizados.
      </p>

      <h2>11. Legislação aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
        foro do domicílio do usuário para dirimir eventuais controvérsias, salvo disposição
        legal em contrário.
      </p>

      <h2>12. Contato</h2>
      <p>
        Dúvidas sobre estes Termos podem ser enviadas para o canal de suporte disponível
        dentro da Plataforma.
      </p>
    </LegalPageLayout>
  );
}
