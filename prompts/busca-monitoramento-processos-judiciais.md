<task>
Busca e monitoramento de processos judiciais
</task>

<goal>
Permitir que advogados e escritórios de advocacia localizem processos judiciais em andamento com base em filtros definidos pelo usuário (assunto, classe processual, tribunal/estado, comarca, instância, período), automatizando o que hoje é feito manualmente nos portais dos tribunais. O sistema é multi-usuário com autenticação, e entrega como resultado a lista de processos que atendem aos critérios — com número CNJ como dado essencial e metadados complementares quando disponíveis. O usuário pode salvar buscas, reexecutá-las e exportar os resultados. A arquitetura deve estar preparada para evoluir ao monitoramento periódico automático com notificações.
</goal>

<requirements>
Negocio:
- Sistema multi-usuário com autenticação; cada usuário acessa apenas seu próprio histórico e buscas salvas.
- Público-alvo: advogados e escritórios de advocacia.
- O usuário define filtros de busca: assunto/classe processual, tribunal/estado, comarca, instância (grau), período (data inicial e final) e campo de busca livre.
- A estrutura de filtros deve ser extensível para adicionar novos critérios no futuro sem retrabalho de interface.
- O sistema retorna lista paginada de processos que atendem aos filtros. Dado obrigatório por processo: número CNJ. Dados complementares quando disponíveis: classe/assunto, tribunal/vara, data de distribuição, partes (autor/réu), status e última movimentação.
- O usuário pode salvar uma busca e reexecutá-la a qualquer momento.
- O histórico de buscas é acessível por usuário autenticado.
- Os resultados de uma busca podem ser exportados em CSV e Excel.
- Antes de implementar a integração com a fonte de dados, deve ser entregue um comparativo fundamentado entre: (a) API DataJud do CNJ como fonte primária estruturada, (b) scraping dos sistemas dos tribunais (ex.: e-SAJ TJSP), e (c) combinação das duas abordagens. O comparativo deve cobrir autenticação/acesso, limites de requisição, campos disponíveis, estabilidade, riscos legais/éticos e manutenção a médio prazo, com recomendação justificada antes da implementação.
- Monitoramento periódico de buscas salvas (rodar busca automaticamente e notificar sobre processos novos) é requisito futuro: não implementar agora, mas a arquitetura deve prever esse caminho.

Arquitetura:
- Frontend: Next.js com TypeScript.
- Backend: Python com FastAPI.
- O backend é responsável por toda integração com a fonte de dados externa (DataJud ou scraping); o frontend consome apenas endpoints do backend.
- Organização em camadas: rotas/controllers, serviços de integração com fonte externa, camada de persistência.
- Tratamento de rate limiting e retries na integração com a fonte de dados.
- Cache de resultados para evitar requisições repetidas desnecessárias ao mesmo conjunto de filtros.
- Tratamento de erros claro: fonte indisponível, filtro sem resultados, timeout.
- A camada de persistência deve salvar buscas (filtros + timestamp + usuário) e referenciar resultados de forma a suportar futura execução periódica agendada.
- LGPD: aplicar minimização de dados — não armazenar dados pessoais de partes além do necessário para exibição; dados sensíveis não devem ser persistidos desnecessariamente.

UI/UX:
- Painel de filtros com campos para assunto/classe processual, estado/tribunal, comarca, instância (grau), período (data inicial/final) e campo de busca livre.
- A adição de novos filtros deve ser possível sem alterar a estrutura central da interface.
- Lista de resultados paginada exibindo os campos disponíveis por processo.
- Área de histórico de buscas do usuário com opção de reexecutar qualquer busca salva.
- Botão de exportação (CSV / Excel) disponível quando houver resultados.
- Feedback de estado: carregamento, sem resultados, erro de integração com fonte externa.
- Usuários não autenticados não devem acessar nenhuma tela de busca ou resultado.
</requirements>

<api_contracts>
APIs externas (candidatas — a confirmar após comparativo):

