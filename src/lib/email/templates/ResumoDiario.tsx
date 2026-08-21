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

export interface Movimentacao {
  processo: string
  numeroCnj: string
  tipo: string
  descricao: string
  data: string
}

export interface PrazoProximo {
  processo: string
  numeroCnj: string
  prazoAt: string
  diasRestantes: number
}

export interface ResumoDiarioProps {
  movimentacoes: Movimentacao[]
  prazos: PrazoProximo[]
  intimacoesNaoLidas: number
  dataReferencia?: string
}

export function ResumoDiario({
  movimentacoes,
  prazos,
  intimacoesNaoLidas,
  dataReferencia,
}: ResumoDiarioProps) {
  const dataRef = dataReferencia ?? new Date().toLocaleDateString('pt-BR')
  const totalMovimentacoes = movimentacoes.length
  const prazosCriticos = prazos.filter((p) => p.diasRestantes <= 2)
  const prazosProximos = prazos.filter((p) => p.diasRestantes > 2)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Resumo diário JurisRadar — {dataRef}: {totalMovimentacoes} movimentação{totalMovimentacoes !== 1 ? 'ões' : ''},{' '}
        {prazos.length} prazo{prazos.length !== 1 ? 's' : ''} próximo{prazos.length !== 1 ? 's' : ''},{' '}
        {intimacoesNaoLidas} intimação{intimacoesNaoLidas !== 1 ? 'ões' : ''} não lida{intimacoesNaoLidas !== 1 ? 's' : ''}
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
                margin: '0 0 4px 0',
                letterSpacing: '-0.5px',
              }}
            >
              JurisRadar
            </Heading>
            <Text
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                margin: '0',
              }}
            >
              Resumo Diário — {dataRef}
            </Text>
          </div>

          {/* Summary cards */}
          <div
            style={{
              padding: '24px 40px',
              backgroundColor: emailTheme.surface,
              display: 'flex',
            }}
          >
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td
                    style={{
                      width: '33%',
                      textAlign: 'center',
                      padding: '16px 8px',
                      backgroundColor: emailTheme.background,
                      borderRadius: '8px',
                    }}
                  >
                    <Text
                      style={{
                        color: emailTheme.primary,
                        fontSize: '28px',
                        fontWeight: '800',
                        margin: '0',
                        lineHeight: '1',
                      }}
                    >
                      {totalMovimentacoes}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.textMuted,
                        fontSize: '12px',
                        margin: '4px 0 0 0',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Movimentação{totalMovimentacoes !== 1 ? 'ões' : ''}
                    </Text>
                  </td>
                  <td style={{ width: '2%' }} />
                  <td
                    style={{
                      width: '33%',
                      textAlign: 'center',
                      padding: '16px 8px',
                      backgroundColor: prazos.length > 0 && prazosCriticos.length > 0 ? '#fef2f2' : emailTheme.background,
                      borderRadius: '8px',
                    }}
                  >
                    <Text
                      style={{
                        color: prazosCriticos.length > 0 ? emailTheme.danger : emailTheme.primary,
                        fontSize: '28px',
                        fontWeight: '800',
                        margin: '0',
                        lineHeight: '1',
                      }}
                    >
                      {prazos.length}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.textMuted,
                        fontSize: '12px',
                        margin: '4px 0 0 0',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Prazo{prazos.length !== 1 ? 's' : ''} próximo{prazos.length !== 1 ? 's' : ''}
                    </Text>
                  </td>
                  <td style={{ width: '2%' }} />
                  <td
                    style={{
                      width: '30%',
                      textAlign: 'center',
                      padding: '16px 8px',
                      backgroundColor: intimacoesNaoLidas > 0 ? '#eff6ff' : emailTheme.background,
                      borderRadius: '8px',
                    }}
                  >
                    <Text
                      style={{
                        color: intimacoesNaoLidas > 0 ? emailTheme.primary : emailTheme.textMuted,
                        fontSize: '28px',
                        fontWeight: '800',
                        margin: '0',
                        lineHeight: '1',
                      }}
                    >
                      {intimacoesNaoLidas}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.textMuted,
                        fontSize: '12px',
                        margin: '4px 0 0 0',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Intimação{intimacoesNaoLidas !== 1 ? 'ões' : ''} não lida{intimacoesNaoLidas !== 1 ? 's' : ''}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '32px 40px 0' }}>
            {/* Critical deadlines section */}
            {prazosCriticos.length > 0 && (
              <>
                <Heading
                  as="h3"
                  style={{
                    color: emailTheme.danger,
                    fontSize: '16px',
                    fontWeight: '700',
                    marginTop: '0',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Prazos Urgentes (≤ 2 dias)
                </Heading>
                {prazosCriticos.map((prazo, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#fef2f2',
                      border: `1px solid ${emailTheme.danger}`,
                      borderRadius: '6px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                    }}
                  >
                    <Text
                      style={{
                        color: emailTheme.text,
                        fontSize: '14px',
                        fontWeight: '700',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {prazo.processo}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.textMuted,
                        fontSize: '13px',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {prazo.numeroCnj}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.danger,
                        fontSize: '13px',
                        fontWeight: '700',
                        margin: '0',
                      }}
                    >
                      Vence em {prazo.diasRestantes === 0 ? 'hoje' : prazo.diasRestantes === 1 ? '1 dia' : `${prazo.diasRestantes} dias`} — {prazo.prazoAt}
                    </Text>
                  </div>
                ))}
                <Hr style={{ borderColor: emailTheme.border, margin: '24px 0' }} />
              </>
            )}

            {/* Other upcoming deadlines */}
            {prazosProximos.length > 0 && (
              <>
                <Heading
                  as="h3"
                  style={{
                    color: emailTheme.text,
                    fontSize: '16px',
                    fontWeight: '700',
                    marginTop: '0',
                    marginBottom: '12px',
                  }}
                >
                  Prazos Próximos (próximos 7 dias)
                </Heading>
                {prazosProximos.map((prazo, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: emailTheme.surface,
                      borderRadius: '6px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                    }}
                  >
                    <Text
                      style={{
                        color: emailTheme.text,
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {prazo.processo}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.textMuted,
                        fontSize: '13px',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {prazo.numeroCnj}
                    </Text>
                    <Text
                      style={{
                        color: emailTheme.text,
                        fontSize: '13px',
                        margin: '0',
                      }}
                    >
                      {`Vence em ${prazo.diasRestantes} dias — ${prazo.prazoAt}`}
                    </Text>
                  </div>
                ))}
                <Hr style={{ borderColor: emailTheme.border, margin: '24px 0' }} />
              </>
            )}

            {/* Movimentações section */}
            <Heading
              as="h3"
              style={{
                color: emailTheme.text,
                fontSize: '16px',
                fontWeight: '700',
                marginTop: '0',
                marginBottom: '12px',
              }}
            >
              Movimentações do Dia
            </Heading>

            {movimentacoes.length === 0 ? (
              <Text
                style={{
                  color: emailTheme.textMuted,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  marginBottom: '0',
                }}
              >
                Nenhuma movimentação registrada hoje.
              </Text>
            ) : (
              movimentacoes.map((mov, idx) => (
                <div
                  key={idx}
                  style={{
                    borderBottom: idx < movimentacoes.length - 1 ? `1px solid ${emailTheme.border}` : 'none',
                    paddingBottom: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <Text
                    style={{
                      color: emailTheme.text,
                      fontSize: '14px',
                      fontWeight: '700',
                      margin: '0 0 4px 0',
                    }}
                  >
                    {mov.processo}
                  </Text>
                  <Text
                    style={{
                      color: emailTheme.textMuted,
                      fontSize: '12px',
                      margin: '0 0 6px 0',
                    }}
                  >
                    {mov.numeroCnj} · {mov.tipo} · {mov.data}
                  </Text>
                  <Text
                    style={{
                      color: emailTheme.text,
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: '0',
                    }}
                  >
                    {mov.descricao}
                  </Text>
                </div>
              ))
            )}
          </div>

          <Hr style={{ borderColor: emailTheme.border, margin: '32px 0 0 0' }} />

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
              Este é seu resumo diário do JurisRadar. Para desativar este e-mail, acesse as
              configurações de notificações do seu perfil.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default ResumoDiario
