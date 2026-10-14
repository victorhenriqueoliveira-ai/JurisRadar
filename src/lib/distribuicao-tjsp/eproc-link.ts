/**
 * Link de consulta pública para um processo específico.
 *
 * IMPORTANTE: os processos da Lista de Distribuição TJSP são todos do sistema
 * eproc (confirmado nos próprios PDFs: "Sistema eproc"). O e-SAJ (cpopg) é a
 * consulta do sistema SAJ antigo — TJSP migrou a distribuição de processos
 * cíveis novos para o eproc, então o e-SAJ **não encontra** esses processos
 * (confirmado empiricamente em 2026-10-14: busca real no e-SAJ retornou "Não
 * existem informações disponíveis" para processos distribuídos via eproc).
 *
 * A consulta pública correta é o portal do eproc 1º Grau, sem necessidade de
 * login: https://eproc1g.tjsp.jus.br/eproc/
 */
export function eprocConsultaPublicaLink(numeroProcesso: string): string {
  const params = new URLSearchParams({
    acao: 'tjsp@consulta_unificada_publica/consultar',
    instancia: '1',
    contexto: 'SP',
    num_processo: numeroProcesso,
  });
  return `https://eproc1g.tjsp.jus.br/eproc/externo_controlador.php?${params.toString()}`;
}
