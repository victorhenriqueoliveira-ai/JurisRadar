/**
 * Erros de domínio centralizados para o JurisRadar SaaS.
 */

/** Erro lançado quando o usuário não está autenticado ou não tem sessão válida. */
export class UnauthorizedError extends Error {
  readonly status = 401

  constructor(message = 'Não autenticado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** Erro lançado quando o usuário não tem permissão para executar a ação. */
export class ForbiddenError extends Error {
  readonly status = 403

  constructor(message = 'Acesso negado') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** Erro lançado quando um recurso não é encontrado. */
export class NotFoundError extends Error {
  readonly status = 404

  constructor(message = 'Recurso não encontrado') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** Erro lançado quando a requisição contém dados inválidos. */
export class ValidationError extends Error {
  readonly status = 400

  constructor(message = 'Dados inválidos') {
    super(message)
    this.name = 'ValidationError'
  }
}
