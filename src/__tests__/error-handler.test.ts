import {
  ErrorHandler,
  ScribeVerseError,
  ErrorCode,
  ErrorUtils
} from '../utils/error-handler';
import { ValidationError } from '../utils/validation';

describe('ScribeVerseError', () => {
  it('should create error with all properties', () => {
    const context = { operation: 'test', file: 'test.js' };
    const originalError = new Error('Original error');

    const error = new ScribeVerseError(
      'Test error',
      ErrorCode.VALIDATION_ERROR,
      context,
      originalError
    );

    expect(error).toBeInstanceOf(ScribeVerseError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.context).toEqual(context);
    expect(error.originalError).toBe(originalError);
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.name).toBe('ScribeVerseError');
  });

  it('should create error with minimal parameters', () => {
    const error = new ScribeVerseError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.context).toEqual({});
    expect(error.originalError).toBeUndefined();
  });

  it('should serialize to JSON properly', () => {
    const context = { operation: 'test' };
    const originalError = new Error('Original');
    const error = new ScribeVerseError('Test', ErrorCode.AI_SERVICE_ERROR, context, originalError);

    const json = error.toJSON();

    expect(json.name).toBe('ScribeVerseError');
    expect(json.message).toBe('Test');
    expect(json.code).toBe(ErrorCode.AI_SERVICE_ERROR);
    expect(json.context).toEqual(context);
    expect(json.timestamp).toBeDefined();
    expect(json.originalError).toEqual({
      name: 'Error',
      message: 'Original',
      stack: originalError.stack
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handle', () => {
    it('should handle regular Error', () => {
      const originalError = new Error('Test error');
      const context = { operation: 'test' };

      const result = errorHandler.handle(originalError, context);

      expect(result).toBeInstanceOf(ScribeVerseError);
      expect(result.message).toBe('Test error');
      expect(result.context).toEqual(context);
      expect(result.originalError).toBe(originalError);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle ScribeVerseError and merge contexts', () => {
      const originalContext = { file: 'test.js' };
      const additionalContext = { operation: 'test' };
      const scribeError = new ScribeVerseError('Test', ErrorCode.AI_SERVICE_ERROR, originalContext);

      const result = errorHandler.handle(scribeError, additionalContext);

      expect(result).toBeInstanceOf(ScribeVerseError);
      expect(result.context).toEqual({ file: 'test.js', operation: 'test' });
    });

    it('should determine error code from ValidationError', () => {
      const validationError = new ValidationError('Invalid input');

      const result = errorHandler.handle(validationError);

      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should determine error code from error message content', () => {
      const fileError = new Error('ENOENT: file not found');
      const networkError = new Error('Network request failed');
      const configError = new Error('Invalid configuration setting');

      expect(errorHandler.handle(fileError).code).toBe(ErrorCode.FILE_SYSTEM_ERROR);
      expect(errorHandler.handle(networkError).code).toBe(ErrorCode.NETWORK_ERROR);
      expect(errorHandler.handle(configError).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    });

    it('should default to UNKNOWN_ERROR for unrecognized errors', () => {
      const unknownError = new Error('Some random error');

      const result = errorHandler.handle(unknownError);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('registerHandler', () => {
    it('should register and call custom error handler', () => {
      const customHandler = jest.fn();
      errorHandler.registerHandler(ErrorCode.VALIDATION_ERROR, customHandler);

      const validationError = new ValidationError('Test validation error');
      errorHandler.handle(validationError);

      expect(customHandler).toHaveBeenCalledWith(expect.any(ScribeVerseError));
    });

    it('should handle custom handler errors gracefully', () => {
      const faultyHandler = jest.fn(() => { throw new Error('Handler error'); });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      errorHandler.registerHandler(ErrorCode.VALIDATION_ERROR, faultyHandler);

      const validationError = new ValidationError('Test');
      expect(() => errorHandler.handle(validationError)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handler threw an exception:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('safeExecute', () => {
    it('should return successful result for successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.safeExecute(operation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
      expect(operation).toHaveBeenCalled();
    });

    it('should return error result for failed operation', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const context = { operation: 'test' };

      const result = await errorHandler.safeExecute(operation, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ScribeVerseError);
        expect(result.error.message).toBe('Operation failed');
        expect(result.error.context.operation).toBe('test');
      }
    });
  });

  describe('safeExecuteSync', () => {
    it('should return successful result for successful sync operation', () => {
      const operation = jest.fn().mockReturnValue('sync success');

      const result = errorHandler.safeExecuteSync(operation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('sync success');
      }
    });

    it('should return error result for failed sync operation', () => {
      const operation = jest.fn(() => { throw new Error('Sync operation failed'); });

      const result = errorHandler.safeExecuteSync(operation);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ScribeVerseError);
        expect(result.error.message).toBe('Sync operation failed');
      }
    });
  });

  describe('logging behavior', () => {
    it('should log error with context information', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test-operation',
        file: 'test-file.js',
        component: 'TestComponent'
      };

      errorHandler.handle(error, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [UNKNOWN_ERROR] Test error')
      );
    });

    it('should log stack trace in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      errorHandler.handle(error);

      expect(consoleSpy).toHaveBeenCalledWith('Stack trace:', expect.any(String));

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});

describe('ErrorUtils', () => {
  describe('withErrorHandling', () => {
    it('should wrap async function with error handling', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ErrorUtils.withErrorHandling(asyncFn, { component: 'test' });

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throw ScribeVerseError for async function failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = ErrorUtils.withErrorHandling(asyncFn, { component: 'test' });

      await expect(wrappedFn()).rejects.toThrow(ScribeVerseError);
      consoleSpy.mockRestore();
    });
  });

  describe('withErrorHandlingSync', () => {
    it('should wrap sync function with error handling', () => {
      const syncFn = jest.fn().mockReturnValue('sync success');
      const wrappedFn = ErrorUtils.withErrorHandlingSync(syncFn, { component: 'test' });

      const result = wrappedFn('arg1');

      expect(result).toBe('sync success');
      expect(syncFn).toHaveBeenCalledWith('arg1');
    });

    it('should throw ScribeVerseError for sync function failures', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const syncFn = jest.fn(() => { throw new Error('Sync error'); });
      const wrappedFn = ErrorUtils.withErrorHandlingSync(syncFn, { component: 'test' });

      expect(() => wrappedFn()).toThrow(ScribeVerseError);
      consoleSpy.mockRestore();
    });
  });

  describe('error creation utilities', () => {
    it('should create validation error', () => {
      const error = ErrorUtils.validationError('Invalid field', 'fieldName', 'fieldValue');

      expect(error).toBeInstanceOf(ScribeVerseError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.context.metadata?.field).toBe('fieldName');
      expect(error.context.metadata?.value).toBe('fieldValue');
    });

    it('should create file system error', () => {
      const originalError = new Error('File not found');
      const error = ErrorUtils.fileSystemError('Cannot read file', '/path/to/file', originalError);

      expect(error).toBeInstanceOf(ScribeVerseError);
      expect(error.code).toBe(ErrorCode.FILE_SYSTEM_ERROR);
      expect(error.context.file).toBe('/path/to/file');
      expect(error.originalError).toBe(originalError);
    });

    it('should create AI service error', () => {
      const originalError = new Error('API rate limit exceeded');
      const error = ErrorUtils.aiServiceError('AI service unavailable', 'openai', originalError);

      expect(error).toBeInstanceOf(ScribeVerseError);
      expect(error.code).toBe(ErrorCode.AI_SERVICE_ERROR);
      expect(error.context.metadata?.provider).toBe('openai');
      expect(error.originalError).toBe(originalError);
    });
  });
});

describe('ErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.AI_SERVICE_ERROR).toBe('AI_SERVICE_ERROR');
    expect(ErrorCode.FILE_SYSTEM_ERROR).toBe('FILE_SYSTEM_ERROR');
    expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorCode.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
    expect(ErrorCode.PARSER_ERROR).toBe('PARSER_ERROR');
    expect(ErrorCode.GENERATOR_ERROR).toBe('GENERATOR_ERROR');
    expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });
});