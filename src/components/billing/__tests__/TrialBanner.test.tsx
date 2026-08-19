// @vitest-environment jsdom
/**
 * Testes unitários para o componente TrialBanner.
 *
 * Cobre os três cenários definidos na task_19:
 * 1. trial_ends_at = hoje+3 → renderiza com "3 dias restantes"
 * 2. trial_ends_at = hoje+5 → não renderiza (fora da janela de 4 dias)
 * 3. status = 'active'     → não renderiza (não está em trial)
 */
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TrialBanner } from '../TrialBanner'

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

describe('TrialBanner', () => {
  it('renderiza banner quando trial expira em 3 dias', () => {
    render(<TrialBanner trialEndsAt={daysFromNow(3)} status="trialing" />)
    expect(screen.getByText(/3 dias/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /assinar agora/i })).toBeTruthy()
  })

  it('renderiza banner quando trial expira em 1 dia (amanhã)', () => {
    render(<TrialBanner trialEndsAt={daysFromNow(1)} status="trialing" />)
    expect(screen.getByText(/amanhã/i)).toBeTruthy()
  })

  it('renderiza banner quando trial já expirou (0 dias)', () => {
    render(<TrialBanner trialEndsAt={daysFromNow(0)} status="trialing" />)
    expect(screen.getByText(/expirou/i)).toBeTruthy()
  })

  it('não renderiza quando trial expira em 5 dias (fora da janela)', () => {
    const { container } = render(
      <TrialBanner trialEndsAt={daysFromNow(5)} status="trialing" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza quando status é "active" (não está em trial)', () => {
    const { container } = render(
      <TrialBanner trialEndsAt={daysFromNow(3)} status="active" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza quando trialEndsAt é null', () => {
    const { container } = render(
      <TrialBanner trialEndsAt={null} status="trialing" />,
    )
    expect(container.firstChild).toBeNull()
  })
})
