PRD — JurisRadar: Busca e Monitoramento de Processos Judiciais

Visão Geral

Advogados e escritórios de advocacia perdem horas por semana acessando manualmente os portais de dezenas de tribunais para localizar processos em andamento que atendam a determinados critérios (tipo de ação, instância, comarca, período). Não existe hoje uma ferramenta self-service acessível que centralize essa busca em um único lugar.

O JurisRadar automatiza essa localização: o usuário define filtros (assunto/classe processual, instância, tribunal/estado, período, busca livre) e o sistema consulta simultaneamente todos os ~90 tribunais brasileiros via API DataJud do CNJ, retornando uma lista unificada de processos que atendem aos critérios. O dado central é o número do processo no formato CNJ; metadados complementares (classe, tribunal, vara, data de distribuição, partes, última movimentação) são exibidos quando disponíveis.

O produto é construído como MVP validatório para confirmar que a busca nacional centralizada é tecnicamente viável e útil na prática — antes de qualquer decisão de monetização ou expansão de escopo.

Objetivos

Objetivo principal do MVP: executar o fluxo completo ponta a ponta sem erros críticos — login → filtrar → buscar → salvar → reexecutar → exportar — com pelo menos um cenário real de busca (ex.: assunto "pensão alimentícia", grau 1º, período dos últimos 12 meses).

Objetivos de validação:

Confirmar que a busca nacional via DataJud retorna processos reais e relevantes em tempo aceitável para o advogado.
Confirmar que o fluxo de salvar e reexecutar uma busca reduz o esforço de monitoramento periódico.
Coletar evidências sobre quais filtros são mais usados e quais resultados são mais acionáveis — para informar o roadmap da Fase 2.

Marco-alvo: MVP funcional com fluxo completo validado internamente antes de qualquer lançamento externo.

Histórias de Usuário
Persona principal: Advogado de escritório de pequeno/médio porte

Fluxo de descoberta:

Como advogado, quero buscar processos por assunto e período em todos os tribunais de uma vez, para não precisar acessar cada portal individualmente.
Como advogado, quero ver o número CNJ de cada processo encontrado junto com classe, tribunal, vara e data de distribuição, para avaliar rapidamente se o processo é relevante para meu trabalho.
Como advogado, quero iniciar uma busca e continuar navegando no sistema enquanto ela é processada, para não ficar bloqueado esperando uma resposta síncrona longa.
Como advogado, quero paginar os resultados sem perder os filtros ativos, para explorar uma lista longa sem ter que refazer a busca.

Fluxo de gestão de buscas:

Como advogado, quero salvar os filtros de uma busca útil, para não precisar reconfigurar os mesmos filtros toda vez.
Como advogado, quero ver o histórico das minhas buscas anteriores (incluindo as que ainda estão em andamento) e reexecutar qualquer uma com um clique, para monitorar periodicamente um conjunto de processos de interesse.
Como advogado, quero que meu histórico seja privado e separado dos outros usuários do sistema, para que minhas estratégias de busca não sejam expostas a terceiros.

Fluxo de exportação:

Como advogado, quero exportar os resultados de uma busca em CSV, para analisar os dados em planilha ou compartilhar com o time.

Fluxo de acesso:

Como usuário não autenticado, quero ser redirecionado para o login ao tentar acessar o sistema, para que dados sensíveis não sejam expostos sem autenticação.
Features Principais
1. Autenticação multi-usuário

Acesso ao sistema protegido por login. Cada usuário tem sua sessão isolada — histórico de buscas, buscas salvas e resultados são privados por conta. No MVP, sem autoregistro público: contas criadas administrativamente.

Comportamento: qualquer acesso não autenticado redireciona para a tela de login. Após autenticação, o usuário acessa o painel de busca.

2. Painel de filtros de busca

Interface de filtros com os campos abaixo. A estrutura de filtros é extensível: adicionar um novo critério no futuro não exige redesenho da interface.