- DataJud API (CNJ): API pública do Conselho Nacional de Justiça para consulta de metadados processuais. Suporta filtros por classe, assunto, tribunal (sigla), grau e período de distribuição. Autenticação por chave de API pública. Campos esperados: número do processo (CNJ), classe, assunto, tribunal, grau, data de distribuição, partes, órgão julgador, última movimentação. Limites de requisição e disponibilidade a levantar no comparativo.
- Scraping de portais dos tribunais (ex.: e-SAJ TJSP): avaliação de viabilidade, presença de captcha/anti-bot e riscos legais a detalhar no comparativo antes de qualquer implementação.

APIs de backend (mínimas para o MVP):

- POST /auth/login — autenticar usuário; retorna token de sessão.
- GET /buscar-processos?{filtros}&pagina={n}&por_pagina={n} — executar busca com filtros e retornar lista paginada de processos. Resposta de sucesso: JSON com total, pagina, processos[]. Erros: 400 filtros inválidos, 503 fonte de dados indisponível.
- GET /historico — listar buscas salvas do usuário autenticado, ordenadas por data.
- POST /buscas-salvas — salvar os filtros de uma busca para reexecução futura.
- GET /buscas-salvas/{id}/reexecutar — reexecutar uma busca salva com os filtros originais.
- GET /exportar/{busca_id}?formato={csv|excel} — exportar resultados de uma busca em CSV ou Excel.
</api_contracts>

<acceptance_criteria>
- Dado que o usuário não está autenticado, quando tentar acessar qualquer tela do sistema, então é redirecionado para a tela de login.
- Dado que o usuário está autenticado e preenche ao menos um filtro válido, quando submeter a busca, então o sistema retorna lista paginada de processos com número CNJ em até tempo razoável, com indicador de carregamento durante a consulta.
- Dado que os resultados foram carregados, quando o usuário navegar pelas páginas, então a paginação funciona sem perder os filtros ativos.
- Dado que há resultados exibidos, quando o usuário clicar em exportar, então recebe arquivo CSV ou Excel com os dados dos processos listados.
- Dado que o usuário realiza uma busca, quando salvar os filtros, então a busca aparece no histórico e pode ser reexecutada com os mesmos critérios.
- Dado que cada usuário está autenticado, quando acessar o histórico, então vê apenas as suas próprias buscas salvas.
- Dado que a fonte de dados está indisponível ou retorna erro, quando o usuário buscar, então o sistema exibe mensagem de erro clara sem dados parciais incorretos.
- Dado que nenhum processo atende aos filtros informados, quando a busca retornar, então o sistema exibe estado de "sem resultados" em vez de lista vazia sem indicação.
- Dado que o comparativo de fontes de dados foi entregue, quando a implementação da integração iniciar, então a fonte escolhida deve estar documentada com justificativa registrada.
</acceptance_criteria>

<constraints>
- FAÇA: entregar o comparativo de fontes de dados (DataJud vs. scraping vs. combinação) com recomendação justificada antes de escrever qualquer código de integração.
- FAÇA: organizar o backend em camadas (rotas, serviços, persistência) para facilitar troca ou adição de fontes de dados.
- FAÇA: aplicar princípios LGPD de minimização — armazenar apenas os dados de partes estritamente necessários para exibição e não persistir dados sensíveis além disso.
- FAÇA: implementar tratamento de rate limiting, retries com backoff e cache de resultados no backend.
- FAÇA: preparar a camada de persistência para suportar execução periódica agendada de buscas salvas no futuro (sem implementar o scheduler agora).
- FAÇA: bloquear acesso a qualquer recurso do sistema para usuários não autenticados.
- NÃO FAÇA: expor chamadas à fonte de dados externa diretamente pelo frontend.
- NÃO FAÇA: implementar o monitoramento periódico ou notificações nesta etapa.
- NÃO FAÇA: armazenar dados pessoais de partes de processos além do retornado pela consulta e exibido ao usuário.
- NUNCA: exibir dados de processos ou partes para sessões não autenticadas.
</constraints>
