/** Uma linha extraída da Lista de Distribuição TJSP (eproc, Primeira Instância/Colégio Recursal). */
export interface DistribuicaoTjspRow {
  numeroProcesso: string;
  comarca: string | null;
  vara: string | null;
  classe: string;
}
