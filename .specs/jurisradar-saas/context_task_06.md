# Contexto — task_06

## Dependências integradas

- **task_03 ✅:** Dados de usuário disponíveis via `auth()` (nome, email, orgId). `src/lib/errors.ts` criado.

## Requisitos

Setup Resend como provedor de email transacional. 3 templates React Email. Função `sendEmail` encapsulada. NUNCA chamar Resend diretamente de Route Handlers.

## Especificação Técnica (TechSpec — Integration Points Resend + ADR-006)

### Variáveis de ambiente
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@jurisradar.com.br
```

### `src/lib/email/resend.ts`
```typescript
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY)
```

### `src/lib/email/send.ts`
```typescript
import { resend } from './resend'
import { render } from '@react-email/render'

interface SendEmailOptions {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const html = await render(react)
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html,
  })
}
```

### Templates (em `src/lib/email/templates/`)

**WelcomeOnboarding.tsx**
Props: `{ name: string, appUrl: string }`
Conteúdo: boas-vindas ao JurisRadar, nome do usuário, botão "Acessar o app".
Usar componentes: `<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Heading>`, `<Text>`, `<Button>` do `@react-email/components`.
Cores: usar literais baseados nos tokens (não CSS variables — email não suporta):
- Primary: #0f2d5e
- Accent: #c9a84c

**ConviteMembro.tsx**
Props: `{ escritorioNome: string, papel: string, inviteUrl: string, convidadoPor: string }`
Conteúdo: convite para o escritório, papel definido, link de aceitação.

**FalhaBilling.tsx**
Props: `{ orgNome: string, updateUrl: string }`
Conteúdo: alerta de falha na cobrança, link para atualizar cartão.

### `src/lib/email/templates/index.ts`
Barrel export de todos os templates + `renderToHtml` helper:
```typescript
export { WelcomeOnboarding } from './WelcomeOnboarding'
export { ConviteMembro } from './ConviteMembro'
export { FalhaBilling } from './FalhaBilling'
```

## Arquivos a criar

- `src/lib/email/resend.ts`
- `src/lib/email/send.ts`
- `src/lib/email/templates/WelcomeOnboarding.tsx`
- `src/lib/email/templates/ConviteMembro.tsx`
- `src/lib/email/templates/FalhaBilling.tsx`
- `src/lib/email/templates/index.ts`
- `docs/email-setup.md` (registros DNS para Resend)

## Instalar pacotes

```bash
pnpm add resend @react-email/components @react-email/render
```

## Notas importantes

- Templates usam cores em literal hex (não CSS variables) — email não suporta `var(--jr-*)`
- Criar `src/lib/email/theme.ts` com constantes de cor:
  ```typescript
  export const emailTheme = {
    primary: '#0f2d5e',
    accent: '#c9a84c',
    // ...
  }
  ```
- Testes: usar `render()` de `@react-email/render` para testar renderização sem envio real
- Mockar `resend.emails.send` nos testes

## Testes

Criar `src/lib/email/__tests__/templates.test.tsx`.
Meta: ≥80% cobertura.
