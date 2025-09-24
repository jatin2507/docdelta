import { ValidationError } from './validation';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PARSER_ERROR = 'PARSER_ERROR',
  GENERATOR_ERROR = 'GENERATOR_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  operation?: string;
  file?: string;
  line?: number;
  component?: string;
  metadata?: Record<string, any>;
}

export class ScribeVerseError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'ScribeVerseError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScribeVerseError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp.toISOString(),
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHandlers: Map<ErrorCode, (error: ScribeVerseError) => void> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Register a custom error handler for specific error codes
   */
  registerHandler(code: ErrorCode, handler: (error: ScribeVerseError) => void): void {
    this.errorHandlers.set(code, handler);
  }

  /**
   * Handle an error with proper logging and context
   */
  handle(error: Error | ScribeVerseError, context: ErrorContext = {}): ScribeVerseError {
    let scribeError: ScribeVerseError;

    if (error instanceof ScribeVerseError) {
      scribeError = error;
      // Merge contexts - create new context object
      const mergedContext = { ...scribeError.context, ...context };
      scribeError = new ScribeVerseError(
        scribeError.message,
        scribeError.code,
        mergedContext,
        scribeError.originalError
      );
    } else {
      const code = this.determineErrorCode(error);
      scribeError = new ScribeVerseError(error.message, code, context, error);
    }

    // Log the error
    this.logError(scribeError);

    // Call custom handler if registered
    const handler = this.errorHandlers.get(scribeError.code);
    if (handler) {
      try {
        handler(scribeError);
      } catch (handlerError) {
        console.error('Error handler threw an exception:', handlerError);
      }
    }

    return scribeError;
  }

  /**
   * Safely execute an async function with error handling
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<{ success: true; data: T } | { success: false; error: ScribeVerseError }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const scribeError = this.handle(error as Error, context);
      return { success: false, error: scribeError };
    }
  }

  /**
   * Safely execute a sync function with error handling
   */
  safeExecuteSync<T>(
    operation: () => T,
    context: ErrorContext = {}
  ): { success: true; data: T } | { success: false; error: ScribeVerseError } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      const scribeError = this.handle(error as Error, context);
      return { success: false, error: scribeError };
    }
  }

  private determineErrorCode(error: Error): ErrorCode {
    if (error instanceof ValidationError) {
      return ErrorCode.VALIDATION_ERROR;
    }

    const message = error.message.toLowerCase();

    if (message.includes('enoent') || message.includes('file not found')) {
      return ErrorCode.FILE_SYSTEM_ERROR;
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('request')) {
      return ErrorCode.NETWORK_ERROR;
    }

    if (message.includes('config') || message.includes('setting')) {
      return ErrorCode.CONFIGURATION_ERROR;
    }

    if (message.includes('parse') || message.includes('syntax')) {
      return ErrorCode.PARSER_ERROR;
    }

    if (message.includes('ai') || message.includes('openai') || message.includes('anthropic')) {
      return ErrorCode.AI_SERVICE_ERROR;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  private logError(error: ScribeVerseError): void {
    const logMessage = [
      `🚨 [${error.code}] ${error.message}`,
      error.context.operation ? `Operation: ${error.context.operation}` : '',
      error.context.file ? `File: ${error.context.file}` : '',
      error.context.component ? `Component: ${error.context.component}` : '',
      error.context.metadata ? `Metadata: ${JSON.stringify(error.context.metadata)}` : '',
      error.originalError ? `Original: ${error.originalError.message}` : ''
    ].filter(Boolean).join('\n  ');

    console.error(logMessage);

    // In development, also log stack trace
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
      if (error.originalError?.stack) {
        console.error('Original stack trace:', error.originalError.stack);
      }
    }
  }
}

/**
 * Utility functions for common error handling patterns
 */
export const ErrorUtils = {
  /**
   * Wrap an async function to automatically handle errors
   */
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Partial<ErrorContext> = {}
  ) => {
    return async (...args: T): Promise<R> => {
      const errorHandler = ErrorHandler.getInstance();
      const result = await errorHandler.safeExecute(
        () => fn(...args),
        { ...context, operation: fn.name }
      );

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    };
  },

  /**
   * Wrap a sync function to automatically handle errors
   */
  withErrorHandlingSync: <T extends any[], R>(
    fn: (...args: T) => R,
    context: Partial<ErrorContext> = {}
  ) => {
    return (...args: T): R => {
      const errorHandler = ErrorHandler.getInstance();
      const result = errorHandler.safeExecuteSync(
        () => fn(...args),
        { ...context, operation: fn.name }
      );

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    };
  },

  /**
   * Create a validation error with context
   */
  validationError: (message: string, field?: string, value?: any): ScribeVerseError => {
    return new ScribeVerseError(
      message,
      ErrorCode.VALIDATION_ERROR,
      { metadata: { field, value } },
      new ValidationError(message, field, value)
    );
  },

  /**
   * Create a file system error with context
   */
  fileSystemError: (message: string, filePath?: string, originalError?: Error): ScribeVerseError => {
    return new ScribeVerseError(
      message,
      ErrorCode.FILE_SYSTEM_ERROR,
      { file: filePath },
      originalError
    );
  },

  /**
   * Create an AI service error with context
   */
  aiServiceError: (message: string, provider?: string, originalError?: Error): ScribeVerseError => {
    return new ScribeVerseError(
      message,
      ErrorCode.AI_SERVICE_ERROR,
      { metadata: { provider } },
      originalError
    );
  }
};