Filtros disponíveis no MVP:

Assunto/Classe processual — busca por código ou texto (ex.: "pensão alimentícia", "execução fiscal"). Suporta múltiplos valores.
Instância (grau) — 1º grau, 2º grau, JEC (Juizado Especial), outros.
Período de distribuição — data inicial e data final.
Busca livre — campo de texto livre que o DataJud aplica sobre os campos indexados.

Filtros fora do MVP (Fase 2): comarca, vara, estado/UF isolado.

3. Busca nacional federada (assíncrona)

Ao submeter a busca, o sistema consulta os ~90 tribunais disponíveis no DataJud e agrega, normaliza e retorna os resultados como lista unificada paginada.

Importante — modelo de execução: dado o volume de tribunais consultados e os limites de duração de função na Vercel, a busca não é executada como uma única requisição síncrona de ponta a ponta. Ela roda como um job assíncrono:

O usuário submete os filtros; o sistema cria um registro de "busca" com status em_andamento e responde imediatamente.
O processamento consulta os tribunais em lotes paralelos, dentro do tempo de execução permitido por invocação de função.
O frontend consulta o status da busca periodicamente (polling) até ela ser concluída, exibindo resultados parciais conforme chegam, se aplicável.
Buscas que exigem mais tempo do que uma única invocação permite continuam em invocações subsequentes, até completar todos os tribunais ou atingir um limite máximo de tentativas.

Comportamento esperado:

Indicador de progresso visível durante o processamento (ex.: "42 de 90 tribunais consultados").
Se um ou mais tribunais retornarem erro ou timeout, os resultados dos demais são exibidos normalmente; o usuário é informado quais tribunais não responderam.
Resultados paginados com total estimado (não exato, pela natureza federada e assíncrona).
Cada processo exibe: número CNJ (obrigatório), classe/assunto, tribunal, grau, órgão julgador/vara, data de distribuição, partes (quando disponíveis), status/última movimentação (quando disponível).
4. Histórico e buscas salvas

Toda busca executada é registrada automaticamente no histórico do usuário (filtros usados, status, data/hora de execução). O usuário pode nomear uma busca para facilitar a identificação, ou deixar sem nome.

A partir do histórico, o usuário pode reexecutar qualquer busca salva com os filtros originais. A reexecução dispara um novo job assíncrono (mesmo fluxo da seção 3).

5. Exportação de resultados

Após uma busca concluída (ou parcialmente concluída) retornar resultados, o usuário pode exportar a lista em formato CSV. O arquivo inclui todos os campos disponíveis por processo. Exportação em Excel (XLSX) é Fase 2.

6. Tratamento de limitações da fonte de dados

O sistema comunica de forma clara as limitações inerentes ao DataJud:

Lag de dados: aviso de que os dados podem ter até 7 dias de defasagem em relação aos portais dos tribunais.
Tribunais com falha: lista dos tribunais que não responderam em determinada busca.
Sem resultados: estado visual distinto quando nenhum processo atende aos filtros (não lista vazia sem indicação).
Busca em andamento: estado visual distinto para buscas que ainda não terminaram de consultar todos os tribunais.
Experiência do Usuário
Jornada principal

1. Acesso: O advogado acessa o JurisRadar e é direcionado ao login se não autenticado. Após login, chega diretamente ao painel de busca.

2. Definição de filtros: O painel exibe os campos de filtro de forma clara. O advogado preenche o assunto ("pensão alimentícia"), seleciona o grau (1º grau) e define o período (últimos 12 meses). Pode adicionar busca livre opcionalmente.

3. Execução da busca: Ao clicar em "Buscar", o sistema confirma que a busca foi iniciada e mostra uma barra de progresso indicando quantos tribunais já foram consultados. O advogado pode continuar navegando no sistema enquanto isso.

