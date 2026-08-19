# PRD — JurisRadar SaaS: Plataforma de CRM e Monitoramento de Processos para Advogados

**Versão:** 1.0  
**Data:** 2026-08-19  
**Status:** Rascunho para aprovação

---

## Visão Geral

O JurisRadar SaaS transforma a ferramenta interna de busca de processos jurídicos numa plataforma SaaS multi-tenant voltada a advogados e escritórios de advocacia brasileiros.

O produto resolve três problemas simultâneos que nenhum concorrente atual resolve de forma integrada:

1. **Monitoramento passivo**: o advogado hoje precisa acessar múltiplos sistemas de tribunais para saber o que aconteceu nos seus processos. O JurisRadar monitora automaticamente e notifica por e-mail e in-app.
2. **Gestão ativa**: o mercado tem ferramentas de CRM jurídico com curvas íngremes e interfaces datadas (73% de adoção, só 31% de satisfação). O JurisRadar oferece CRM fluido com importação automática de processos via CPF + OAB.
3. **Prospecção**: o advogado pode buscar processos de potenciais clientes diretamente na plataforma, usando as mesmas APIs do DataJud e PJe que já abastecem o produto.

**Para quem é:** advogados autônomos e escritórios de advocacia de qualquer porte e área no Brasil.

**Modelo de negócio:** assinatura por escritório (não por usuário) — R$157/mês no plano mensal ou R$127/mês no plano anual (R$1.524/ano). Plano único no lançamento.

---

## Objetivos

- **Conversão:** atingir 500 escritórios pagantes nos primeiros 12 meses pós-lançamento.
- **Retenção:** churn mensal abaixo de 3% (benchmark do setor de SaaS jurídico: ~5%).
- **Engajamento:** 80% dos usuários ativos acessam a plataforma ao menos 3x por semana (advogados que monitoram processos ativamente).
- **NPS:** ≥ 50 ao fim do primeiro ano — superar a média do segmento (Astrea/Aurum tem 6,6/10 no Reclame Aqui).
- **Receita anual:** R$762.000 ARR com 500 escritórios no mix mensal/anual.
- **Prazo:** lançamento público no 4º trimestre de 2026; beta fechado no 3º trimestre de 2026.

---

## Histórias de Usuário

### Persona 1 — Advogado Autônomo (principal)

> João, 34 anos, advogado trabalhista com 80 processos ativos. Usa planilha + acesso manual aos sistemas do tribunal. Perde prazos porque não vê as intimações a tempo. Ganha ~R$8.000/mês.

- Como advogado autônomo, quero importar automaticamente meus processos informando CPF e OAB, para não precisar cadastrar 80 processos um a um.
- Como advogado autônomo, quero receber um e-mail imediato quando houver nova intimação num dos meus processos, para não perder prazos fatais.
- Como advogado autônomo, quero ver no dashboard quantos processos tenho por status (pendente, em instrução, julgado), para ter visão geral da minha carteira sem abrir o sistema do tribunal.
- Como advogado autônomo, quero registrar o honorário combinado e marcar quando o cliente pagou, para não perder controle das minhas finanças por processo.
- Como advogado autônomo, quero acessar o calendário com todos os meus prazos processuais do mês, para planejar minha semana sem consultar cada processo individualmente.

### Persona 2 — Sócio de Escritório (comprador da assinatura)

> Marina, 42 anos, sócia de escritório com 4 advogados. Já usa ADVBox (R$800/mês total) mas reclama da curva de aprendizado e da falta de visibilidade do que cada advogado está fazendo.

- Como sócia do escritório, quero convidar os associados para a plataforma com papel definido, para controlar quem vê e edita quais processos.
- Como sócia do escritório, quero ver no dashboard consolidado os processos de toda a equipe agrupados por responsável, para saber a carga de trabalho de cada advogado.
- Como sócia do escritório, quero receber alerta quando um prazo de qualquer membro da equipe estiver a menos de 48 horas, para agir caso o responsável não tenha visto.
- Como sócia do escritório, quero ver o resumo financeiro do escritório (honorários a receber por mês), para projetar o fluxo de caixa.

### Persona 3 — Advogado Associado

> Carlos, 28 anos, associado no escritório de Marina. Cuida de 40 processos trabalhistas delegados pela sócia.

- Como associado, quero ver apenas os processos que me foram atribuídos, para não me perder nos processos dos outros advogados.
- Como associado, quero adicionar notas internas num processo (ex.: "aguardando documento do cliente"), para que a sócia veja o andamento sem precisar me perguntar.

### Persona 4 — Advogado Prospectador

