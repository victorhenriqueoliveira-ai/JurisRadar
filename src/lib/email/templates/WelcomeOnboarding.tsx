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

export interface WelcomeOnboardingProps {
  name: string
  appUrl: string
}

export function WelcomeOnboarding({ name, appUrl }: WelcomeOnboardingProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Bem-vindo ao JurisRadar, {name}! Seu monitoramento jurídico começa agora.</Preview>
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
              Olá, {name}!
            </Heading>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}
            >
              Seja bem-vindo ao <strong>JurisRadar</strong>. Sua conta foi criada com sucesso e
              você está a um clique de ter acesso ao monitoramento inteligente de processos e
              publicações jurídicas.
            </Text>

            <Text
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '32px',
              }}
            >
              Com o JurisRadar, você pode monitorar intimações do DJe, acompanhar processos no
              DataJud e receber alertas em tempo real — tudo em um só lugar.
            </Text>

            <Button
              href={appUrl}
              style={{
                backgroundColor: emailTheme.accent,
                color: emailTheme.primary,
                padding: '14px 28px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Acessar o app
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
              Você está recebendo este e-mail porque uma conta foi criada com seu endereço no
              JurisRadar. Se não foi você, ignore esta mensagem.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeOnboarding
