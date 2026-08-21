# Contexto — task_05

## Requisitos do PRD (relevantes)
- A etapa de apresentação do produto no onboarding trava porque a chamada síncrona à API bloqueia a UI.
- A chamada de importação deve ser desacoplada da navegação entre passos.
- O usuário deve conseguir avançar independentemente do status da importação.
- Exibir feedback de progresso sem bloquear o botão "Próximo".

## Especificação Técnica (relevante)

### Arquivo a modificar
`src/components/onboarding/Passo2Importacao.tsx`

### Fluxo atual (problemático)
1. PATCH `/api/users/me` — await (correto)
2. POST `/api/processos/sync-djen` — await bloqueante até 30s
3. Exibe total de processos e libera "Próximo"

### Fluxo corrigido
1. PATCH `/api/users/me` — await (manter)
2. `fetch('/api/processos/sync', { method: 'POST' })` — fire-and-forget, SEM await
3. Avançar imediatamente para estado `done` com mensagem "Importação iniciada em segundo plano"

### Rota assíncrona disponível
`POST /api/processos/sync` — emite evento Inngest e retorna 202 imediatamente. Já existe no projeto.

### Regras
- NÃO chamar `/api/processos/sync-djen` durante o onboarding (rota bloqueante)
- Botão "Próximo" deve ficar disponível em < 2s após clicar em importar
- Botão "Pular" deve continuar funcional como fallback
- Se o PATCH `/api/users/me` falhar, NÃO disparar o sync e exibir erro ao usuário

## Estado de dependências
Nenhuma dependência. Esta é uma task da Onda 1.
