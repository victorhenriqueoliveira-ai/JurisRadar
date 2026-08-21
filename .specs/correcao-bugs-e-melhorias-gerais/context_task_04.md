# Contexto — task_04

## Requisitos do PRD (relevantes)
- A busca DJEN Nacional deve retornar apenas publicações cujo corpo do texto contenha o termo informado.
- Exemplo do bug: buscar "capão redondo" retorna publicações de Guarujá onde o termo não aparece no texto.
- Exibir aviso quando nenhum resultado contiver o termo no corpo, orientando o usuário a refinar a busca.

## Especificação Técnica (relevante)

### Rota a modificar
`src/app/api/djen/searches/route.ts`

A rota chama `https://comunicaapi.pje.jus.br/api/v1/comunicacao` com parâmetro `texto` e passa o response direto ao frontend. A pós-filtragem deve ser inserida entre o `fetch` e o `NextResponse.json()`.

### Lógica de pós-filtragem
```typescript
// Após receber response da API PJe:
if (texto) {
  const term = texto.toLowerCase();
  const originalCount = data.items.length;
  data.items = data.items.filter(item =>
    item.texto?.toLowerCase().includes(term) ?? false
  );
  // Logar: { originalCount, filteredCount: data.items.length, term }
}
```

### Response enriquecido
Adicionar ao response:
- `filteredByTerm: boolean` — true quando filtragem foi aplicada
- `originalTotal: number` — count antes da filtragem

### Regras
- Filtragem SOMENTE quando `q` ou `texto` estiver preenchido
- `item.texto === null` → excluir o item (não contém o termo)
- NÃO alterar parâmetros enviados à API PJe externa
- Logar `{ originalCount, filteredCount, term }` em cada request com filtragem ativa

## Estado de dependências
Nenhuma dependência. Esta é uma task da Onda 1.
