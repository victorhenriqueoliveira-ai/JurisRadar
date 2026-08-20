/**
 * Lista estática das siglas dos tribunais cobertos pelo DataJud (CNJ).
 * Fonte: https://datajud-wiki.cnj.jus.br/api-publica/endpoints
 *
 * Inclui: STF, STJ, TST, TSE, STM, TJs, TRFs, TRTs, TREs, TJMs.
 */
export const DATAJUD_TRIBUNALS: readonly string[] = [
  // Tribunais Superiores
  'api_publica_stf',    // Supremo Tribunal Federal
  'api_publica_stj',    // Superior Tribunal de Justiça
  'api_publica_tst',    // Tribunal Superior do Trabalho
  'api_publica_tse',    // Tribunal Superior Eleitoral
  'api_publica_stm',    // Superior Tribunal Militar

  // Tribunais Regionais Federais
  'api_publica_trf1',   // TRF 1ª Região
  'api_publica_trf2',   // TRF 2ª Região
  'api_publica_trf3',   // TRF 3ª Região
  'api_publica_trf4',   // TRF 4ª Região
  'api_publica_trf5',   // TRF 5ª Região
  'api_publica_trf6',   // TRF 6ª Região

  // Tribunais de Justiça Estaduais
  'api_publica_tjac',   // Acre
  'api_publica_tjal',   // Alagoas
  'api_publica_tjam',   // Amazonas
  'api_publica_tjap',   // Amapá
  'api_publica_tjba',   // Bahia
  'api_publica_tjce',   // Ceará
  'api_publica_tjdft',  // Distrito Federal e Territórios
  'api_publica_tjes',   // Espírito Santo
  'api_publica_tjgo',   // Goiás
  'api_publica_tjma',   // Maranhão
  'api_publica_tjmg',   // Minas Gerais
  'api_publica_tjms',   // Mato Grosso do Sul
  'api_publica_tjmt',   // Mato Grosso
  'api_publica_tjpa',   // Pará
  'api_publica_tjpb',   // Paraíba
  'api_publica_tjpe',   // Pernambuco
  'api_publica_tjpi',   // Piauí
  'api_publica_tjpr',   // Paraná
  'api_publica_tjrj',   // Rio de Janeiro
  'api_publica_tjrn',   // Rio Grande do Norte
  'api_publica_tjro',   // Rondônia
  'api_publica_tjrr',   // Roraima
  'api_publica_tjrs',   // Rio Grande do Sul
  'api_publica_tjsc',   // Santa Catarina
  'api_publica_tjse',   // Sergipe
  'api_publica_tjsp',   // São Paulo
  'api_publica_tjto',   // Tocantins

  // Tribunais Regionais do Trabalho
  'api_publica_trt1',   // TRT 1ª Região (RJ)
  'api_publica_trt2',   // TRT 2ª Região (SP)
  'api_publica_trt3',   // TRT 3ª Região (MG)
  'api_publica_trt4',   // TRT 4ª Região (RS)
  'api_publica_trt5',   // TRT 5ª Região (BA)
  'api_publica_trt6',   // TRT 6ª Região (PE)
  'api_publica_trt7',   // TRT 7ª Região (CE)
  'api_publica_trt8',   // TRT 8ª Região (PA/AP)
  'api_publica_trt9',   // TRT 9ª Região (PR)
  'api_publica_trt10',  // TRT 10ª Região (DF/TO)
  'api_publica_trt11',  // TRT 11ª Região (AM/RR)
  'api_publica_trt12',  // TRT 12ª Região (SC)
  'api_publica_trt13',  // TRT 13ª Região (PB)
  'api_publica_trt14',  // TRT 14ª Região (RO/AC)
  'api_publica_trt15',  // TRT 15ª Região (Campinas/SP)
  'api_publica_trt16',  // TRT 16ª Região (MA)
  'api_publica_trt17',  // TRT 17ª Região (ES)
  'api_publica_trt18',  // TRT 18ª Região (GO)
  'api_publica_trt19',  // TRT 19ª Região (AL)
  'api_publica_trt20',  // TRT 20ª Região (SE)
  'api_publica_trt21',  // TRT 21ª Região (RN)
  'api_publica_trt22',  // TRT 22ª Região (PI)
  'api_publica_trt23',  // TRT 23ª Região (MT)
  'api_publica_trt24',  // TRT 24ª Região (MS)

  // Tribunais Regionais Eleitorais
  'api_publica_treac',  // TRE Acre
  'api_publica_treal',  // TRE Alagoas
  'api_publica_tream',  // TRE Amazonas
  'api_publica_treap',  // TRE Amapá
  'api_publica_treba',  // TRE Bahia
  'api_publica_trece',  // TRE Ceará
  'api_publica_tredf',  // TRE Distrito Federal
  'api_publica_trees',  // TRE Espírito Santo
  'api_publica_trego',  // TRE Goiás
  'api_publica_trema',  // TRE Maranhão
  'api_publica_tremg',  // TRE Minas Gerais
  'api_publica_trems',  // TRE Mato Grosso do Sul
  'api_publica_tremt',  // TRE Mato Grosso
  'api_publica_trepa',  // TRE Pará
  'api_publica_trepb',  // TRE Paraíba
  'api_publica_trepe',  // TRE Pernambuco
  'api_publica_trepi',  // TRE Piauí
  'api_publica_trepr',  // TRE Paraná
  'api_publica_trerj',  // TRE Rio de Janeiro
  'api_publica_trern',  // TRE Rio Grande do Norte
  'api_publica_trero',  // TRE Rondônia
  'api_publica_trerr',  // TRE Roraima
  'api_publica_trers',  // TRE Rio Grande do Sul
  'api_publica_tresc',  // TRE Santa Catarina
  'api_publica_trese',  // TRE Sergipe
  'api_publica_tresp',  // TRE São Paulo
  'api_publica_treto',  // TRE Tocantins

  // Tribunais de Justiça Militar
  'api_publica_tjmmg',  // TJM Minas Gerais
  'api_publica_tjmrs',  // TJM Rio Grande do Sul
  'api_publica_tjmsp',  // TJM São Paulo
] as const;

/** Número total de tribunais cobertos pelo DataJud */
export const DATAJUD_TRIBUNALS_COUNT = DATAJUD_TRIBUNALS.length;

/** Tamanho do lote de tribunais por invocação (configurável via env var) */
export const DATAJUD_BATCH_SIZE = Number(
  process.env.DATAJUD_BATCH_SIZE ?? '10',
);