4. Exploração dos resultados: A lista unificada exibe os processos com seus dados disponíveis, atualizando conforme mais tribunais respondem. O advogado navega pelas páginas sem perder os filtros. Um indicador mostra quais tribunais retornaram resultados e quais falharam.

5. Salvando a busca: O advogado clica em "Salvar busca" e opcionalmente nomeia como "Pensão alimentícia TJSP/TRF — 2026". A busca aparece no histórico.

6. Exportação: Com os resultados na tela, o advogado clica em "Exportar CSV" e faz o download do arquivo.

7. Reexecução: Na próxima semana, o advogado acessa o histórico, localiza a busca salva e clica em "Reexecutar" — um novo job é criado com os mesmos filtros.

Estados de interface obrigatórios
Em andamento: indicador de progresso (tribunais consultados / total) durante o processamento assíncrono.
Resultado parcial com falhas: lista de resultados + aviso sobre tribunais que não responderam.
Sem resultados: mensagem clara diferenciando "nenhum processo encontrado com esses filtros" de "erro na busca".
Erro geral: quando o DataJud está indisponível, mensagem de erro sem dados parciais incorretos.
Acesso negado: redirecionamento para login ao tentar acessar qualquer rota sem autenticação.
Aviso de limitação de dados

Em posição de destaque próximo aos resultados: "Os dados exibidos provêm do DataJud (CNJ) e podem ter até 7 dias de defasagem em relação aos portais dos tribunais."

Restrições Técnicas de Alto Nível

Stack: Next.js (TypeScript) full-stack — frontend e backend no mesmo projeto, usando Route Handlers (App Router) como camada de API. Sem serviço Python separado.

Hospedagem: Vercel, com o modelo de execução assíncrona da seção "Busca nacional federada" desenhado especificamente para respeitar os limites de duração de função da plataforma — a arquitetura não assume tempo de execução ilimitado em uma única invocação, independentemente do plano contratado.

Fonte de dados: API pública DataJud do CNJ como única fonte no MVP. Chave pública compartilhada; sem SLA contratual; rate limit por endpoint de tribunal. O sistema deve gerenciar rate limiting e retries com backoff para não ultrapassar os limites, distribuindo as consultas aos ~90 tribunais em lotes ao longo de múltiplas invocações quando necessário.

Persistência do estado da busca: o status de cada busca (pendente, em andamento, concluída, com falhas parciais), os resultados já coletados e os tribunais pendentes de consulta são armazenados em banco de dados (ex.: Postgres gerenciado), permitindo que o processamento continue de onde parou entre invocações de função.

Integração exclusiva pelo backend: o frontend nunca acessa o DataJud diretamente. Toda integração passa pelas rotas de API do Next.js.

LGPD — minimização de dados: dados de partes de processos (nomes, documentos) são tratados como dados pessoais. Apenas os campos necessários para exibição devem ser armazenados; nenhum dado sensível deve ser persistido além do necessário. Processos em segredo de justiça não são retornados pelo DataJud — não há risco de exposição desse conteúdo neste MVP.

Autenticação: todos os endpoints e telas do sistema exigem autenticação válida. Dados de processos nunca são expostos a sessões não autenticadas.

Preparação para o futuro: a camada de persistência deve salvar o estado das buscas (filtros, timestamp, usuário, referência aos resultados) de forma a suportar execução periódica agendada futura (Fase 3, via agendamento nativo da plataforma de hospedagem), sem implementá-la agora.

Não-Objetivos (Fora de Escopo)

MVP (Fase 1) — explicitamente excluídos:

Exportação em Excel (XLSX) — Fase 2.
Filtro por comarca, vara ou UF isolada — Fase 2.
Busca por CPF/CNPJ da parte — Fase futura (requer fonte de dados adicional ao DataJud).
Monitoramento periódico automático com notificações — Fase 3.
Autoregistro público de usuários — contas criadas administrativamente no MVP.
Billing, planos de assinatura ou cotas por usuário — MVP validatório, sem monetização.
Scraping de portais dos tribunais — risco regulatório LGPD/ANPD; pode ser reavaliado na Fase 2 com RIPD.
Acesso a documentos dos processos (autos digitais) — fora do escopo do DataJud público.
Busca de processos criminais no SEEU/BNMP — não coberto pelo DataJud público.
Resumos ou sumarização de movimentações com IA — Fase futura.
Plano de Lançamento em Fases
MVP — Fase 1: Fluxo Completo Validado

