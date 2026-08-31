// ── Tipos de entrada ──────────────────────────────────────────────────────────

export interface CriarSubContaInput {
  orgId: string;
  /** Razão social ou nome do escritório */
  name: string;
  email: string;
  /** CPF ou CNPJ do titular */
  cpfCnpj: string;
  /** Tipo de pessoa: CPF = física, CNPJ = jurídica */
  companyType?: 'INDIVIDUAL' | 'LIMITED' | 'ASSOCIATION' | 'ASSOCIATION_OTHER';
  phone?: string;
  mobilePhone?: string;
  site?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  incomeValue?: number;
}

export interface CriarCobrancaInput {
  /** Resolve a api_key da sub-conta no banco */
  orgId: string;
  honorarioId: string;
  /** Valor em reais (ex: 1500.00) */
  valor: number;
  /** ISO date (ex: "2026-10-15") */
  vencimento: string;
  tipo: 'BOLETO' | 'PIX' | 'BOLETO_PIX';
  clienteEmail: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  descricao: string;
}

export interface CriarAssinaturaInput {
  orgId: string;
  honorarioId: string;
  /** Valor em reais por parcela */
  valor: number;
  /** Ciclo de cobrança: WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | SEMIANNUALLY | ANNUALLY */
  ciclo: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
  /** Data de início da primeira cobrança (ISO date) */
  dataInicio: string;
  /** Número total de parcelas (null = indeterminado) */
  totalParcelas?: number;
  clienteEmail: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  descricao: string;
}

export interface ListarCobrancasInput {
  orgId: string;
  status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  /** ISO date range */
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
  offset?: number;
  limit?: number;
}

// ── Tipos de saída ────────────────────────────────────────────────────────────

export interface AsaasSubConta {
  asaasAccountId: string;
  /** API key da sub-conta — deve ser criptografada antes de persistir */
  apiKey: string;
  /** URL de KYC/onboarding do Asaas */
  onboardingUrl?: string;
  status: 'pending' | 'active' | 'suspended';
}

export interface AsaasCobranca {
  asaasPaymentId: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  valor: number;
  vencimento?: string;
  linkBoleto?: string;
  linkPix?: string;
  qrCodePix?: string;
}

export interface AsaasAssinatura {
  asaasSubscriptionId: string;
  status: string;
  valor: number;
  ciclo: string;
  proximaCobranca?: string;
}

// ── Interface principal ───────────────────────────────────────────────────────

export interface AsaasClient {
  criarSubConta(dados: CriarSubContaInput): Promise<AsaasSubConta>;
  criarCobranca(input: CriarCobrancaInput): Promise<AsaasCobranca>;
  criarAssinatura(input: CriarAssinaturaInput): Promise<AsaasAssinatura>;
  cancelarCobranca(asaasPaymentId: string, orgId: string): Promise<void>;
  listarCobranças(filtros: ListarCobrancasInput): Promise<AsaasCobranca[]>;
}

// ── Tipos internos da API Asaas ───────────────────────────────────────────────

/** Resposta bruta da API Asaas ao criar uma sub-conta */
export interface AsaasApiSubContaResponse {
  id: string;
  apiKey?: string;
  walletId?: string;
  accountNumber?: { agency?: string; account?: string };
  loginEmail?: string;
  onboardingUrl?: string;
  status?: string;
}

/** Resposta bruta da API Asaas ao criar/listar uma cobrança */
export interface AsaasApiCobrancaResponse {
  id: string;
  status: string;
  value: number;
  dueDate?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  pixQrCodeImage?: string;
  pixCopiaECola?: string;
}

/** Resposta bruta da API Asaas ao criar uma assinatura */
export interface AsaasApiAssinaturaResponse {
  id: string;
  status: string;
  value: number;
  cycle: string;
  nextDueDate?: string;
}

/** Resposta de erro padrão da API Asaas */
export interface AsaasApiErrorResponse {
  errors?: Array<{ code?: string; description?: string }>;
}

/** Resposta de listagem paginada da API Asaas */
export interface AsaasApiListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}
