import {
  Body,
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
import type { EmailClienteParams } from '@/lib/comunicacao-cliente'

export type { EmailClienteParams }

export function NotificacaoCliente({
  clienteNome,
  processoNumCnj,
  tipoEvento,
  dataEvento,
  mensagemPersonalizada,
  nomeAdvogado,
}: EmailClienteParams) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Atualização do processo {processoNumCnj} — {tipoEvento}</Preview>
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
          <div style={{ backgroundColor: emailTheme.primary, padding: '32px 40px' }}>
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
            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginTop: '0',
                marginBottom: '16px',
              }}
            >
              Olá, <strong>{clienteNome}</strong>
            </Text>

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
                <strong style={{ color: emailTheme.text }}>Processo:</strong> {processoNumCnj}
              </Text>
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  margin: '0 0 6px 0',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Tipo:</strong> {tipoEvento}
              </Text>
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '13px',
                  margin: '0',
                  lineHeight: '1.5',
                }}
              >
                <strong style={{ color: emailTheme.text }}>Data:</strong> {dataEvento}
              </Text>
            </div>

            {/* Mensagem personalizada */}
            <Text
              style={{
                color: emailTheme.text,
                fontSize: '15px',
                lineHeight: '1.7',
                padding: '12px 16px',
                borderLeft: `4px solid ${emailTheme.accent}`,
                backgroundColor: emailTheme.surface,
                margin: '0 0 32px 0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {mensagemPersonalizada}
            </Text>

            <Text
              style={{
                color: emailTheme.textMuted,
                fontSize: '14px',
                margin: '0',
              }}
            >
              Atenciosamente,<br />
              <strong style={{ color: emailTheme.text }}>{nomeAdvogado}</strong>
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
              Este e-mail foi enviado pelo seu escritório de advocacia via JurisRadar.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default NotificacaoCliente
