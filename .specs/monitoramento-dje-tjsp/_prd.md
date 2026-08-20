PRD — JurisRadar: Busca de Publicações no DJE/TJSP

Visão Geral

Advogados que atuam em São Paulo precisam acompanhar diariamente o Diário da Justiça Eletrônico (DJE) do TJSP para identificar processos publicados em suas áreas de atuação. Hoje esse processo é manual: o advogado acessa o portal do TJSP, baixa o PDF do caderno do dia, e lê ou pesquisa no documento — uma tarefa repetitiva que consome tempo e depende de disciplina diária.

O JurisRadar resolve esse problema indexando automaticamente as publicações do DJE/TJSP todos os dias e expondo uma interface de busca por palavra-chave livre com período configurável. O advogado digita um termo ("pensão alimentícia", "rescisão contratual", "execução fiscal") e vê imediatamente todos os processos publicados no DJE que correspondem àquela busca — com instância, vara, data e trecho do texto da publicação.

O produto complementa a busca nacional via DataJud já existente no JurisRadar: o DataJud cobre todos os tribunais com dados históricos mas com defasagem variável; o DJE/TJSP cobre São Paulo com publicação do mesmo dia.

Objetivos

Objetivo principal do MVP: o advogado realiza uma busca por palavra-chave no DJE/TJSP, recebe resultados de publicações reais com instância, vara e trecho do ato, e consegue identificar processos relevantes à sua área de atuação sem acessar o portal do TJSP.

Objetivos de validação:

Confirmar que a indexação diária dos cadernos do DJE funciona de forma confiável — sem lacunas no histórico e sem falhas silenciosas.
Confirmar que a busca por palavra-chave retorna resultados relevantes e que o advogado consegue avaliar a pertinência sem ler o texto completo do ato.
Coletar evidências sobre quais termos de busca são mais usados para informar o roadmap de filtros avançados (Fase 2).

Marco-alvo: MVP funcional com ao menos 30 dias de histórico indexado antes do primeiro uso externo.

Histórias de Usuário
Persona principal: Advogado de escritório de pequeno/médio porte que atua em São Paulo (Capital)

Fluxo de descoberta:

Como advogado, quero buscar processos publicados hoje no DJE/TJSP por termo como "pensão alimentícia", para identificar novos casos na minha área de atuação sem acessar o portal do TJSP manualmente.
Como advogado, quero ver para cada resultado o número do processo no formato CNJ, a instância (1ª ou 2ª), a vara ou câmara responsável, a data da publicação e um trecho do texto, para avaliar rapidamente se o processo é relevante.
Como advogado, quero definir um período (data inicial e data final) para a busca, para recuperar publicações de dias anteriores quando não consultei o DJE por alguns dias.
Como advogado, quero que meu histórico de buscas no DJE fique salvo separadamente do histórico de buscas nacionais, para gerenciar meu uso das duas ferramentas sem confusão.

Fluxo de exportação:

Como advogado, quero exportar os resultados de uma busca no DJE em CSV, para analisar os dados em planilha ou compartilhar com o time.

Features Principais

1. Indexação Diária Automática dos Cadernos DJE/TJSP

Um job automatizado baixa, a cada dia útil, os Cadernos 2 (Judicial — 2ª Instância) e 3 (Judicial — 1ª Instância da Capital) do DJE/TJSP. O conteúdo é processado: cada publicação é segmentada individualmente, o número do processo no formato CNJ é extraído, e o texto é indexado para busca.

Comportamento esperado:

O job executa diariamente em horário noturno, dentro da janela de disponibilidade de download do TJSP.
Se um caderno falhar no download ou no parsing, o sistema registra a falha e tenta novamente sem impactar as buscas do usuário sobre o histórico já indexado.
O status da última indexação (data, cadernos processados, eventuais falhas) é visível para o operador.

2. Busca por Palavra-Chave com Período Livre

Interface de busca dedicada na seção "Publicações DJE" do JurisRadar, com dois campos obrigatórios: termo de busca (texto livre) e período (data inicial e data final).

Comportamento esperado:

A busca retorna todas as publicações indexadas cujo texto contenha o termo informado, dentro do período selecionado.
Resultados são apresentados em ordem cronológica inversa (publicação mais recente primeiro).
O total de publicações encontradas é exibido antes da lista de resultados.
A busca é executada de forma síncrona — o resultado aparece sem necessidade de polling.

3. Card de Resultado de Publicação

Cada resultado exibe as seguintes informações:

Número do processo no formato CNJ (obrigatório).
Instância: 1ª ou 2ª Instância (derivado do caderno de origem).
Vara ou câmara (quando identificável no texto da publicação).
Data da publicação (data da edição do DJE onde o ato aparece).
Trecho do texto da publicação com o termo buscado destacado (snippet de aproximadamente 200 caracteres em torno do termo).