> Ricardo, 38 anos, advogado de família que quer captar clientes. Hoje pesquisa manualmente no DataJud.

- Como advogado prospectador, quero buscar processos por nome da parte ou CPF e salvar os resultados, para identificar potenciais clientes que ainda não têm advogado.
- Como advogado prospectador, quero ver o histórico das minhas buscas salvas, para não repetir pesquisas que já fiz.

---

## Features Principais

### 1. Onboarding e Gestão de Contas

**O que faz:** Permite que o advogado crie sua conta, configure o escritório e vincule seus processos em menos de 5 minutos.

**Comportamento:**
- Cadastro com e-mail, senha, CPF e número de OAB (estado + número).
- Após cadastro, fluxo de onboarding guiado em 3 passos: (1) dados do escritório, (2) importação automática de processos via CPF+OAB, (3) apresentação do dashboard com dados reais.
- Suporte a 2FA opcional por autenticação via app (TOTP).
- Sócio pode convidar membros pelo e-mail com papel pré-definido (sócio, associado, estagiário).
- Estagiário tem acesso somente leitura; associado pode editar processos atribuídos; sócio tem acesso total.

### 2. Importação Automática de Processos (OAB/CPF)

**O que faz:** Busca e importa para o CRM todos os processos em que o advogado consta como representante, usando CPF e número da OAB como chaves de consulta nas APIs disponíveis (DataJud, PJe/Comunica).

**Comportamento:**
- Importação inicial é disparada automaticamente ao finalizar o onboarding.
- Sincronização periódica automática (frequência configurável; padrão: 1x ao dia).
- Sincronização manual disponível com um clique.
- Indicador visual de "última sincronização em DD/MM às HH:MM" sempre visível no CRM.
- Em caso de falha de sincronização, banner de erro não bloqueante com detalhes e botão "Tentar novamente".
- Processos novos encontrados nas sincronizações são adicionados automaticamente ao CRM e geram notificação.

### 3. CRM de Processos

**O que faz:** Painel central de gestão da carteira de processos do advogado e do escritório, com visão consolidada de todos os casos ativos.

**Comportamento:**
- Listagem de processos com colunas: número CNJ, partes principais, tribunal, área do direito, status, última movimentação, próximo prazo e advogado responsável.
- Filtros rápidos por status, área, tribunal, responsável e urgência.
- Ordenação por qualquer coluna.
- Busca por número CNJ ou nome da parte dentro do CRM.
- Clique no processo abre painel lateral com: histórico completo de movimentações, dados das partes, advogados opostos, arquivos anexados, notas internas e informações financeiras do caso.
- Notas internas por processo (texto livre, vistas por todos os membros do escritório com papel ≥ associado).
- Processo pode ser arquivado manualmente (sai da lista ativa mas fica no histórico).
- No mobile, a lista usa cards verticais em vez de tabela.

### 4. Monitoramento e Notificações

**O que faz:** Detecta novas movimentações, intimações e eventos relevantes nos processos monitorados e notifica o advogado responsável.

**Comportamento:**
- Worker automático verifica por novos eventos em cada processo ativo nas fontes disponíveis (DataJud, PJe/Comunica, DJe).
- Eventos que geram notificação: nova intimação, citação, decisão, sentença, publicação em diário e prazo a vencer em ≤ 5 dias.
- Notificação in-app: sino no header com badge de contagem; painel lateral com lista de notificações em ordem cronológica; marcação individual ou em massa como lida.
- Notificação por e-mail: layout profissional com nome do processo, número CNJ, tribunal, descrição do evento e link direto para o processo no CRM.
- Preferências de notificação por advogado: escolher quais tipos de evento geram e-mail, quais só geram in-app.
- Sócio pode optar por receber cópia das notificações de toda a equipe.

### 5. Dashboard Analítico

**O que faz:** Apresenta ao advogado uma visão estratégica da sua carteira para tomada de decisão rápida.

**Comportamento:**

Cards de métricas no topo:
- Total de processos ativos
- Processos com urgência alta (prazo ≤ 5 dias ou intimação não lida)
- Prazos dos próximos 7 dias
- Intimações não lidas

Gráficos e listas:
- Distribuição de processos por status (pendente, em instrução, aguardando julgamento, em recurso, arquivado) — gráfico de rosca
- Distribuição por área do direito (trabalhista, cível, criminal, família, previdenciário etc.) — gráfico de barras
- Evolução mensal do volume de processos ativos — linha temporal (últimos 6 meses)
- Lista dos 5 prazos mais críticos com link direto ao processo
- Timeline das últimas 10 movimentações recebidas

