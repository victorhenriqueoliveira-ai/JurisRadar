# Contexto — task_03

## Requisitos do PRD (relevantes)
- Zero "Erro interno" genérico: toda falha exibida ao usuário deve ter mensagem descritiva e acionável.
- Ao criar um novo evento, o formulário retorna "Erro interno" após clicar em "Salvar" — bug P0.
- Em caso de erro, a mensagem deve dizer exatamente o que está errado e o formulário deve manter os dados preenchidos.

## Especificação Técnica (relevante)

### Mapeamento de erros — POST /api/calendario/eventos
| Situação | Status | Mensagem |
|----------|--------|----------|
| título vazio | 400 | "O título do evento é obrigatório." |
| data inválida | 400 | "A data informada é inválida. Use o formato DD/MM/AAAA." |
| org não encontrada | 403 | "Sessão inválida. Faça login novamente." |
| erro de banco | 500 | "Não foi possível salvar o evento. Tente novamente." |

### Regras
- Logar erro real com `console.error('[calendario/eventos POST]', error)` antes de retornar 500
- NÃO expor stack trace ou detalhes do banco na resposta HTTP
- Retornar 201 com evento criado em caso de sucesso

### Arquivo alvo
`src/app/api/calendario/eventos/route.ts` — handler POST, try-catch genérico na linha ~71

### Schema relevante (eventosAgenda)
Campos: `id uuid`, `orgId uuid FK`, `titulo text NOT NULL`, `data date NOT NULL`, `horaInicio text`, `horaFim text`, `tipo text DEFAULT 'pessoal'`

## Estado de dependências
Nenhuma dependência. Esta é uma task da Onda 1.
