<task>
JurisRadar SaaS — Plataforma de CRM e Monitoramento de Processos para Advogados
</task>

<goal>
Transformar o JurisRadar numa plataforma SaaS multi-tenant voltada a advogados e escritórios de advocacia. O produto permite que cada advogado vincule seus processos via CPF + OAB, acompanhe movimentações em tempo real, receba notificações de intimações e eventos importantes, gerencie seu portfólio de causas num CRM dedicado e visualize indicadores estratégicos num dashboard analítico completo — tudo com calendário processual integrado e busca avançada de novos processos para captar clientes.

A proposta de valor central é ser o único lugar onde o advogado precisa estar: monitoramento passivo (notificações automáticas), gestão ativa (CRM + calendário) e prospecção (buscas DataJud/DJe/PJe). O produto é cobrado em plano único — R$127/mês no plano anual ou R$157/mês no plano mensal — com suporte a escritórios multi-usuário com controle de papéis.
</goal>

<requirements>
Negocio:

- Cadastro individual de advogado com CPF, número da OAB e dados do escritório; autenticação segura por e-mail + senha com suporte a 2FA.
- Modelo de conta escritório (multi-usuário): um escritório pode ter vários advogados, com papéis distintos (sócio, associado, estagiário) e controle de acesso por papel.
- Vínculo automático de processos via CPF + número da OAB: ao cadastrar ou sincronizar, o sistema busca todos os processos nos quais o advogado consta como representante nas fontes disponíveis (DataJud, PJe, DJe).
- Aba CRM: exibe todos os processos monitorados pelo advogado (e pelo escritório, conforme papel), com status, última movimentação, próximo prazo e indicadores de urgência.
- Monitoramento em tempo real via comunica.pje.jus.br: abordagem técnica a mapear conforme o que a API expõe (polling periódico, webhook ou autenticação delegada com credenciais do tribunal do advogado).
- Notificações automáticas por e-mail e in-app sempre que houver nova intimação, declaração, movimentação relevante ou prazo se aproximando em qualquer processo monitorado.
- Calendário processual completo: exibe prazos processuais calculados, audiências e eventos de todos os processos monitorados; envia alertas antes do vencimento.
- Dashboard analítico com pelo menos: total de casos por status (pendente, em instrução, em reta final, arquivado), prazos críticos dos próximos 7 e 30 dias, últimas intimações recebidas, distribuição de processos por área do direito, evolução mensal do volume de processos e indicador de casos com urgência alta.
- Busca avançada de processos (herdada do JurisRadar): por nome da parte, número CNJ, OAB, tribunal, tipo de processo e outros filtros — para o advogado prospectar novas causas ou localizar processos de interesse.
- Histórico individual por advogado: todas as buscas, notificações e atividades ficam registradas e acessíveis por usuário.
- Plano único no lançamento: anual (R$127/mês, cobrado R$1.524/ano) ou mensal (R$157/mês); evolução para múltiplos planos em versão futura.
- Plataforma totalmente responsiva: experiência equivalente em desktop, tablet e mobile.

Arquitetura:

- Multi-tenancy: isolamento completo de dados por escritório; cada advogado enxerga apenas os dados do seu escritório (conforme papel).
- Autenticação e autorização: sistema próprio com JWT + refresh token; papéis (sócio, associado, estagiário) com permissões granulares.
- Módulo de monitoramento: serviço de background (worker/job) responsável por consultar comunica.pje.jus.br e outras fontes periodicamente para cada advogado ativo; detectar novos eventos e disparar notificações.
- Integração com comunica.pje.jus.br: mapear no PRD quais endpoints e mecanismos de autenticação a API disponibiliza antes de definir a abordagem final (polling, webhook ou credencial delegada).
- Serviço de notificações: fila de eventos → envio de e-mail transacional (ex.: Resend/SendGrid) + persistência de notificações in-app com leitura/não-lida.
- Calendário processual: motor de cálculo de prazos baseado no CPC e normas dos tribunais; sincronização com Google Calendar e/ou iCal como diferencial opcional.
- Billing/assinatura: integração com gateway de pagamento (ex.: Stripe ou Pagar.me) para gestão de planos, cobranças recorrentes e cancelamentos.
- Aproveitar as integrações de busca já existentes no JurisRadar (DataJud, DJe TJSP) como base para o módulo de busca avançada.

UI/UX:

- Sidebar de navegação fixa com acesso rápido a: Dashboard, CRM, Busca, Calendário, Notificações, Configurações do escritório.
- Dashboard: cards de métricas no topo (casos totais, urgentes, prazos próximos, intimações não lidas), gráficos de distribuição por status e área do direito, timeline das últimas movimentações e lista de prazos críticos.
- Aba CRM: tabela/kanban de processos com colunas configuráveis (número CNJ, partes, tribunal, status, último evento, próximo prazo, responsável no escritório); filtros e ordenação; abertura de processo em painel lateral com histórico completo de movimentações.
- Calendário: visualização mensal e semanal; evento com cor por tipo (prazo fatal, audiência, intimação); clique abre o processo relacionado.
- Notificações in-app: sino no header com badge de contagem; painel lateral listando notificações recentes com marcação de lidas; e-mail com layout profissional e link direto para o processo.
- Busca avançada: manter a experiência atual do JurisRadar, adaptada ao contexto SaaS (histórico de buscas por usuário, salvar buscas favoritas).
- Onboarding guiado: fluxo de boas-vindas que solicita CPF + OAB, importa processos automaticamente e apresenta o dashboard com dados reais do advogado.
- Responsividade total: mobile-first; no mobile o CRM usa lista em vez de tabela; calendário com swipe entre semanas; notificações acessíveis via bottom sheet.
- Feedback visual: estados de carregamento, empty state explicativo em cada seção, toasts para ações do usuário, banner de erro claro para falhas de sincronização.
</requirements>