Para sócios: dashboard consolidado com visão do escritório inteiro + comparativo por advogado responsável.

### 6. Calendário Processual

**O que faz:** Centraliza todos os prazos e audiências dos processos monitorados num calendário visual, calculando automaticamente os prazos a partir das movimentações.

**Comportamento:**
- Visualizações: mensal, semanal e lista (agenda).
- Eventos com cores por tipo: vermelho (prazo fatal ≤ 2 dias), laranja (prazo de 3–7 dias), azul (audiência), cinza (prazo > 7 dias), roxo (intimação sem prazo definido).
- Clique num evento abre detalhes do processo correspondente.
- Alerta automático antes do prazo: notificação in-app e e-mail enviados em T-5 dias, T-2 dias e T-1 dia.
- Exportação do calendário em formato iCal (.ics) para sincronização com Google Calendar, Outlook ou Apple Calendar.
- No mobile: swipe horizontal entre semanas/meses.

### 7. Módulo Financeiro

**O que faz:** Registra e acompanha honorários advocatícios e pagamentos por processo, dando ao advogado visibilidade da saúde financeira da sua carteira.

**Comportamento:**
- Por processo: campo para registrar tipo de honorário (fixo, por êxito, misto), valor combinado e data prevista de recebimento.
- Registro de pagamentos: marcar parcelas pagas com data e valor; status automático (pendente / parcialmente pago / quitado).
- Dashboard financeiro simplificado: total a receber no mês atual, recebido no mês atual, em atraso.
- Filtros por período, status de pagamento e responsável.
- Para sócios: visão consolidada do escritório com resumo por advogado.
- Não inclui emissão de notas fiscais, integração contábil ou DRE nesta versão.

### 8. Busca Avançada de Processos

**O que faz:** Permite que o advogado pesquise processos em todo o sistema judiciário brasileiro para prospecção de clientes ou localização de processos específicos.

**Comportamento:**
- Herdada do JurisRadar atual; adaptada ao contexto SaaS.
- Filtros: tribunal, área do direito, nome da parte, número CNJ, comarca, grau, intervalo de datas.
- Resultado exibe: número CNJ, partes, última movimentação, advogados representantes, tribunal e grau.
- Histórico de buscas salvo por usuário (últimas 50 buscas).
- Busca favorita: salvar uma busca com nome para reutilizar com um clique.
- Resultado pode ser adicionado ao CRM como processo monitorado diretamente da tela de busca.

### 9. Billing e Assinatura

**O que faz:** Gerencia a assinatura do escritório de forma autônoma, sem intervenção manual da equipe JurisRadar.

**Comportamento:**
- Checkout via gateway de pagamento com suporte a cartão de crédito e Pix.
- Plano mensal (R$157/mês) e plano anual (R$127/mês, cobrado R$1.524 à vista).
- Trial gratuito de 14 dias sem necessidade de cartão de crédito.
- Ao fim do trial, acesso bloqueado para novos dados mas histórico preservado por 30 dias.
- Portal self-service: trocar plano, atualizar forma de pagamento, cancelar e ver histórico de faturas.
- Acesso liberado automaticamente após confirmação de pagamento via webhook do gateway.
- Notificação de cartão prestes a vencer e falha de cobrança por e-mail.

---

## Experiência do Usuário

### Fluxo Principal — Primeiro Acesso (Onboarding)

1. Advogado acessa o site e clica em "Começar gratuitamente" → inicia trial de 14 dias.
2. Cadastro: nome, e-mail, senha → tela de verificação de e-mail.
3. Passo 1 de onboarding: "Informe sua OAB" — estado + número. Campo CPF opcional para ampliar cobertura de busca.
4. Passo 2: "Importando seus processos…" — tela animada enquanto o sistema busca processos nas APIs. Feedback em tempo real ("Encontramos 12 processos no DataJud, 5 no PJe…").
5. Passo 3: "Seu escritório está pronto" — preview do dashboard com dados reais. Tour interativo opcional de 90 segundos destacando CRM, Calendário e Notificações.
6. Advogado começa a usar. Notificação in-app no dia 10 do trial: "Faltam 4 dias — assine para não perder seus dados".

### Fluxo Principal — Advogado no Dia a Dia

1. Login → Dashboard: visão rápida de prazos críticos e intimações não lidas.
2. Clica numa intimação → abre o processo no CRM com a intimação destacada.
3. Registra uma nota interna sobre a ação tomada.
4. Vai ao Calendário → confirma que o prazo da petição está marcado.
5. Busca um processo de um potencial cliente → adiciona ao CRM como "monitoramento".
6. Fim do dia: recebe e-mail com resumo das movimentações do dia (configurável).

