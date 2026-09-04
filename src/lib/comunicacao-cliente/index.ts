export interface EmailClienteParams {
  clienteNome: string;
  processoNumCnj: string;
  tipoEvento: string;
  dataEvento: string;
  mensagemPersonalizada: string;
  nomeAdvogado: string;
}

/**
 * Gera URL wa.me com mensagem pré-codificada.
 * Remove todos os caracteres não-numéricos do telefone antes de montar a URL.
 */
export function buildWaLink(telefone: string, mensagem: string): string {
  const numero = telefone.replace(/\D/g, '');
  if (!numero) {
    throw new Error('Telefone inválido: nenhum dígito encontrado');
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
