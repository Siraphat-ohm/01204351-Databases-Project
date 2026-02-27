export interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = opts.code ?? 'APP_ERROR';
    this.statusCode = opts.statusCode ?? 500;
    this.details = opts.details;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', opts: Partial<AppErrorOptions> = {}) {
    super(message, { code: 'NOT_FOUND', statusCode: 404, ...opts });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', opts: Partial<AppErrorOptions> = {}) {
    super(message, { code: 'CONFLICT', statusCode: 409, ...opts });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', opts: Partial<AppErrorOptions> = {}) {
    super(message, { code: 'UNAUTHORIZED', statusCode: 403, ...opts });
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', opts: Partial<AppErrorOptions> = {}) {
    super(message, { code: 'BAD_REQUEST', statusCode: 400, ...opts });
  }
}

export class ValidationError extends BadRequestError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, { code: 'VALIDATION_ERROR', details });
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', opts: Partial<AppErrorOptions> = {}) {
    super(message, { code: 'INTERNAL', statusCode: 500, ...opts });
  }
}

export function toHttpResponse(err: unknown) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: err.toJSON(),
    };
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const e = new InternalServerError(message);
  return { status: e.statusCode, body: e.toJSON() };
}