O card inclui um link para consulta do processo no portal do TJSP (via número CNJ), abrindo em nova aba.

4. Histórico de Buscas no DJE

Toda busca realizada na seção "Publicações DJE" é registrada automaticamente no histórico do usuário, separado do histórico de buscas DataJud. O usuário pode rever suas buscas anteriores (termos usados, período, total de resultados, data de execução) e reexecutá-las com um clique.

5. Exportação em CSV

Após uma busca retornar resultados, o usuário pode exportar a lista completa em CSV. O arquivo inclui todos os campos disponíveis por publicação: número CNJ, instância, vara/câmara, data de publicação, caderno de origem, e texto completo da publicação.

Experiência do Usuário
Jornada principal

1. Acesso: O advogado acessa o JurisRadar autenticado e navega até "Publicações DJE" no menu lateral — seção separada da busca nacional DataJud.

2. Definição de busca: O painel exibe dois campos: "Termo de busca" e "Período" (data inicial e data final). O advogado digita "execução fiscal", define o período como a última semana e clica em "Buscar".

3. Exploração dos resultados: A lista exibe as publicações encontradas, ordenadas da mais recente para a mais antiga. Cada card mostra o número CNJ, instância, vara e o trecho com o termo destacado. O advogado lê os snippets e identifica processos de interesse.

4. Aprofundamento: Para processos de interesse, o advogado clica no link do card e vai diretamente ao portal do TJSP para consultar o processo completo.

5. Exportação: Com os resultados relevantes identificados, o advogado exporta em CSV para registrar no seu sistema interno.

6. Reexecução: Na próxima semana, o advogado acessa o histórico DJE, localiza a busca salva e reexecuta com um clique para ver as publicações novas do mesmo termo.

Estados de interface obrigatórios

Sem resultados: mensagem clara diferenciando "nenhuma publicação encontrada para esse termo e período" de "período sem dados indexados ainda".
Período sem dados: quando o período solicitado vai além do histórico disponível, informar ao usuário a data mais antiga disponível no índice.
Indexação em andamento: se o job do dia ainda não terminou, indicar que os dados de hoje podem estar incompletos.
Aviso de fonte: indicar claramente que os resultados provêm do DJE/TJSP (Cadernos 2 e 3 — Capital), não cobrindo interior ou outros tribunais.

Restrições Técnicas de Alto Nível

Fonte de dados: DJE/TJSP — cadernos 2 e 3, em formato PDF, disponibilizados gratuitamente pelo TJSP sem autenticação. O sistema deve respeitar a janela de disponibilidade de download (fora do horário comercial em dias de expediente).

Cobertura: apenas publicações do TJSP — Capital (Cadernos 2 e 3). Sem cobertura de comarcas do interior ou de outros tribunais neste MVP.

Autenticação: a seção "Publicações DJE" exige a mesma autenticação do restante do JurisRadar. Resultados e histórico são privados por conta de usuário.

Integração exclusiva pelo backend: o frontend nunca acessa o portal do TJSP diretamente. Todo download e parsing ocorre nos jobs do backend.

LGPD: publicações do DJE são dados públicos por natureza legal (publicidade processual). Nomes de partes que apareçam nos textos devem ser tratados com minimização: o sistema persiste o texto das publicações para finalidade de busca, sem enriquecimento adicional de dados pessoais.

Não-Objetivos (Fora de Escopo)

MVP — explicitamente excluídos:

Monitoramento pessoal por nome do advogado, OAB ou CPF — a feature é de descoberta por assunto, não de vigilância de processos próprios.
Cobertura de comarcas do interior do TJSP (Cadernos 4, partes I, II e III) — Fase 2.
Cobertura de outros tribunais (TJBA, TRFs, TRTs etc.) — Fase 2 em diante.
Alerta automático ("me notifique quando aparecer publicação com o termo X") — Fase 3.
Filtragem por classe processual estruturada (não extraída do texto livre do DJE) — Fase 2.
Exportação em Excel (XLSX) — Fase 2.
Resumo automático com IA do texto da publicação — Fase futura.

Plano de Lançamento em Fases
MVP — Fase 1: Busca e Histórico no DJE/TJSP Capital

Indexação diária automatizada dos Cadernos 2 e 3.
Busca por palavra-chave com período livre.
Card de resultado com número CNJ, instância, vara, data e snippet.
Histórico de buscas DJE por usuário.
Exportação CSV.
Aviso de cobertura (Capital apenas, Cadernos 2 e 3).

Critério de avanço para Fase 2: indexação funcionando sem lacunas por 30 dias consecutivos; pelo menos 3 advogados usando a busca semanalmente; feedback coletado sobre quais filtros adicionais fariam diferença.

Fase 2: Cobertura Ampliada e Filtros Avançados

