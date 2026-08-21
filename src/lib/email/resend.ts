import { Resend } from 'resend'

// Usa string vazia quando a chave não está configurada — o módulo carrega sem erro,
// mas envios reais falharão. Configurar RESEND_API_KEY para ativar e-mails.
export const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder_not_configured')
