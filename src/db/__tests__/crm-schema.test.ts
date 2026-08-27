/**
 * Testes unitários para as 4 novas tabelas do CRM jurídico (task_01).
 *
 * Valida estrutura Drizzle (colunas, FKs, índices, constraints) sem banco real.
 * Testes de integração (inserção/leitura real) são documentados no bloco final.
 */
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  notificacaoGarantia,
  asaasAccounts,
  cobrancas,
  anexos,
  users,
  organizations,
  notificacoes,
  honorarios,
  processos,
  orgMembers,
} from '../schema';

// ── Exportações das novas tabelas ─────────────────────────────────────────────

describe('crm-schema — novas tabelas exportadas', () => {
  it('deve exportar notificacaoGarantia como objeto não-nulo', () => {
    expect(notificacaoGarantia).toBeDefined();
    expect(notificacaoGarantia).not.toBeNull();
    expect(typeof notificacaoGarantia).toBe('object');
  });

  it('deve exportar asaasAccounts como objeto não-nulo', () => {
    expect(asaasAccounts).toBeDefined();
    expect(asaasAccounts).not.toBeNull();
    expect(typeof asaasAccounts).toBe('object');
  });

  it('deve exportar cobrancas como objeto não-nulo', () => {
    expect(cobrancas).toBeDefined();
    expect(cobrancas).not.toBeNull();
    expect(typeof cobrancas).toBe('object');
  });

  it('deve exportar anexos como objeto não-nulo', () => {
    expect(anexos).toBeDefined();
    expect(anexos).not.toBeNull();
    expect(typeof anexos).toBe('object');
  });
});

// ── Colunas das novas tabelas ─────────────────────────────────────────────────

describe('crm-schema — colunas de notificacaoGarantia', () => {
  it('deve ter todas as colunas obrigatórias da state machine', () => {
    const cols = Object.keys(notificacaoGarantia);
    expect(cols).toContain('id');
    expect(cols).toContain('notificacaoId');
    expect(cols).toContain('orgId');
    expect(cols).toContain('responsavelId');
    expect(cols).toContain('backupId');
    expect(cols).toContain('step');
    expect(cols).toContain('confirmadoEm');
    expect(cols).toContain('emailEnviadoEm');
    expect(cols).toContain('smsEnviadoEm');
    expect(cols).toContain('whatsappEnviadoEm');
    expect(cols).toContain('backupNotificadoEm');
    expect(cols).toContain('inngestCorrelationId');
    expect(cols).toContain('createdAt');
  });

  it('coluna step deve ter default "email_enviado"', () => {
    const stepCol = (notificacaoGarantia as any).step;
    expect(stepCol.defaultFn).toBeUndefined();
    // O default está no banco como string literal
    expect(stepCol.default).toBe('email_enviado');
  });

  it('coluna confirmadoEm deve ser nullable', () => {
    const col = (notificacaoGarantia as any).confirmadoEm;
    expect(col.notNull).toBeFalsy();
  });

  it('coluna backupId deve ser nullable (contato de escalação opcional)', () => {
    const col = (notificacaoGarantia as any).backupId;
    expect(col.notNull).toBeFalsy();
  });
});

describe('crm-schema — colunas de asaasAccounts', () => {
  it('deve ter todas as colunas obrigatórias', () => {
    const cols = Object.keys(asaasAccounts);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('asaasAccountId');
    expect(cols).toContain('apiKeyEncrypted');
    expect(cols).toContain('status');
    expect(cols).toContain('onboardingUrl');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('activatedAt');
  });

  it('coluna status deve ter default "pending"', () => {
    const col = (asaasAccounts as any).status;
    expect(col.default).toBe('pending');
  });

  it('coluna orgId deve ser UNIQUE (um escritório, uma conta Asaas)', () => {
    const col = (asaasAccounts as any).orgId;
    expect(col.isUnique).toBe(true);
  });

  it('coluna onboardingUrl deve ser nullable', () => {
    const col = (asaasAccounts as any).onboardingUrl;
    expect(col.notNull).toBeFalsy();
  });

  it('coluna activatedAt deve ser nullable', () => {
    const col = (asaasAccounts as any).activatedAt;
    expect(col.notNull).toBeFalsy();
  });
});

