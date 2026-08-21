<task>
Correção de bugs críticos e melhorias gerais do JurisRadar
</task>

<goal>
Corrigir os bugs que impedem o uso correto das principais funcionalidades do JurisRadar — onboarding, calendário, CRM, sincronização OAB e busca DJEN — e introduzir melhorias de usabilidade e performance para elevar a qualidade geral do produto. O objetivo é garantir que todas as rotas críticas funcionem de ponta a ponta sem erros e que o usuário consiga operar o sistema de forma fluida e confiável.
</goal>

<requirements>
Negocio:
- Corrigir o bug no onboarding em que a animação/slide de apresentação do produto trava e não avança para a próxima etapa.
- Corrigir o erro "Erro interno" exibido ao tentar criar um novo evento no calendário processual.
- Corrigir os filtros do CRM que não estão aplicando os critérios de filtragem nos processos exibidos.
- Corrigir a ordenação de linhas no CRM que não está funcionando ao clicar nos cabeçalhos da tabela.
- Após a sincronização com a OAB, os processos importados devem aparecer automaticamente no dashboard sem necessidade de recarregar a página manualmente.
- Adicionar botão manual de sincronização OAB visível na interface para que o usuário possa acionar o sync quando quiser.
- Implementar agendamento automático de sincronização OAB a cada 5 horas.
- Adicionar botão "Ver no DJEN" no CRM de cada processo, abrindo a busca do DJEN Nacional com o número do processo pré-preenchido.
- Corrigir a busca do DJEN Nacional para que os resultados retornem apenas publicações cujo corpo do texto contenha o termo informado no campo "Busca principal" (ex.: "capão redondo" não deve retornar publicações de Guarujá onde o termo não aparece no texto).

Arquitetura:
- O bug do onboarding deve ser investigado no componente de apresentação/slides e corrigido no frontend.
- O erro de criação de evento no calendário deve ser rastreado na rota de API correspondente e corrigido no backend e/ou frontend.
- Os filtros e a ordenação do CRM devem ser corrigidos na lógica de filtragem/ordenação da tabela no frontend e, se necessário, nos parâmetros enviados ao backend.
- O carregamento automático dos processos após o sync OAB deve ser corrigido no fluxo de retorno da sincronização (callback, revalidação de cache ou re-fetch).
- O botão de sync manual deve acionar a mesma rota de sincronização OAB já existente.
- O agendamento automático a cada 5 horas deve ser implementado via job/cron (Inngest ou equivalente já em uso no projeto).
- A correção da busca DJEN deve garantir filtro obrigatório (AND) entre o termo principal e o conteúdo do texto da publicação — verificar se a query enviada à API do DJEN está usando o campo correto de full-text search.
- Investigar e aplicar melhorias de performance no carregamento de rotas (lazy loading, prefetch, cache de dados, redução de waterfalls de requisição).

UI/UX:
- O botão de sync OAB deve indicar visualmente quando está em andamento (loading state) e exibir a data/hora do último sync realizado.
- O botão "Ver no DJEN" no CRM deve abrir em nova aba com o número do processo pré-preenchido na busca do DJEN Nacional.
- Os filtros e a ordenação do CRM devem ter feedback visual imediato (ex.: indicador de coluna ordenada, chips de filtros ativos).
- Em caso de erro na criação de evento no calendário, exibir mensagem descritiva e não apenas "Erro interno".
- A busca DJEN deve exibir badge ou aviso quando nenhuma publicação do resultado contiver o termo buscado no corpo, orientando o usuário a refinar a busca.
</requirements>

<acceptance_criteria>
- Dado que o usuário está no onboarding, quando clicar em "Próximo", então o slide deve avançar sem travar.
- Dado que o usuário preenche título e data no formulário de novo evento do calendário, quando clicar em "Salvar", então o evento deve ser criado sem exibir "Erro interno".
- Dado que o usuário aplica um filtro no CRM, quando confirmar o filtro, então apenas os processos que atendem ao critério devem aparecer na tabela.
- Dado que o usuário clica no cabeçalho de uma coluna no CRM, quando clicar uma ou duas vezes, então a tabela deve ser ordenada em ordem crescente/decrescente pela coluna selecionada.
- Dado que a sincronização OAB é concluída, quando os novos processos forem importados, então eles devem aparecer automaticamente no dashboard sem necessidade de recarregar a página.
- Dado que o usuário clica no botão de sync manual OAB, quando a sincronização terminar, então a data/hora do último sync deve ser atualizada na interface.
- Dado que o agendamento automático está ativo, quando passarem 5 horas desde o último sync, então o sistema deve acionar a sincronização OAB automaticamente.
- Dado que o usuário visualiza um processo no CRM, quando clicar em "Ver no DJEN", então o navegador deve abrir nova aba com a busca DJEN Nacional pré-preenchida com o número do processo.
- Dado que o usuário busca "capão redondo" no DJEN Nacional, quando os resultados forem carregados, então todas as publicações exibidas devem conter o termo "capão redondo" no corpo do texto.
- Dado que o usuário navega entre rotas do sistema, quando trocar de página, então o carregamento deve ser perceptivelmente mais rápido do que antes das melhorias de performance.
</acceptance_criteria>

<constraints>
- FAÇA: investigar cada bug isoladamente antes de corrigir, identificando a causa raiz (não apenas o sintoma).
- FAÇA: usar o mecanismo de agendamento já em uso no projeto (Inngest ou equivalente) para o cron de sync OAB a cada 5 horas.
- FAÇA: garantir que o filtro da busca DJEN use AND entre o termo principal e o campo de full-text do corpo da publicação.
- FAÇA: abrir o link do DJEN em nova aba (_blank) para não interromper o fluxo do usuário no CRM.
- NÃO FAÇA: reescrever componentes inteiros para corrigir bugs pontuais — preferir correções cirúrgicas.
- NÃO FAÇA: alterar o contrato de APIs externas do DJEN; apenas corrigir os parâmetros enviados.
- NUNCA: deixar "Erro interno" como mensagem final ao usuário sem descrição do problema.
</constraints>
