// ===== NEW FILE: src/utils/errors.js =====
// This file centralizes our custom error classes, promoting consistency.

/**
 * @class ApiError
 * @extends {Error}
 * @description A custom error class for handling API-specific errors with HTTP status codes.
 */
export class ApiError extends Error {
  /**
   * @param {number} httpStatus - The HTTP status code for the error.
   * @param {string} message - The error message.
   * @param {boolean} [isOperational=true] - A flag to distinguish programmer errors from operational errors.
   * @param {string} [stack=''] - Optional stack trace.
   */
  constructor(httpStatus, message, isOperational = true, stack = '') {
    super(message);
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Common error types for convenience
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

// ===== NEW SECTION BEING ADDED AT THE END OF THE FILE =====
// ... (previous ApiError, BadRequestError, etc. remain the same) ...

export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable') {
    super(503, message);
  }
}

// ===== COMPLETE FILE: src/utils/errors.js =====
// This file centralizes our custom error classes, promoting consistency.

/**
 * @class ApiError
 * @extends {Error}
 * @description A custom error class for handling API-specific errors with HTTP status codes.
 */
export class ApiError extends Error {
  /**
   * @param {number} httpStatus - The HTTP status code for the error.
   * @param {string} message - The error message.
   * @param {boolean} [isOperational=true] - A flag to distinguish programmer errors from operational errors.
   * @param {string} [stack=''] - Optional stack trace.
   */
  constructor(httpStatus, message, isOperational = true, stack = '') {
    super(message);
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Common error types for convenience
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class ServiceUnavailableError extends ApiError {
    constructor(message = 'Service Unavailable') {
      super(503, message);
    }
}
