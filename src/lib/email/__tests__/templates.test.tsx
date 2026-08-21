import React from 'react'
import { render } from '@react-email/render'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WelcomeOnboarding } from '../templates/WelcomeOnboarding'
import { ConviteMembro } from '../templates/ConviteMembro'
import { FalhaBilling } from '../templates/FalhaBilling'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../resend', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderToHtml(element: React.ReactElement): Promise<string> {
  return render(element)
}

// ---------------------------------------------------------------------------
// WelcomeOnboarding
// ---------------------------------------------------------------------------

describe('WelcomeOnboarding', () => {
  it('renderiza sem erros', async () => {
    const html = await renderToHtml(
      <WelcomeOnboarding name="João" appUrl="https://app.jurisradar.com.br" />,
    )
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o nome do usuário', async () => {
    const html = await renderToHtml(
      <WelcomeOnboarding name="João" appUrl="https://app.jurisradar.com.br" />,
    )
    expect(html).toContain('João')
  })

  it('contém o link do app', async () => {
    const appUrl = 'https://app.jurisradar.com.br'
    const html = await renderToHtml(<WelcomeOnboarding name="Maria" appUrl={appUrl} />)
    expect(html).toContain(appUrl)
  })

  it('contém o texto de boas-vindas ao JurisRadar', async () => {
    const html = await renderToHtml(
      <WelcomeOnboarding name="Pedro" appUrl="https://app.jurisradar.com.br" />,
    )
    expect(html).toContain('JurisRadar')
  })

  it('contém o texto do botão de acesso', async () => {
    const html = await renderToHtml(
      <WelcomeOnboarding name="Ana" appUrl="https://app.jurisradar.com.br" />,
    )
    expect(html).toContain('Acessar o app')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(
      <WelcomeOnboarding name="Lucas" appUrl="https://app.jurisradar.com.br" />,
    )
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// ConviteMembro
// ---------------------------------------------------------------------------

describe('ConviteMembro', () => {
  const defaultProps = {
    escritorioNome: 'Silva & Associados',
    papel: 'associado',
    inviteUrl: 'https://app.jurisradar.com.br/invite/abc123',
    convidadoPor: 'Dr. Carlos Silva',
  }

  it('renderiza sem erros', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o nome do escritório', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    // O React Email escapa '&' para '&amp;' no HTML gerado
    expect(html).toContain('Silva &amp; Associados')
  })

  it('contém o papel do membro', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    // Papel é capitalizado pelo template
    expect(html).toContain('Associado')
  })

  it('contém o link de convite', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    expect(html).toContain('https://app.jurisradar.com.br/invite/abc123')
  })

  it('contém o nome de quem convidou', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    expect(html).toContain('Dr. Carlos Silva')
  })

  it('contém o texto do botão de aceite', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    expect(html).toContain('Aceitar convite')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(<ConviteMembro {...defaultProps} />)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// FalhaBilling
// ---------------------------------------------------------------------------

describe('FalhaBilling', () => {
  const defaultProps = {
    orgNome: 'Escritório Machado Advogados',
    updateUrl: 'https://app.jurisradar.com.br/billing/update',
  }

  it('renderiza sem erros', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o nome da organização', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toContain('Escritório Machado Advogados')
  })

  it('contém o link de atualização de cartão', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toContain('https://app.jurisradar.com.br/billing/update')
  })

  it('contém texto de alerta de cobrança', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toContain('cobrança')
  })

  it('contém o texto do botão de atualização', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toContain('Atualizar dados de pagamento')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(<FalhaBilling {...defaultProps} />)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// sendEmail — erro tipado com API key inválida
// ---------------------------------------------------------------------------

describe('sendEmail', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('lança EmailSendError quando Resend retorna erro', async () => {
    const { resend } = await import('../resend')
    const { sendEmail, EmailSendError } = await import('../send')

    vi.mocked(resend.emails.send).mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'API key inválida' },
    } as Awaited<ReturnType<typeof resend.emails.send>>)

    process.env.RESEND_FROM_EMAIL = 'noreply@jurisradar.com.br'

    await expect(
      sendEmail({
        to: 'teste@example.com',
        subject: 'Teste',
        react: <WelcomeOnboarding name="Teste" appUrl="https://app.jurisradar.com.br" />,
      }),
    ).rejects.toThrow(EmailSendError)
  })

  it('lança EmailSendError quando RESEND_FROM_EMAIL não está configurado', async () => {
    const originalFromEmail = process.env.RESEND_FROM_EMAIL
    delete process.env.RESEND_FROM_EMAIL

    const { sendEmail, EmailSendError } = await import('../send')

    await expect(
      sendEmail({
        to: 'teste@example.com',
        subject: 'Teste',
        react: <WelcomeOnboarding name="Teste" appUrl="https://app.jurisradar.com.br" />,
      }),
    ).rejects.toThrow(EmailSendError)

    process.env.RESEND_FROM_EMAIL = originalFromEmail
  })

  it('retorna { id } quando envio é bem-sucedido', async () => {
    const { resend } = await import('../resend')
    const { sendEmail } = await import('../send')

    vi.mocked(resend.emails.send).mockResolvedValueOnce({
      data: { id: 'email-id-123' },
      error: null,
    } as Awaited<ReturnType<typeof resend.emails.send>>)

    process.env.RESEND_FROM_EMAIL = 'noreply@jurisradar.com.br'

    const result = await sendEmail({
      to: 'destinatario@example.com',
      subject: 'Bem-vindo',
      react: <WelcomeOnboarding name="Ana" appUrl="https://app.jurisradar.com.br" />,
    })

    expect(result).toEqual({ id: 'email-id-123' })
  })
})
