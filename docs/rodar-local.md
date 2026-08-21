# Como rodar o JurisRadar localmente

## Status atual do seu .env.local

| Variável | Status |
|----------|--------|
| `DATABASE_URL` | ✅ Configurado (Neon) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | ✅ Configurado |
| `AUTH_URL` / `NEXTAUTH_URL` | ✅ Configurado |
| `DATAJUD_API_KEY` | ✅ Configurado |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | ✅ Modo dev local |
| `NEXT_PUBLIC_APP_URL` | ❌ Faltando |
| `RESEND_API_KEY` | ❌ Faltando |
| `RESEND_FROM_EMAIL` | ❌ Faltando |
| `STRIPE_SECRET_KEY` | ❌ Faltando |
| `STRIPE_WEBHOOK_SECRET` | ❌ Faltando |
| `STRIPE_PRICE_MONTHLY` | ❌ Faltando |
| `STRIPE_PRICE_ANNUAL` | ❌ Faltando |

---

## O que fazer agora (em ordem)

### 1. Adicionar as variáveis faltando no `.env.local`

Adicione ao final do arquivo `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

As demais (Stripe e Resend) você pode deixar com valores falsos por enquanto para o app subir — só as funcionalidades de cobrança e e-mail vão falhar silenciosamente. Se quiser testar tudo, veja os passos 4 e 5.

---

### 2. Rodar as migrations do banco

```bash
pnpm db:migrate
```

Isso cria todas as tabelas no Neon. Precisa rodar uma vez (ou quando houver migration nova).

---

### 3. Criar o usuário de teste

```bash
pnpm db:seed
```

Cria o usuário admin com as credenciais do seu `.env.local`:
- **Email:** admin@jurisradar.com.br
- **Senha:** JurisRadar@2026

---

### 4. Subir o app

Em um terminal:

```bash
pnpm dev
```

Acesse: **http://localhost:3000**

> O app vai redirecionar para `/login`. Entre com as credenciais do seed.
> Se o usuário não tiver `orgId`, vai cair no onboarding antes de ver o app.

---

### 5. Subir o Inngest (jobs em background)

Em outro terminal:

```bash
npx inngest-cli@latest dev
```

Acesse o painel do Inngest: **http://localhost:8288**

Lá você vê os jobs (sync de processos, notificações, alertas de prazo) rodando em tempo real. O `.env.local` já está configurado para apontar para este servidor local (`INNGEST_BASE_URL=http://localhost:8288`).

---

### 6. (Opcional) Configurar Stripe para testar billing

**6.1 — Criar conta em https://stripe.com** (gratuito, modo teste)

**6.2 — Pegar as chaves de teste** em Dashboard > Developers > API Keys:
```env
STRIPE_SECRET_KEY=sk_test_...
```

**6.3 — Criar dois produtos** em Dashboard > Product Catalog:
- Produto "Mensal" → R$ 157/mês → copiar o `price_...` → `STRIPE_PRICE_MONTHLY`
- Produto "Anual" → R$ 127/mês (cobrado anual = R$ 1.524) → `STRIPE_PRICE_ANNUAL`

**6.4 — Instalar o Stripe CLI** e escutar webhooks:
```bash
# Instalar (macOS)
brew install stripe/stripe-cli/stripe

# Fazer login
stripe login

# Escutar e encaminhar para o app
stripe listen --forward-to localhost:3000/api/billing/webhook
```

O terminal mostra o `whsec_...` — copie para `STRIPE_WEBHOOK_SECRET`.

---

### 7. (Opcional) Configurar Resend para testar e-mails

**7.1 — Criar conta em https://resend.com** (3.000 e-mails/mês grátis)

**7.2 — Criar API Key** em Dashboard > API Keys:
```env
RESEND_API_KEY=re_...
```

**7.3 — Para ambiente de teste**, pode usar o domínio de sandbox do Resend:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## Resumo rápido (só o essencial para subir)

```bash
# 1. Adicionar no .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local

# 2. Migrations
pnpm db:migrate

# 3. Seed
pnpm db:seed

# 4. App (terminal 1)
pnpm dev

# 5. Inngest (terminal 2)
npx inngest-cli@latest dev
```

Login: **admin@jurisradar.com.br** / **JurisRadar@2026**

---

## Rotas principais para testar

| Rota | O que é |
|------|---------|
| `/login` | Tela de login |
| `/onboarding` | Wizard de setup do escritório |
| `/dashboard` | KPIs, gráficos, prazos |
| `/crm` | Lista de processos, filtros, painel lateral |
| `/busca` | Busca DataJud / DJE / PJe |
| `/calendario` | Calendário processual + export iCal |
| `/notificacoes` | Painel de notificações |
| `/financeiro` | Honorários e pagamentos |
| `/configuracoes/escritorio` | Gestão de membros e escritório |
| `/billing` | Planos e assinatura |
| `http://localhost:8288` | Painel Inngest (jobs) |