<api_contracts>
APIs externas:

- comunica.pje.jus.br: API do CNJ para comunicações processuais do PJe; mapear no PRD os endpoints disponíveis, mecanismo de autenticação (e-CPF, token, credencial tribunal) e frequência de atualização antes de definir abordagem de integração.
- DataJud (CNJ): https://datajud-wiki.cnj.jus.br — busca de processos por OAB, CPF, número CNJ; já integrado no JurisRadar como base.
- DJe TJSP e outros DJes: APIs de Diário de Justiça Eletrônico já mapeadas no JurisRadar.
- Gateway de pagamento (Stripe ou Pagar.me): gerenciamento de assinaturas recorrentes, webhooks de cobrança, portal do cliente.
- Provedor de e-mail transacional (Resend ou SendGrid): envio de notificações de intimações, alertas de prazo e e-mails de onboarding.

APIs de backend (novas ou alteradas):

- POST /auth/register — cadastro de advogado com CPF, OAB, e-mail e senha; dispara importação inicial de processos.
- POST /auth/login / POST /auth/refresh — autenticação JWT.
- POST /escritorio — criação de escritório; vincula o advogado fundador como sócio.
- POST /escritorio/:id/membros — convite de novos membros com papel definido.
- GET /processos — lista processos monitorados do advogado/escritório com filtros e paginação.
- GET /processos/:id — detalhes do processo com histórico completo de movimentações.
- POST /processos/sync — dispara sincronização manual dos processos via CPF+OAB.
- GET /notificacoes — lista notificações in-app do advogado; suporte a filtro lidas/não-lidas.
- PATCH /notificacoes/:id/lida — marca notificação como lida.
- GET /dashboard — agrega métricas do advogado: totais por status, prazos próximos, últimas intimações.
- GET /calendario — retorna eventos processuais (prazos, audiências) num intervalo de datas.
- POST /busca — endpoint de busca avançada de processos (reutiliza lógica do JurisRadar).
- POST /billing/checkout — cria sessão de checkout para assinatura.
- POST /billing/webhook — recebe eventos do gateway de pagamento (Stripe/Pagar.me).
</api_contracts>

<acceptance_criteria>
- Dado que um advogado se cadastra informando CPF e OAB válidos, quando o onboarding for concluído, então o sistema deve importar automaticamente os processos vinculados a esse advogado nas fontes disponíveis e exibi-los no CRM.
- Dado que um processo monitorado recebe nova intimação ou movimentação relevante, quando o worker de sincronização detectar o evento, então o sistema deve criar uma notificação in-app e enviar e-mail para o advogado responsável em até X minutos (SLA a definir conforme capacidade da API).
- Dado que o advogado acessa o Dashboard, quando a página carregar, então deve exibir: total de casos por status, prazos críticos dos próximos 7 dias, últimas intimações e distribuição por área do direito.
- Dado que o advogado acessa o Calendário, quando visualizar o mês atual, então todos os prazos e audiências dos processos monitorados devem aparecer como eventos, com diferenciação visual por tipo.
- Dado que um sócio do escritório convida um associado, quando o convite for aceito, então o associado deve ter acesso aos processos compartilhados do escritório com as permissões do papel associado.
- Dado que o advogado usa a busca avançada, quando aplicar filtros (tribunal, área, nome da parte), então os resultados devem refletir os filtros aplicados e o histórico da busca deve ser salvo no perfil do usuário.
- Dado que o advogado acessa a plataforma num dispositivo mobile, quando navegar entre Dashboard, CRM e Calendário, então todas as telas devem ser completamente utilizáveis sem scroll horizontal nem conteúdo cortado.
- Dado que a assinatura do advogado é ativada via checkout, quando o pagamento for confirmado pelo webhook do gateway, então o acesso completo à plataforma deve ser liberado automaticamente.
- Dado que a sincronização com o PJe falhar, quando o sistema não conseguir obter dados, então deve exibir banner de erro no CRM informando a falha e a última data de sincronização bem-sucedida.
</acceptance_criteria>

<constraints>
- FAÇA: isolar dados por escritório — nenhum advogado deve enxergar dados de outro escritório, mesmo em erros ou queries mal formadas.
- FAÇA: mapear as capacidades reais da API do comunica.pje.jus.br antes de comprometer com SLA de tempo real; documentar limitações no PRD.
- FAÇA: exibir a data e hora da última sincronização em destaque no CRM para que o advogado saiba quão fresco está o dado.
- FAÇA: usar filas (job queue) para o worker de monitoramento, garantindo retry em caso de falha e evitando sobrecarga das APIs externas.
- FAÇA: garantir responsividade total — testar em breakpoints mobile (375px), tablet (768px) e desktop (1280px+).
- FAÇA: começar com plano único no billing; a arquitetura de planos deve ser extensível para múltiplos tiers no futuro sem refatoração estrutural.
- NÃO FAÇA: armazenar senhas de tribunais ou credenciais do advogado sem criptografia forte; se a integração PJe exigir credenciais do advogado, usar vault seguro e comunicar claramente ao usuário.
- NÃO FAÇA: bloquear a UI enquanto a sincronização de processos ocorre — usar background jobs e notificar o resultado de forma assíncrona.
- NUNCA: expor dados de processos de um escritório para usuários de outro escritório.
- NUNCA: cobrar ou renovar assinatura sem confirmação do gateway de pagamento via webhook.
</constraints>
