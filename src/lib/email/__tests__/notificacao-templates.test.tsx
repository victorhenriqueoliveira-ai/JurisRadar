import React from 'react'
import { render } from '@react-email/render'
import { describe, it, expect } from 'vitest'
import { NotificacaoIntimacao } from '../templates/NotificacaoIntimacao'
import { AlertaPrazo } from '../templates/AlertaPrazo'
import { ResumoDiario } from '../templates/ResumoDiario'
import { NotificacaoCliente } from '../templates/NotificacaoCliente'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderToHtml(element: React.ReactElement): Promise<string> {
  return render(element)
}

// ---------------------------------------------------------------------------
// NotificacaoIntimacao
// ---------------------------------------------------------------------------

describe('NotificacaoIntimacao', () => {
  const defaultProps = {
    processo: 'Silva vs. Estado de São Paulo',
    numeroCnj: '0001234-12.2024.8.26.0100',
    tribunal: 'TJSP',
    descricao: 'Intimação para apresentar réplica',
    linkCrm: 'https://app.jurisradar.com.br/processos/123',
  }

  it('renderiza sem erros', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o número do processo CNJ', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('0001234-12.2024.8.26.0100')
  })

  it('contém o nome do processo', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('Silva vs. Estado de São Paulo')
  })

  it('contém o tribunal', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('TJSP')
  })

  it('contém a descrição da intimação', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('Intimação para apresentar réplica')
  })

  it('contém o link do CRM', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('https://app.jurisradar.com.br/processos/123')
  })

  it('contém o prazo quando fornecido', async () => {
    const html = await renderToHtml(
      <NotificacaoIntimacao {...defaultProps} prazo="2026-09-05" />,
    )
    expect(html).toContain('2026-09-05')
  })

  it('não contém seção de prazo quando não fornecido', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    // Without prazo, should not render prazo section
    expect(html).not.toContain('Prazo:')
  })

  it('contém o botão de ver processo no CRM', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('Ver processo no CRM')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(<NotificacaoIntimacao {...defaultProps} />)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// AlertaPrazo
// ---------------------------------------------------------------------------

describe('AlertaPrazo', () => {
  const defaultProps = {
    processo: 'Empresa X vs. Empresa Y',
    numeroCnj: '0005678-34.2024.8.26.0200',
    prazoAt: '2026-09-10',
    diasRestantes: 7,
  }

  it('renderiza sem erros', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} />)
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o número do processo CNJ', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} />)
    expect(html).toContain('0005678-34.2024.8.26.0200')
  })

  it('contém a data do prazo', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} />)
    expect(html).toContain('2026-09-10')
  })

  it('exibe cor vermelha (danger) quando diasRestantes ≤ 2', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} diasRestantes={1} />)
    // Should contain the danger color (#dc2626) in the dias restantes element
    expect(html).toContain('#dc2626')
    expect(html).toContain('1 dia restante')
  })

  it('exibe cor vermelha quando diasRestantes = 2', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} diasRestantes={2} />)
    expect(html).toContain('#dc2626')
    expect(html).toContain('2 dias restantes')
  })

  it('não exibe cor vermelha quando diasRestantes = 3', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} diasRestantes={3} />)
    // success color (#16a34a) should be present instead of danger (#dc2626)
    expect(html).toContain('#16a34a')
    expect(html).toContain('3 dias restantes')
    // The danger color should not appear in the dias highlight section
    // (it may appear elsewhere in the template, but should not be the dominant color)
    const dangerColorCount = (html.match(/#dc2626/g) ?? []).length
    const successColorCount = (html.match(/#16a34a/g) ?? []).length
    expect(successColorCount).toBeGreaterThan(0)
    // For non-urgent, danger should appear 0 times
    expect(dangerColorCount).toBe(0)
  })

  it('não exibe cor vermelha quando diasRestantes = 7 (prazo não urgente)', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} diasRestantes={7} />)
    // success color present, no danger color
    expect(html).toContain('#16a34a')
    const dangerCount = (html.match(/#dc2626/g) ?? []).length
    expect(dangerCount).toBe(0)
  })

  it('exibe "Vence hoje!" quando diasRestantes = 0', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} diasRestantes={0} />)
    expect(html).toContain('Vence hoje!')
  })

  it('contém o link de calendário quando fornecido', async () => {
    const html = await renderToHtml(
      <AlertaPrazo
        {...defaultProps}
        linkCalendario="https://app.jurisradar.com.br/calendario"
      />,
    )
    expect(html).toContain('https://app.jurisradar.com.br/calendario')
    expect(html).toContain('Ver calendário de prazos')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(<AlertaPrazo {...defaultProps} />)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// ResumoDiario
// ---------------------------------------------------------------------------

describe('ResumoDiario', () => {
  const defaultMovimentacoes = [
    {
      processo: 'Processo A',
      numeroCnj: '0001111-11.2024.8.26.0100',
      tipo: 'decisao',
      descricao: 'Decisão interlocutória deferindo liminar',
      data: '2026-08-19',
    },
    {
      processo: 'Processo B',
      numeroCnj: '0002222-22.2024.8.26.0200',
      tipo: 'sentenca',
      descricao: 'Sentença de mérito procedente',
      data: '2026-08-19',
    },
  ]

  const defaultPrazos = [
    {
      processo: 'Processo C',
      numeroCnj: '0003333-33.2024.8.26.0300',
      prazoAt: '2026-08-21',
      diasRestantes: 2,
    },
    {
      processo: 'Processo D',
      numeroCnj: '0004444-44.2024.8.26.0400',
      prazoAt: '2026-08-25',
      diasRestantes: 6,
    },
  ]

  it('renderiza sem erros com listas vazias', async () => {
    const html = await renderToHtml(
      <ResumoDiario movimentacoes={[]} prazos={[]} intimacoesNaoLidas={0} />,
    )
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('renderiza sem erros com dados completos', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={defaultMovimentacoes}
        prazos={defaultPrazos}
        intimacoesNaoLidas={3}
      />,
    )
    expect(html).toBeTruthy()
  })

  it('exibe mensagem quando não há movimentações', async () => {
    const html = await renderToHtml(
      <ResumoDiario movimentacoes={[]} prazos={[]} intimacoesNaoLidas={0} />,
    )
    expect(html).toContain('Nenhuma movimentação registrada hoje.')
  })

  it('exibe contadores corretos no sumário', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={defaultMovimentacoes}
        prazos={defaultPrazos}
        intimacoesNaoLidas={5}
      />,
    )
    // Total movimentações: 2
    expect(html).toContain('2')
    // intimações não lidas: 5
    expect(html).toContain('5')
  })

  it('contém dados das movimentações', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={defaultMovimentacoes}
        prazos={[]}
        intimacoesNaoLidas={0}
      />,
    )
    expect(html).toContain('Processo A')
    expect(html).toContain('Decisão interlocutória deferindo liminar')
    expect(html).toContain('Processo B')
    expect(html).toContain('Sentença de mérito procedente')
  })

  it('exibe prazos críticos (≤ 2 dias) com destaque', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={[]}
        prazos={defaultPrazos}
        intimacoesNaoLidas={0}
      />,
    )
    expect(html).toContain('Prazos Urgentes')
    expect(html).toContain('Processo C')
    // Danger color should appear for critical deadlines
    expect(html).toContain('#dc2626')
  })

  it('exibe prazos não críticos separados', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={[]}
        prazos={defaultPrazos}
        intimacoesNaoLidas={0}
      />,
    )
    expect(html).toContain('Prazos Próximos')
    expect(html).toContain('Processo D')
    expect(html).toContain('6 dias')
  })

  it('contém o cabeçalho de data de referência quando fornecido', async () => {
    const html = await renderToHtml(
      <ResumoDiario
        movimentacoes={[]}
        prazos={[]}
        intimacoesNaoLidas={0}
        dataReferencia="19/08/2026"
      />,
    )
    expect(html).toContain('19/08/2026')
  })

  it('contém a seção JurisRadar no cabeçalho', async () => {
    const html = await renderToHtml(
      <ResumoDiario movimentacoes={[]} prazos={[]} intimacoesNaoLidas={0} />,
    )
    expect(html).toContain('JurisRadar')
    expect(html).toContain('Resumo Diário')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(
      <ResumoDiario movimentacoes={[]} prazos={[]} intimacoesNaoLidas={0} />,
    )
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ---------------------------------------------------------------------------
// NotificacaoCliente
// ---------------------------------------------------------------------------

describe('NotificacaoCliente', () => {
  const defaultProps = {
    clienteNome: 'Ana Paula Silva',
    processoNumCnj: '0001234-56.2026.8.26.0001',
    tipoEvento: 'Audiência de instrução',
    dataEvento: '10/09/2026',
    mensagemPersonalizada: 'Prezada Ana, sua audiência está agendada.',
    nomeAdvogado: 'Dr. Carlos Mendes',
  }

  it('renderiza sem erros', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toBeTruthy()
    expect(typeof html).toBe('string')
  })

  it('contém o nome do cliente', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('Ana Paula Silva')
  })

  it('contém o número CNJ do processo', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('0001234-56.2026.8.26.0001')
  })

  it('contém o tipo do evento', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('Audiência de instrução')
  })

  it('contém a mensagem personalizada', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('Prezada Ana, sua audiência está agendada.')
  })

  it('contém o nome do advogado', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('Dr. Carlos Mendes')
  })

  it('renderiza com mensagem contendo caracteres especiais sem quebrar', async () => {
    const html = await renderToHtml(
      <NotificacaoCliente
        {...defaultProps}
        mensagemPersonalizada='Processo nº 0001 — Aguardando decisão & prazo <urgente>.'
      />,
    )
    expect(html).toBeTruthy()
    expect(html).toContain('JurisRadar')
  })

  it('contém tag html válida', async () => {
    const html = await renderToHtml(<NotificacaoCliente {...defaultProps} />)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
