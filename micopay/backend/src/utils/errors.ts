export class AppError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public devMessage: string,
    public httpStatus: number,
  ) {
    super(devMessage);
    this.name = this.constructor.name;
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 401) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 400) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class TradeStateError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 409) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 404) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class RateLimitError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 429) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class UpstreamError extends AppError {
  constructor(code: string, userMessage: string, devMessage: string, httpStatus = 502) {
    super(code, userMessage, devMessage, httpStatus);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', public retryAfter?: number) {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when a Stellar tx hash has already been processed.
 * HTTP 409 — the outcome of a replayed tx is deterministic, so this is
 * a conflict rather than a validation failure.
 */
export class ReplayError extends AppError {
  public readonly txHash: string;
  public readonly originalRoute: string;

  constructor(txHash: string, originalRoute: string) {
    super(409, `Stellar tx ${txHash} has already been processed via ${originalRoute}`);
    this.name = 'ReplayError';
    this.txHash = txHash;
    this.originalRoute = originalRoute;
  }
}