### Considerações de UX

- **Sidebar fixa** em desktop com ícone + label; colapsável para ícone-only em telas menores.
- **Dark mode** disponível (preferência salva por usuário).
- **Empty states** explicativos em cada seção: na ausência de processos, exibe ilustração + mensagem + botão de ação principal.
- **Feedback imediato**: toasts de confirmação para ações (processo adicionado, nota salva, sincronização iniciada).
- **Mobile-first**: CRM usa cards verticais; calendário tem swipe entre semanas; notificações acessíveis via bottom sheet.
- **Acessibilidade**: contraste mínimo WCAG AA, navegação por teclado nas telas principais, textos alternativos em ícones.

---

## Restrições Técnicas de Alto Nível

- **Isolamento de dados por escritório**: nenhum usuário pode acessar dados de outro escritório, mesmo em casos de erro de aplicação. Isso é um requisito não negociável de privacidade e confiança.
- **Dados sensíveis de advogados**: CPF, OAB e credenciais de tribunal não podem ser expostos em logs, respostas de API ou mensagens de erro visíveis ao usuário.
- **Conformidade com LGPD**: dados pessoais de partes de processos (nome, CPF) são obtidos de fontes públicas (DataJud, PJe) e exibidos apenas ao advogado representante ou ao escritório com papel autorizado. Nenhum dado é revendido ou compartilhado com terceiros.
- **Disponibilidade das APIs externas**: o sistema depende de APIs do CNJ (DataJud, PJe/Comunica) que podem ter instabilidade. A plataforma deve operar em modo degradado (exibir dados em cache com indicação de desatualização) quando as APIs externas estiverem indisponíveis.
- **Responsividade**: a plataforma deve ser plenamente utilizável nos breakpoints 375px (mobile), 768px (tablet) e 1280px+ (desktop), sem scroll horizontal.
- **Sincronização de processos**: a sincronização deve ocorrer em background e nunca bloquear a interface do usuário.

---

## Não-Objetivos (Fora de Escopo — v1.0)

- **Emissão de notas fiscais / integração contábil**: o módulo financeiro registra honorários e pagamentos, mas não emite NFS-e nem integra com sistemas contábeis (ERP, SIEG, Domínio). Fase 3.
- **Peticionamento eletrônico**: a plataforma monitora e notifica, mas não permite envio de petições ou documentos diretamente aos tribunais. Fase 3.
- **Automação de documentos e templates**: geração automática de contratos, petições ou minutas com IA. Fase 2.
- **Marketplace de co-patrocínio**: rede para advogados colaborarem em causas ou referirem clientes. Fase 3.
- **App nativo mobile (iOS/Android)**: o lançamento é web responsivo. App nativo pode ser avaliado após validação de mercado. Fase 2+.
- **Integração com Google Calendar em tempo real (leitura/escrita bidirecional)**: a v1.0 exporta .ics; integração OAuth bidirecional com Google Calendar é Fase 2.
- **Relatórios de BI avançados (Power BI, exportação customizada)**: o dashboard v1.0 tem métricas fixas. Relatórios configuráveis e exportação CSV/PDF entram na Fase 2.
- **Múltiplos planos com limites diferenciados**: o lançamento tem plano único. Tiers com limites de processos ou usuários são Fase 2.
- **Suporte a todos os tribunais brasileiros**: a v1.0 cobre as fontes já integradas (DataJud nacional, DJe TJSP, PJe/Comunica). Expansão gradual por tribunal conforme demanda.

---

## Plano de Lançamento em Fases

### Fase 1 — Fundação SaaS (Meses 1–3)

**O que inclui:**
- Multi-tenancy: conta de escritório com papéis (sócio, associado, estagiário)
- Autenticação segura com 2FA opcional
- Billing e assinatura (trial 14 dias, plano mensal e anual)
- Importação automática de processos via OAB/CPF (DataJud + PJe existentes)
- CRM básico: listagem, filtros e painel lateral de processo

**Critério de sucesso para Fase 2:** infraestrutura multi-tenant estável, billing funcionando, primeiros 50 escritórios em trial.

---

### Fase 2 — Produto Completo (Meses 4–7)

**O que inclui:**
- Sistema de notificações in-app e por e-mail (monitoramento de movimentações)
- Dashboard analítico completo
- Calendário processual com alertas de prazo
- Módulo financeiro básico (honorários + status de pagamento)
- Busca avançada com histórico e favoritos
- Notas internas por processo
- Onboarding guiado com tour interativo

**Critério de sucesso:** 200 escritórios ativos, churn < 5%, NPS inicial ≥ 40.

