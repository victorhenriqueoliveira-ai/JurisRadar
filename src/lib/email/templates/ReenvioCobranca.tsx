import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import React from 'react'
import { emailTheme } from '../theme'

export interface ReenvioCobrancaProps {
  clienteNome: string
  linkBoleto?: string | null
  linkPix?: string | null
  vencimento: string
  descricao: string
}

export function ReenvioCobranca({
  clienteNome,
  linkBoleto,
  linkPix,
  vencimento,
  descricao,
}: ReenvioCobrancaProps) {
  const temBoleto = Boolean(linkBoleto)
  const temPix = Boolean(linkPix)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Lembrete de cobrança — vencimento em {vencimento}</Preview>
      <Body
        style={{
          backgroundColor: emailTheme.background,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: '0',
          padding: '0',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '40px auto',
            backgroundColor: emailTheme.background,
            borderRadius: '8px',
            border: `1px solid ${emailTheme.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: emailTheme.primary,
              padding: '32px 40px',
            }}
          >
            <Heading
              style={{
                color: emailTheme.accent,
                fontSize: '24px',
                fontWeight: '700',
                margin: '0',
                letterSpacing: '-0.5px',
              }}
            >
              JurisRadar
            </Heading>
          </div>

          {/* Alert banner */}
          <div
            style={{
              backgroundColor: '#fef9ec',
              borderTop: `3px solid ${emailTheme.accent}`,
              padding: '16px 40px',
            }}
          >
            <Text
              style={{
                color: emailTheme.text,
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0',
              }}
            >
              Lembrete de Cobrança
            </Text>
          </div>

          {/* Body */}
          <div style={{ padding: '40px' }}>
            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              Olá, <strong>{clienteNome}</strong>. Segue o lembrete de pagamento referente a:
            </Text>

            {/* Descrição da cobrança */}
            <div
              style={{
                backgroundColor: emailTheme.surface,
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '24px',
                borderLeft: `4px solid ${emailTheme.accent}`,
              }}
            >
              <Text
                style={{
                  color: emailTheme.text,
                  fontSize: '15px',
                  lineHeight: '1.5',
                  margin: '0 0 8px 0',
                }}
              >
                <strong>Descrição:</strong> {descricao}
              </Text>
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '14px',
                  margin: '0',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Vencimento:</strong> {vencimento}
              </Text>
            </div>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              Utilize um dos links abaixo para realizar o pagamento:
            </Text>

            {/* Botão Boleto */}
            {temBoleto && (
              <div style={{ marginBottom: '16px' }}>
                <Button
                  href={linkBoleto as string}
                  style={{
                    backgroundColor: emailTheme.primary,
                    color: '#ffffff',
                    padding: '14px 28px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '15px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Pagar via Boleto
                </Button>
              </div>
            )}

            {/* Botão Pix */}
            {temPix && (
              <div style={{ marginBottom: '32px' }}>
                <Button
                  href={linkPix as string}
                  style={{
                    backgroundColor: emailTheme.success,
                    color: '#ffffff',
                    padding: '14px 28px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '15px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Pagar via Pix
                </Button>
              </div>
            )}

            <Text
              style={{
                color: emailTheme.textMuted,
                fontSize: '14px',
                lineHeight: '1.6',
                marginBottom: '0',
              }}
            >
              Em caso de dúvidas, entre em contato com seu escritório de advocacia.
            </Text>
          </div>

          <Hr style={{ borderColor: emailTheme.border, margin: '0' }} />

          {/* Footer */}
          <div style={{ padding: '24px 40px' }}>
            <Text
              style={{
                color: emailTheme.textMuted,
                fontSize: '13px',
                lineHeight: '1.5',
                margin: '0',
              }}
            >
              Este e-mail foi enviado pelo seu escritório de advocacia através da plataforma
              JurisRadar. Por favor, não responda a este e-mail.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default ReenvioCobranca