Objetivo: confirmar que o fluxo ponta a ponta funciona com dados reais do DataJud, dentro dos limites de execução da hospedagem escolhida.

Features incluídas:

Autenticação multi-usuário (contas criadas administrativamente).
Painel de filtros: assunto/classe, instância/grau, período, busca livre.
Busca nacional federada assíncrona em todos os tribunais DataJud.
Lista de resultados unificada e paginada, com atualização de progresso.
Indicador de tribunais com falha/timeout.
Aviso de defasagem de dados do DataJud.
Histórico de buscas por usuário (incluindo status de andamento).
Buscas salvas com reexecução em um clique.
Exportação em CSV.

Critério de avanço para Fase 2: fluxo completo executado sem erros críticos em ao menos 3 cenários de busca reais, incluindo buscas que exigem múltiplas invocações para completar todos os tribunais; feedback interno coletado sobre usabilidade e completude dos filtros.

Fase 2: Filtros Avançados e Exportação Rica

Features adicionais:

Filtro por estado/UF, comarca e vara (onde o DataJud fornecer esses dados de forma padronizada).
Exportação em Excel (XLSX).
Autoregistro de usuários (com aprovação ou convite).
Melhorias de UX baseadas no feedback da Fase 1 (filtros mais usados em destaque, sugestões de assunto, etc.).
Avaliação de scraping pontual para tribunais com baixa cobertura no DataJud (condicionada à elaboração de RIPD).

Critério de avanço para Fase 3: usuários externos usando o sistema regularmente; pelo menos uma busca salva reexecutada por usuário por semana em média.

Fase 3: Monitoramento Periódico com Notificações

Features adicionais:

Execução automática e agendada de buscas salvas (agendamento nativo da plataforma de hospedagem: diário, semanal).
Notificação ao usuário quando novos processos forem encontrados em uma busca monitorada (canal a definir: e-mail ou in-app).
Dashboard de monitoramento: buscas ativas, histórico de execuções automáticas, processos novos encontrados desde a última execução.
Avaliação de parceria com API comercial (ex.: JUDIT) para reduzir o lag de dados e habilitar webhooks.
Métricas de Sucesso

Fase 1 (MVP validatório):

Fluxo completo (login → busca → salvar → reexecutar → exportar) executável sem erros críticos em 100% dos cenários de teste internos.
Pelo menos 3 buscas reais executadas com resultados não vazios provenientes do DataJud, incluindo ao menos uma que exija múltiplas invocações para cobrir todos os tribunais.
Zero exposição de dados de processos a usuários não autenticados.
Zero erros de timeout de função não tratados (toda busca que ultrapassa o tempo de uma invocação deve continuar de forma controlada, não falhar silenciosamente).

Fase 2 e além:

Taxa de reexecução de buscas salvas: % de buscas salvas reexecutadas ao menos uma vez por semana.
Taxa de exportação: % de buscas com resultado que geram pelo menos uma exportação.
Cobertura de tribunais: % de tribunais do DataJud retornando resultados sem timeout em condições normais.
Satisfação do usuário: NPS ou CSAT coletado após primeiros usuários externos (Fase 2).
Riscos e Mitigações

Risco 1 — Limites de duração de função na Vercel A plataforma impõe um tempo máximo de execução por invocação de função (varia conforme o plano contratado e configuração). Uma busca em ~90 tribunais, com retries e backoff, pode não caber em uma única invocação. Mitigação: modelo de execução assíncrona em lotes com persistência de estado (seção "Busca nacional federada"), permitindo que o processamento continue em invocações subsequentes; a arquitetura não depende de uma única chamada de longa duração ser bem-sucedida de ponta a ponta.

