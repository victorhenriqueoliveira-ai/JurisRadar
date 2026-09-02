export const TIPOS_RELEVANTES = [
  'intimacao',
  'citacao',
  'decisao',
  'sentenca',
  'publicacao_dje',
] as const;

export type TipoNotificacao = (typeof TIPOS_RELEVANTES)[number];

export const TIPOS_CRITICOS = [
  'intimacao',
  'citacao',
  'prazo_fatal',
  'decisao',
  'sentenca',
] as const;
