# Contexto — task_11

## Requisitos do PRD (relevantes)
- Sincronização OAB deve rodar automaticamente a cada 5 horas.
- Atualmente roda diariamente às 6h UTC (`0 6 * * *`).

## Especificação Técnica (relevante)

### Arquivo a modificar
`src/inngest/sync-processos-scheduler.ts`

### Mudança cirúrgica
Linha ~23: alterar string cron de `'0 6 * * *'` para `'0 */5 * * *'`

A expressão `0 */5 * * *` roda a cada 5 horas (às 0h, 5h, 10h, 15h, 20h UTC).

### NÃO alterar
- Lógica de fan-out por advogado
- Filtro de subscriptions ('trialing', 'active')
- Emissão de eventos `processos/sync.requested`
- Worker `sync-processos-worker.ts` (não tocar)
- Rate limiting existente

### Adicionar
Comentário explicativo sobre o intervalo e por que 5h.

## Estado de dependências
Nenhuma dependência. Onda 1B.