describe('crm-schema — colunas de cobrancas', () => {
  it('deve ter todas as colunas obrigatórias', () => {
    const cols = Object.keys(cobrancas);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('honorarioId');
    expect(cols).toContain('asaasPaymentId');
    expect(cols).toContain('asaasSubscriptionId');
    expect(cols).toContain('tipo');
    expect(cols).toContain('valor');
    expect(cols).toContain('vencimento');
    expect(cols).toContain('status');
    expect(cols).toContain('linkBoleto');
    expect(cols).toContain('linkPix');
    expect(cols).toContain('qrCodePix');
    expect(cols).toContain('clienteEmail');
    expect(cols).toContain('clienteNome');
    expect(cols).toContain('clienteCpfCnpj');
    expect(cols).toContain('parcelaNumero');
    expect(cols).toContain('parcelaTotal');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('coluna status deve ter default "pending"', () => {
    const col = (cobrancas as any).status;
    expect(col.default).toBe('pending');
  });

  it('coluna asaasPaymentId deve ser UNIQUE', () => {
    const col = (cobrancas as any).asaasPaymentId;
    expect(col.isUnique).toBe(true);
  });

  it('colunas nullable de cobrança não devem ser NOT NULL', () => {
    expect((cobrancas as any).asaasPaymentId.notNull).toBeFalsy();
    expect((cobrancas as any).asaasSubscriptionId.notNull).toBeFalsy();
    expect((cobrancas as any).linkBoleto.notNull).toBeFalsy();
    expect((cobrancas as any).linkPix.notNull).toBeFalsy();
    expect((cobrancas as any).qrCodePix.notNull).toBeFalsy();
    expect((cobrancas as any).parcelaNumero.notNull).toBeFalsy();
    expect((cobrancas as any).parcelaTotal.notNull).toBeFalsy();
  });
});

describe('crm-schema — colunas de anexos', () => {
  it('deve ter todas as colunas obrigatórias', () => {
    const cols = Object.keys(anexos);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('nome');
    expect(cols).toContain('url');
    expect(cols).toContain('tamanho');
    expect(cols).toContain('mimeType');
    expect(cols).toContain('uploadedBy');
    expect(cols).toContain('createdAt');
  });

  it('todas as colunas essenciais devem ser NOT NULL', () => {
    expect((anexos as any).nome.notNull).toBe(true);
    expect((anexos as any).url.notNull).toBe(true);
    expect((anexos as any).tamanho.notNull).toBe(true);
    expect((anexos as any).mimeType.notNull).toBe(true);
  });
});

// ── Colunas novas nas tabelas existentes ──────────────────────────────────────

describe('crm-schema — colunas adicionadas em tabelas existentes', () => {
  it('users deve ter coluna whatsappNumero (nullable)', () => {
    const cols = Object.keys(users);
    expect(cols).toContain('whatsappNumero');
    expect((users as any).whatsappNumero.notNull).toBeFalsy();
  });

  it('users deve ter coluna smsNumero (nullable)', () => {
    const cols = Object.keys(users);
    expect(cols).toContain('smsNumero');
    expect((users as any).smsNumero.notNull).toBeFalsy();
  });

  it('orgMembers deve ter coluna isBackupContato com default false', () => {
    const cols = Object.keys(orgMembers);
    expect(cols).toContain('isBackupContato');
    expect((orgMembers as any).isBackupContato.default).toBe(false);
    expect((orgMembers as any).isBackupContato.notNull).toBe(true);
  });

  it('honorarios deve ter coluna asaasSubscriptionId (nullable)', () => {
    const cols = Object.keys(honorarios);
    expect(cols).toContain('asaasSubscriptionId');
    expect((honorarios as any).asaasSubscriptionId.notNull).toBeFalsy();
  });

  it('notificacoes deve ter coluna garantiaId (nullable)', () => {
    const cols = Object.keys(notificacoes);
    expect(cols).toContain('garantiaId');
    expect((notificacoes as any).garantiaId.notNull).toBeFalsy();
  });

  it('notificacoes deve ter coluna confirmadoEm (nullable)', () => {
    const cols = Object.keys(notificacoes);
    expect(cols).toContain('confirmadoEm');
    expect((notificacoes as any).confirmadoEm.notNull).toBeFalsy();
  });
});

// ── Foreign keys ──────────────────────────────────────────────────────────────

describe('crm-schema — foreign keys de notificacaoGarantia', () => {
  it('deve ter FK para notificacoes com ON DELETE CASCADE', () => {
    const config = getTableConfig(notificacaoGarantia);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === notificacoes;
    });
    expect(fk).toBeDefined();
    expect(fk!.onDelete).toBe('cascade');
  });

  it('deve ter FK para organizations', () => {
    const config = getTableConfig(notificacaoGarantia);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(fk).toBeDefined();
  });

  it('deve ter FK para users (responsavelId)', () => {
    const config = getTableConfig(notificacaoGarantia);
    const userFks = config.foreignKeys.filter((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === users;
    });
    // backupId e responsavelId apontam para users
    expect(userFks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('crm-schema — foreign keys de asaasAccounts', () => {
  it('deve ter FK para organizations', () => {
    const config = getTableConfig(asaasAccounts);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(fk).toBeDefined();
  });
});

describe('crm-schema — foreign keys de cobrancas', () => {
  it('deve ter FK para organizations', () => {
    const config = getTableConfig(cobrancas);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(fk).toBeDefined();
  });

  it('deve ter FK para honorarios', () => {
    const config = getTableConfig(cobrancas);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === honorarios;
    });
    expect(fk).toBeDefined();
  });
});

describe('crm-schema — foreign keys de anexos', () => {
  it('deve ter FK para processos com ON DELETE CASCADE', () => {
    const config = getTableConfig(anexos);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === processos;
    });
    expect(fk).toBeDefined();
    expect(fk!.onDelete).toBe('cascade');
  });

  it('deve ter FK para organizations', () => {
    const config = getTableConfig(anexos);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(fk).toBeDefined();
  });

  it('deve ter FK para users (uploadedBy)', () => {
    const config = getTableConfig(anexos);
    const fk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === users;
    });
    expect(fk).toBeDefined();
  });
});

