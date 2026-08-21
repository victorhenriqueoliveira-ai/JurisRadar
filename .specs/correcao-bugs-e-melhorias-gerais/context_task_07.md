# Contexto — task_07

## Requisitos do PRD (relevantes)
- Adicionar botão ou link "Ver no DJEN" em cada linha ou card de processo no CRM.
- Ao clicar, abrir nova aba com a busca do DJEN Nacional pré-preenchida com o número do processo.
- O link deve funcionar para qualquer processo, independentemente do tribunal de origem.

## Especificação Técnica (relevante)

### Arquivo a modificar
`src/components/crm/ProcessoTable.tsx` — adicionar coluna ou ícone por linha.
Verificar também `src/components/crm/ProcessoCard.tsx`.

### URL do link
```
target: _blank, rel="noopener noreferrer"
URL base: variável NEXT_PUBLIC_DJEN_PORTAL_URL (adicionar ao .env.local e .env.example)
Formato: ${NEXT_PUBLIC_DJEN_PORTAL_URL}?numero={numeroCNJ}
Fallback: usar URL padrão se variável não definida
```

### Regras
- `target="_blank" rel="noopener noreferrer"` obrigatório
- NÃO bloquear fluxo do usuário no CRM
- Verificar e documentar URL exata do portal DJEN Nacional antes de implementar
- Parametrizar via `NEXT_PUBLIC_DJEN_PORTAL_URL`

## Estado de dependências
Nenhuma dependência. Onda 1B.
