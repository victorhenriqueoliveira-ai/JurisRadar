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

export interface NotificacaoIntimacaoProps {
  processo: string
  numeroCnj: string
  tribunal: string
  descricao: string
  prazo?: string
  linkCrm: string
}

export function NotificacaoIntimacao({
  processo,
  numeroCnj,
  tribunal,
  descricao,
  prazo,
  linkCrm,
}: NotificacaoIntimacaoProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Nova intimação no processo {numeroCnj} — {tribunal}</Preview>
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
              backgroundColor: '#eff6ff',
              borderTop: `3px solid ${emailTheme.primary}`,
              padding: '16px 40px',
            }}
          >
            <Text
              style={{
                color: emailTheme.primary,
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0',
              }}
            >
              Nova Intimação
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
              {processo}
            </Heading>

            {/* Metadata */}
            <div
              style={{
                backgroundColor: emailTheme.surface,
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  margin: '0 0 6px 0',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Número CNJ:</strong> {numeroCnj}
              </Text>
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  margin: '0',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Tribunal:</strong> {tribunal}
              </Text>
            </div>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              <strong>Descrição da intimação:</strong>
            </Text>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px',
                padding: '12px 16px',
                borderLeft: `4px solid ${emailTheme.accent}`,
                backgroundColor: emailTheme.surface,
                margin: '0 0 24px 0',
              }}
            >
              {descricao}
            </Text>

            {prazo && (
              <div
                style={{
                  backgroundColor: '#fefce8',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '32px',
                  border: `1px solid ${emailTheme.accent}`,
                }}
              >
                <Text
                  style={{
                    color: emailTheme.text,
                    fontSize: '14px',
                    fontWeight: '700',
                    margin: '0',
                  }}
                >
                  Prazo: {prazo}
                </Text>
              </div>
            )}

            <Button
              href={linkCrm}
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
              Ver processo no CRM
            </Button>
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
              Você está recebendo este e-mail porque está monitorando este processo no JurisRadar.
              Para gerenciar suas notificações, acesse as configurações do seu perfil.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default NotificacaoIntimacao
