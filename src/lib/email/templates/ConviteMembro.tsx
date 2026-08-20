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

export interface ConviteMembroProps {
  escritorioNome: string
  papel: string
  inviteUrl: string
  convidadoPor: string
}

export function ConviteMembro({
  escritorioNome,
  papel,
  inviteUrl,
  convidadoPor,
}: ConviteMembroProps) {
  const papelFormatado = papel.charAt(0).toUpperCase() + papel.slice(1)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        {convidadoPor} convidou você para o escritório {escritorioNome} no JurisRadar.
      </Preview>
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
              Convite para o escritório
            </Heading>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              <strong>{convidadoPor}</strong> convidou você para integrar o escritório{' '}
              <strong>{escritorioNome}</strong> no JurisRadar.
            </Text>

            {/* Info box */}
            <div
              style={{
                backgroundColor: emailTheme.surface,
                borderLeft: `4px solid ${emailTheme.accent}`,
                borderRadius: '4px',
                padding: '16px 20px',
                marginBottom: '32px',
              }}
            >
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: '0 0 4px 0',
                }}
              >
                Papel atribuído
              </Text>
              <Text
                style={{
                  color: emailTheme.text,
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0',
                }}
              >
                {papelFormatado}
              </Text>
            </div>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '28px',
              }}
            >
              Clique no botão abaixo para aceitar o convite e acessar o escritório:
            </Text>

            <Button
              href={inviteUrl}
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
              Aceitar convite
            </Button>

            <Text
              style={{
                color: emailTheme.textMuted,
                fontSize: '13px',
                marginTop: '24px',
                marginBottom: '0',
              }}
            >
              Este link de convite expira em 7 dias.
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
              Se você não esperava este convite, pode ignorar este e-mail com segurança.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default ConviteMembro
