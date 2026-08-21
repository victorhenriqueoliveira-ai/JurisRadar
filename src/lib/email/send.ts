import { render } from '@react-email/render'
import React from 'react'
import { resend } from './resend'

export interface SendEmailOptions {
  to: string
  subject: string
  react: React.ReactElement
}

export interface SendEmailResult {
  id: string
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'EmailSendError'
  }
}

/**
 * Sends a transactional email via Resend.
 *
 * IMPORTANT: This function must NEVER be called directly from Route Handlers.
 * Always invoke it through Inngest (notificacao-dispatcher) as defined in task_11.
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!fromEmail) {
    throw new EmailSendError('RESEND_FROM_EMAIL environment variable is not set')
  }

  const html = await render(react)

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  })

  if (error) {
    throw new EmailSendError(`Failed to send email: ${error.message}`, error)
  }

  if (!data?.id) {
    throw new EmailSendError('Resend returned no id — email may not have been sent')
  }

  return { id: data.id }
}

/**
 * Renders a React Email template to HTML string without sending.
 * Useful for previews and tests.
 */
export async function renderToHtml(element: React.ReactElement): Promise<string> {
  return render(element)
}
