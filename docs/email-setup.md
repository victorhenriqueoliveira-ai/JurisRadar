# Configuração de E-mail — Resend

Este documento descreve os registros DNS necessários para verificar o domínio de envio no Resend e garantir entregabilidade dos e-mails transacionais do JurisRadar.

## Domínio de Envio

- **Domínio:** `jurisradar.com.br`
- **Endereço de envio:** `noreply@jurisradar.com.br`

## Variáveis de Ambiente

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@jurisradar.com.br
```

## Registros DNS Necessários

Adicione os seguintes registros no painel DNS do seu provedor (ex: Cloudflare, Route53, Registro.br):

### SPF — Sender Policy Framework

Autoriza os servidores do Resend a enviar e-mails em nome do domínio.

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | `@` | `v=spf1 include:amazonses.com ~all` | 3600 |

> O Resend usa a infraestrutura da AWS SES. O registro SPF deve incluir `amazonses.com`.

### DKIM — DomainKeys Identified Mail

Assina criptograficamente os e-mails enviados. O Resend gera as chaves DKIM automaticamente no painel.

Após verificar o domínio no [painel do Resend](https://resend.com/domains), você receberá registros no formato:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | `resend._domainkey.jurisradar.com.br` | `v=DKIM1; k=rsa; p=<chave_publica_gerada_pelo_resend>` | 3600 |

> Substitua `<chave_publica_gerada_pelo_resend>` pelo valor exibido no painel do Resend em **Domains → jurisradar.com.br → DNS Records**.

### DMARC — Domain-based Message Authentication

Define a política para e-mails que falham na autenticação SPF/DKIM.

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@jurisradar.com.br; pct=100` | 3600 |

**Parâmetros:**
- `p=quarantine` — e-mails não autenticados vão para spam (use `p=reject` após validação)
- `rua=mailto:dmarc@jurisradar.com.br` — endereço para relatórios agregados DMARC
- `pct=100` — aplica a política a 100% das mensagens

## Registro MX (Opcional para respostas)

Se desejar receber respostas ou bounce notifications via e-mail:

| Tipo | Nome | Prioridade | Valor | TTL |
|------|------|-----------|-------|-----|
| MX | `@` | 10 | `feedback-smtp.us-east-1.amazonses.com` | 3600 |

## Passos para Verificação no Painel Resend

1. Acesse [resend.com](https://resend.com) e faça login
2. Navegue até **Domains → Add Domain**
3. Informe `jurisradar.com.br`
4. Copie os registros DNS exibidos e adicione ao seu provedor de DNS
5. Clique em **Verify DNS Records** após propagação (pode levar até 48h)
6. Após verificação, o domínio aparece como **Verified** no painel

## Propagação DNS

A propagação pode levar de alguns minutos até 48 horas dependendo do provedor e do TTL configurado. Use ferramentas como:
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) para verificar SPF e DMARC
- [DKIM Core](https://www.dkimcore.org/tools/) para verificar DKIM

## Preview Local de Templates

Para visualizar os templates React Email sem enviar e-mails reais:

```bash
pnpm email dev
```

Isso abre o servidor de preview em `http://localhost:3000` com todos os templates em `src/lib/email/templates/`.

> **Nota:** O `react-email dev` busca automaticamente arquivos `.tsx` na pasta de templates configurada.
