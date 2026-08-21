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

export interface AlertaPrazoProps {
  processo: string
  numeroCnj: string
  prazoAt: string
  diasRestantes: number
  linkCalendario?: string
}

export function AlertaPrazo({
  processo,
  numeroCnj,
  prazoAt,
  diasRestantes,
  linkCalendario,
}: AlertaPrazoProps) {
  const isUrgente = diasRestantes <= 2
  const diasColor = isUrgente ? emailTheme.danger : emailTheme.success
  const diasBg = isUrgente ? '#fef2f2' : '#f0fdf4'
  const diasBorder = isUrgente ? emailTheme.danger : emailTheme.success
  const bannerBg = isUrgente ? '#fef2f2' : '#eff6ff'
  const bannerBorderColor = isUrgente ? emailTheme.danger : emailTheme.primary
  const bannerTextColor = isUrgente ? emailTheme.danger : emailTheme.primary
  const bannerLabel = isUrgente ? 'Prazo Urgente' : 'Alerta de Prazo'
  const buttonBg = isUrgente ? emailTheme.danger : emailTheme.primary

  const diasText =
    diasRestantes === 0
      ? 'Vence hoje!'
      : diasRestantes === 1
        ? '1 dia restante'
        : `${diasRestantes} dias restantes`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        {isUrgente ? 'URGENTE: ' : ''}Prazo em {diasRestantes === 0 ? 'hoje' : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`} — {numeroCnj}
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

          {/* Alert banner */}
          <div
            style={{
              backgroundColor: bannerBg,
              borderTop: `3px solid ${bannerBorderColor}`,
              padding: '16px 40px',
            }}
          >
            <Text
              style={{
                color: bannerTextColor,
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0',
              }}
            >
              {bannerLabel}
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

            {/* Days remaining highlight */}
            <div
              style={{
                backgroundColor: diasBg,
                border: `2px solid ${diasBorder}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  color: diasColor,
                  fontSize: '32px',
                  fontWeight: '800',
                  margin: '0',
                  lineHeight: '1',
                }}
                data-testid="dias-restantes"
              >
                {diasText}
              </Text>
              <Text
                style={{
                  color: diasColor,
                  fontSize: '14px',
                  margin: '8px 0 0 0',
                  fontWeight: '600',
                }}
              >
                Vencimento: {prazoAt}
              </Text>
            </div>

            {/* Metadata */}
            <div
              style={{
                backgroundColor: emailTheme.surface,
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '32px',
              }}
            >
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  margin: '0',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Número CNJ:</strong> {numeroCnj}
              </Text>
            </div>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '32px',
              }}
            >
              {isUrgente
                ? 'Este prazo está próximo de vencer. Tome as providências necessárias imediatamente.'
                : 'Este prazo está se aproximando. Verifique seu calendário e organize as atividades necessárias.'}
            </Text>

            {linkCalendario && (
              <Button
                href={linkCalendario}
                style={{
                  backgroundColor: buttonBg,
                  color: '#ffffff',
                  padding: '14px 28px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '15px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Ver calendário de prazos
              </Button>
            )}
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
              Você está recebendo este alerta porque está monitorando este processo no JurisRadar.
              Para gerenciar suas notificações, acesse as configurações do seu perfil.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default AlertaPrazo
