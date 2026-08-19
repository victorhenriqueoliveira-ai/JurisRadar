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

export interface FalhaBillingProps {
  orgNome: string
  updateUrl: string
}

export function FalhaBilling({ orgNome, updateUrl }: FalhaBillingProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Atenção: falha na cobrança da assinatura de {orgNome}. Atualize seu cartão.</Preview>
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
              backgroundColor: '#fef2f2',
              borderTop: `3px solid ${emailTheme.danger}`,
              padding: '16px 40px',
            }}
          >
            <Text
              style={{
                color: emailTheme.danger,
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0',
              }}
            >
              Alerta de cobrança
            </Text>
          </div>

          {/* Body */}
          <div style={{ padding: '40px' }}>
            <Heading
              as="h2"
              style={{
                color: emailTheme.text,
                fontSize: '20px',
                fontWeight: '600',
                marginTop: '0',
                marginBottom: '16px',
              }}
            >
              Falha na renovação da assinatura
            </Heading>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              Não foi possível processar o pagamento da assinatura de{' '}
              <strong>{orgNome}</strong>. Seu plano pode ser suspenso em breve se o pagamento
              não for regularizado.
            </Text>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '32px',
              }}
            >
              Para manter o acesso ao JurisRadar sem interrupções, atualize seus dados de
              pagamento clicando no botão abaixo:
            </Text>

            <Button
              href={updateUrl}
              style={{
                backgroundColor: emailTheme.danger,
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Atualizar dados de pagamento
            </Button>

            <Text
              style={{
                color: emailTheme.textMuted,
                fontSize: '13px',
                marginTop: '24px',
                marginBottom: '0',
                lineHeight: '1.5',
              }}
            >
              Se você já atualizou seu cartão recentemente, o sistema pode levar alguns minutos
              para processar. Caso o problema persista, entre em contato com nosso suporte.
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
              Este e-mail foi enviado automaticamente pela plataforma JurisRadar. Por favor,
              não responda a este endereço.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default FalhaBilling