---

### Fase 3 — Expansão (Meses 8–12)

**O que inclui:**
- Lançamento público com marketing ativo
- Integração com tribunais adicionais conforme demanda
- Exportação de calendário (.ics) e integração OAuth bidirecional com Google Calendar
- Relatórios exportáveis (CSV/PDF)
- Automação de documentos básica (templates)
- Avaliação de planos diferenciados

**Critério de sucesso:** 500 escritórios pagantes, ARR ≥ R$762.000, churn < 3%.

---

## Métricas de Sucesso

| Métrica | Alvo 6 meses | Alvo 12 meses |
|---|---|---|
| Escritórios pagantes | 150 | 500 |
| ARR | R$228.000 | R$762.000 |
| Churn mensal | < 5% | < 3% |
| NPS | ≥ 40 | ≥ 50 |
| DAU/MAU ratio | > 40% | > 60% |
| Tempo médio de onboarding | < 5 min | < 3 min |
| Processos importados no D1 | > 80% dos usuários | — |
| E-mails de notificação abertos | > 50% | > 60% |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| APIs do CNJ (DataJud, PJe) ficam indisponíveis ou mudam sem aviso | Alto — monitoramento para de funcionar | Operar em modo degradado com cache; monitorar uptime das APIs; diversificar fontes (DJe além do PJe) |
| Advogados resistem a pagar por ferramenta que "já fazem no manual" | Alto — baixa conversão | Trial generoso (14 dias); onboarding que mostra valor imediato com dados reais; case studies de advogados que perderam prazos por falta de monitoramento |
| Concorrente grande (Astrea/Aurum) lança feature similar | Médio — reduz diferencial | Velocidade de execução; focar em preço por escritório (não por usuário) como diferenciador estrutural; investir em NPS para criar defesa por satisfação |
| Dificuldade de acesso à API do comunica.pje.jus.br (requer credencial CNJ Corporativo) | Alto — monitoramento PJe incompleto | Mapear alternativa via scraping autenticado como fallback; comunicar limitação claramente no onboarding; priorizar DataJud (público) como fonte primária |
| Complexidade de multi-tenancy com isolamento de dados | Médio — risco de vazamento de dados | Testes de isolamento em staging; auditoria de segurança antes do lançamento público; política de zero-logging de dados de processos |
| Churn alto no pós-trial (não percebem valor em 14 dias) | Alto — CAC não se paga | Onboarding ativo: e-mails de ativação nos dias 1, 3, 7 do trial; trigger de notificação real no D1 para mostrar valor imediato; CS humano disponível no trial |
| Prazo de 8–12 meses para lançamento completo | Médio — mercado pode mudar | Beta fechado a partir do mês 5 com advogados selecionados; feedback contínuo; possibilidade de antecipar Fase 3 se Fase 2 validar bem |

---

## Architecture Decision Records

- [ADR-001: Estratégia de Lançamento — Plataforma Completa vs MVP Faseado](adrs/adr-001.md) — Decisão por lançar o produto completo (CRM + monitoramento + financeiro + calendário) em vez de MVP mínimo faseado, baseado na insatisfação do mercado com ferramentas incompletas.

---

## Questões em Aberto

1. **Acesso à API comunica.pje.jus.br**: a API requer credencial CNJ Corporativo concedida pelo tribunal. É necessário investigar se o JurisRadar pode solicitar essa credencial como fornecedor de software ou se a integração exigirá credenciais delegadas dos advogados usuários. Isso afeta o SLA de "tempo real" prometido para movimentações do PJe.

2. **Cálculo de prazos processuais**: o calendário promete calcular prazos automaticamente. O CPC define regras gerais, mas cada tribunal tem especificidades (feriados locais, expediente eletrônico). Definir quão granular será o cálculo automático de prazos na v1.0 — simples (D+15 a partir da intimação) ou sofisticado (com tabela de feriados por comarca).

3. **Limite de processos por plano único**: o plano único não tem limite definido de processos monitorados. Advogados com carteiras muito grandes (500+ processos) podem gerar custo de sincronização desproporcional ao valor da assinatura. Definir fair use policy ou limite técnico antes do lançamento.

4. **Estratégia de aquisição pré-lançamento**: o PRD não define canal de aquisição (SEO, indicação, parceria com OAB, ads). Definir antes do beta para garantir lista de espera suficiente para validar conversão.

5. **Suporte a OABs de múltiplos estados**: advogados com registro em mais de um estado da OAB devem poder vincular todas as inscrições à mesma conta. Confirmar se isso está no escopo da v1.0.