Risco 2 — Disponibilidade e estabilidade do DataJud O DataJud não tem SLA contratual e pode ter instabilidades. Mitigação: cache de resultados recentes por conjunto de filtros; indicador claro de status da fonte de dados na interface; degradação graciosa (exibir resultados dos tribunais que responderam).

Risco 3 — Rate limit atingido em buscas nacionais Uma busca em 90 tribunais pode ultrapassar os limites de requisição do DataJud. Mitigação: backoff exponencial com retries; controle de concorrência por lote; comunicação clara ao usuário quando a busca for limitada.

Risco 4 — Lag de dados cria expectativa equivocada O advogado pode esperar ver processos distribuídos ontem e não encontrá-los. Mitigação: aviso permanente e visível sobre o lag de até 7 dias; não competir na dimensão "tempo real" no MVP.

Risco 5 — LGPD e tratamento de dados de partes Os nomes e dados das partes nos processos são dados pessoais sob LGPD. Mitigação: minimização (não persistir além do necessário para exibição), base legal documentada (legítimo interesse do advogado no exercício de sua atividade profissional), preparação proativa de RIPD antes de escalar para usuários externos.

Risco 6 — Adoção baixa por limitação de filtros no MVP Sem filtro por comarca, CPF ou vara, advogados com necessidades muito específicas podem considerar o MVP insuficiente. Mitigação: comunicar claramente o roadmap de Fase 2; focar o MVP em casos de uso de busca por assunto/tema em escala nacional, que já é o principal gap não atendido pelo mercado.

Risco 7 — Concorrência de produtos consolidados JusBrasil e Escavador têm marcas estabelecidas e bases de dados mais completas. Mitigação: o MVP não compete com eles — é validatório; a diferenciação de Fase 3 (monitoramento + possível IA) é o ponto de distinção real a longo prazo.

Architecture Decision Records
ADR-001: Estratégia do MVP — Busca Nacional Assíncrona com Fluxo Completo — Adoção da busca federada assíncrona em todos os tribunais DataJud, em stack Next.js full-stack hospedada na Vercel, com fluxo ponta a ponta completo; scraping e monitoramento periódico adiados para fases posteriores.
Questões em Aberto
Canal de notificação (Fase 3): Quando o monitoramento periódico for implementado, qual canal de notificação usar — e-mail, notificação in-app, webhook para integração com ferramentas do escritório? A definir antes de iniciar o TechSpec da Fase 3.
Estratégia de dados comerciais pós-MVP: O DataJud tem limitações de lag e rate limit que podem ser impeditivas para escritórios maiores. Vale avaliar parceria com JUDIT ou Escavador API desde a Fase 2? A resposta depende do feedback dos usuários externos da Fase 2.
Scraping como fallback (Fase 2): Se decidido incluir scraping pontual para tribunais com cobertura deficiente no DataJud, será necessário elaborar um RIPD formal antes de implementar. Quem será o responsável legal por esse documento?
Volume de contas no MVP: Quantas contas de usuário serão criadas administrativamente no MVP validatório? Isso determina se é necessário qualquer interface de gestão de usuários ou se basta criação direta no banco de dados.
Plano de hospedagem na Vercel: O plano contratado (gratuito vs. pago) define o tempo máximo de execução disponível por invocação de função, o que influencia diretamente o tamanho dos lotes de tribunais processados por invocação no modelo assíncrono. Essa decisão deve ser tomada antes do TechSpec técnico da Fase 1.
Sumarização com IA: A pesquisa de mercado mostrou que resumos em linguagem simples das movimentações processuais são um possível diferencial competitivo. Esse caminho está no horizonte do JurisRadar? A resposta influencia decisões de arquitetura de Fase 3 em diante.