// ── Índices obrigatórios ──────────────────────────────────────────────────────

describe('crm-schema — índices das novas tabelas', () => {
  it('notificacaoGarantia deve ter índice em org_id', () => {
    const config = getTableConfig(notificacaoGarantia);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_notificacao_garantia_org');
  });

  it('notificacaoGarantia deve ter índice em (step, email_enviado_em)', () => {
    const config = getTableConfig(notificacaoGarantia);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_notificacao_garantia_step');
  });

  it('cobrancas deve ter índice em (org_id, status)', () => {
    const config = getTableConfig(cobrancas);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_cobrancas_org_status');
  });

  it('cobrancas deve ter índice em honorario_id', () => {
    const config = getTableConfig(cobrancas);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_cobrancas_honorario');
  });

  it('cobrancas deve ter índice em asaas_payment_id', () => {
    const config = getTableConfig(cobrancas);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_cobrancas_asaas_event');
  });

  it('anexos deve ter índice em processo_id', () => {
    const config = getTableConfig(anexos);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('idx_anexos_processo');
  });
});

// ── Constraints unique ────────────────────────────────────────────────────────

describe('crm-schema — constraints unique', () => {
  it('asaasAccounts deve ter constraint UNIQUE em org_id', () => {
    const col = (asaasAccounts as any).orgId;
    expect(col.isUnique).toBe(true);
  });

  it('cobrancas deve ter constraint UNIQUE em asaas_payment_id', () => {
    const col = (cobrancas as any).asaasPaymentId;
    expect(col.isUnique).toBe(true);
  });
});

// ── Documentação de testes de integração ─────────────────────────────────────
//
// Os testes abaixo requerem banco real (Neon) e são executados em CI de integração.
//
// [Integração] Insert em notificacao_garantia com step='email_enviado' persiste corretamente
// [Integração] Insert em asaas_accounts com org_id duplicado falha com constraint unique
// [Integração] Insert em cobrancas com asaas_payment_id duplicado falha com constraint unique
// [Integração] Insert em anexos com processo_id inválido falha com FK violation
// [Integração] Insert em users com whatsapp_numero = null não falha (coluna nullable)
// [Integração] org_members.is_backup_contato tem default false para linhas existentes
// [Integração] Migration completa sem erro em banco Neon com dados existentes
// [Integração] FK de notificacao_garantia.responsavel_id referencia users.id válido
// [Integração] Cascade DELETE: deletar processos remove anexos associados