Cadernos 4/I, 4/II e 4/III (interior do TJSP) — com filtro por comarca.
Filtro por instância (1ª ou 2ª) na interface de busca.
Alerta por palavra-chave: o sistema envia notificação quando uma nova publicação corresponde a um termo salvo.
Exportação em Excel (XLSX).

Fase 3: Multi-Tribunal e IA

Expansão para outros tribunais (TJBA, TRFs, TRTs) — cada tribunal com seu próprio parser de DJE.
Resumo automático com IA do texto da publicação (o que foi decidido, que prazo foi designado).
Integração de fonte: resultado unificado DataJud + DJE na mesma busca, com deduplicação por número CNJ.

Métricas de Sucesso

Fase 1 (MVP):

Indexação sem lacunas: 0 dias úteis sem dados no histórico por falha do job (meta: 100% de cobertura nos primeiros 30 dias).
Busca funcional: retorno de resultados em menos de 5 segundos para qualquer combinação de termo e período disponível no índice.
Pelo menos 1 busca com resultado não vazio executada por usuário ativo por semana.
Zero exposição de dados de buscas a usuários não autenticados.

Fase 2 e além:

Taxa de reexecução: % de buscas DJE salvas reexecutadas ao menos uma vez por semana.
Taxa de exportação: % de buscas com resultado que geram ao menos uma exportação CSV.
Cobertura por tribunal: % de tribunais expandidos com indexação funcionando sem lacunas.

Riscos e Mitigações

Risco 1 — Mudança de formato do PDF do TJSP O TJSP pode alterar o layout dos cadernos sem aviso prévio, quebrando o parser e causando falha silenciosa na indexação.
Mitigação: monitoramento ativo do job diário com alerta de falha ao operador; validação de sanidade (total de processos extraídos muito abaixo da média indica problema de parsing).

Risco 2 — Indisponibilidade do portal do TJSP O site do TJSP pode estar fora do ar ou bloquear downloads automatizados.
Mitigação: retries com backoff; janela de tentativa ampla (20h–6h); registro de lacunas no histórico para reprocessamento manual se necessário.

Risco 3 — Volume de dados acima do esperado Os cadernos 2 e 3 do TJSP têm volume expressivo — o banco de dados cresce continuamente sem política de retenção.
Mitigação: definir política de retenção antes do lançamento (sugestão: manter 24 meses e avaliar com dados reais de uso); arquivar dados mais antigos se necessário.

Risco 4 — Expectativa de cobertura nacional Advogados podem assumir que a busca no DJE cobre todos os tribunais, não só o TJSP Capital.
Mitigação: aviso permanente e visível na interface indicando a cobertura exata (TJSP — Cadernos 2 e 3, Capital); não usar linguagem genérica como "DJE nacional" na interface.

Risco 5 — Concorrência com JusBrasil e Escavador JusBrasil e Escavador já fazem monitoramento de DJE por nome/OAB — produto consolidado com base instalada.
Mitigação: o JurisRadar não compete no monitoramento pessoal (fora do escopo); o diferencial é a descoberta por assunto/área de atuação para prospecção, não vigilância. São casos de uso complementares, não substitutos.

Risco 6 — LGPD e textos com dados pessoais Os textos das publicações contêm nomes de partes e CPFs.
Mitigação: publicações do DJE são públicas por imperativo legal (publicidade processual, art. 5º, LX, CF/88 e Lei 11.419/06); o sistema não enriquece esses dados nem os usa para finalidade diversa da busca e exibição ao usuário autenticado.

Architecture Decision Records

ADR-001: Estratégia de Indexação — Batch Diário com Histórico Persistido — Adoção de job diário automatizado que baixa e indexa os cadernos do DJE em banco de dados, permitindo busca com período livre sobre histórico acumulado; alternativas de fetch sob demanda e janela fixa de 7 dias foram rejeitadas.

Questões em Aberto

Política de retenção de dados: por quanto tempo manter o histórico de publicações indexadas? 12 meses? 24 meses? Indefinidamente? A resposta impacta custo de armazenamento e proposta de valor para advogados que querem buscar casos antigos.
Snippet vs. texto completo na interface: o card deve mostrar um trecho (snippet com o termo destacado) ou o texto integral do ato? Usuário indicou que quer ver instância e vara — a extensão do texto exibido ainda não foi decidida.
Primeiro dia de histórico: o sistema deve fazer backfill de dados históricos antes do lançamento? Se sim, quantos meses retroativos? O TJSP disponibiliza cadernos desde 01/10/2007.
Caderno 1 (Administrativo): há interesse em indexar também publicações administrativas do TJSP (editais, licitações, nomeações) futuramente?
Notificações na Fase 2: qual canal de alerta para o monitoramento por palavra-chave — e-mail, notificação in-app ou webhook? A definir antes do TechSpec da Fase 2.
