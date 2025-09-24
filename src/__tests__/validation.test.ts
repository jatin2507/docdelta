import { ValidationUtils, ValidationError } from '../utils/validation';
import { DocType, ChunkType, Language } from '../types';

describe('ValidationUtils', () => {
  describe('required', () => {
    it('should return value if not null/undefined', () => {
      expect(ValidationUtils.required('test', 'field')).toBe('test');
      expect(ValidationUtils.required(0, 'field')).toBe(0);
      expect(ValidationUtils.required(false, 'field')).toBe(false);
      expect(ValidationUtils.required([], 'field')).toEqual([]);
    });

    it('should throw ValidationError for null/undefined', () => {
      expect(() => ValidationUtils.required(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.required(undefined, 'field')).toThrow(ValidationError);
    });
  });

  describe('nonEmptyString', () => {
    it('should return trimmed string for valid input', () => {
      expect(ValidationUtils.nonEmptyString('  test  ', 'field')).toBe('test');
      expect(ValidationUtils.nonEmptyString('hello world', 'field')).toBe('hello world');
    });

    it('should throw ValidationError for invalid input', () => {
      expect(() => ValidationUtils.nonEmptyString('', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyString('   ', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyString(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyString(undefined, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyString(123 as any, 'field')).toThrow(ValidationError);
    });
  });

  describe('numberInRange', () => {
    it('should return number for valid input', () => {
      expect(ValidationUtils.numberInRange(5, 'field', 1, 10)).toBe(5);
      expect(ValidationUtils.numberInRange(0, 'field')).toBe(0);
      expect(ValidationUtils.numberInRange(-100, 'field', -200, 200)).toBe(-100);
    });

    it('should throw ValidationError for invalid input', () => {
      expect(() => ValidationUtils.numberInRange(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.numberInRange(undefined, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.numberInRange('string' as any, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.numberInRange(NaN, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.numberInRange(5, 'field', 10, 20)).toThrow(ValidationError);
      expect(() => ValidationUtils.numberInRange(25, 'field', 10, 20)).toThrow(ValidationError);
    });
  });

  describe('nonEmptyArray', () => {
    it('should return array for valid input', () => {
      expect(ValidationUtils.nonEmptyArray([1, 2, 3], 'field')).toEqual([1, 2, 3]);
      expect(ValidationUtils.nonEmptyArray(['test'], 'field')).toEqual(['test']);
    });

    it('should throw ValidationError for invalid input', () => {
      expect(() => ValidationUtils.nonEmptyArray([], 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyArray(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyArray(undefined, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyArray('string' as any, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.nonEmptyArray(123 as any, 'field')).toThrow(ValidationError);
    });
  });

  describe('validFilePath', () => {
    it('should return valid file path', () => {
      expect(ValidationUtils.validFilePath('/path/to/file.txt', 'field')).toBe('/path/to/file.txt');
      expect(ValidationUtils.validFilePath('./relative/path.js', 'field')).toBe('./relative/path.js');
      expect(ValidationUtils.validFilePath('C:\\Windows\\file.txt', 'field')).toBe('C:\\Windows\\file.txt');
    });

    it('should throw ValidationError for invalid paths', () => {
      expect(() => ValidationUtils.validFilePath('', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validFilePath(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validFilePath('../../../etc/passwd', 'field')).toThrow(ValidationError);
    });
  });

  describe('validDocType', () => {
    it('should return valid DocType', () => {
      expect(ValidationUtils.validDocType(DocType.MODULE, 'field')).toBe(DocType.MODULE);
      expect(ValidationUtils.validDocType(DocType.API_REFERENCE, 'field')).toBe(DocType.API_REFERENCE);
    });

    it('should throw ValidationError for invalid DocType', () => {
      expect(() => ValidationUtils.validDocType('invalid', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validDocType('', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validDocType(null, 'field')).toThrow(ValidationError);
    });
  });

  describe('validCodeChunk', () => {
    const validChunk = {
      id: 'test-chunk',
      type: ChunkType.FUNCTION,
      content: 'function test() {}',
      language: Language.JAVASCRIPT,
      filePath: '/test/file.js',
      startLine: 1,
      endLine: 3,
      hash: 'abc123',
      dependencies: [],
      metadata: { name: 'test' }
    };

    it('should return valid CodeChunk for correct input', () => {
      const result = ValidationUtils.validCodeChunk(validChunk, 0);
      expect(result).toMatchObject(validChunk);
      expect(result.type).toBe(ChunkType.FUNCTION);
      expect(result.language).toBe(Language.JAVASCRIPT);
    });

    it('should throw ValidationError for null/undefined chunk', () => {
      expect(() => ValidationUtils.validCodeChunk(null, 0)).toThrow(ValidationError);
      expect(() => ValidationUtils.validCodeChunk(undefined, 0)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid chunk type', () => {
      const invalidChunk = { ...validChunk, type: 'invalid-type' };
      expect(() => ValidationUtils.validCodeChunk(invalidChunk, 0)).toThrow(ValidationError);
    });

    it('should handle unknown language gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const unknownLanguageChunk = { ...validChunk, language: 'unknown-language' };
      const result = ValidationUtils.validCodeChunk(unknownLanguageChunk, 0);
      expect(result.language).toBe(Language.UNKNOWN);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should validate line numbers', () => {
      const invalidLinesChunk = { ...validChunk, startLine: 5, endLine: 3 };
      const result = ValidationUtils.validCodeChunk(invalidLinesChunk, 0);
      // The validation corrects endLine to be at least equal to startLine
      expect(result.startLine).toBe(5);
      expect(result.endLine).toBeGreaterThanOrEqual(result.startLine);
    });

    it('should handle missing optional fields', () => {
      const minimalChunk = {
        id: 'test',
        type: ChunkType.FUNCTION,
        content: 'test content',
        language: Language.JAVASCRIPT,
        filePath: '/test.js',
        startLine: 1,
        endLine: 1
      };

      const result = ValidationUtils.validCodeChunk(minimalChunk, 0);
      expect(result.hash).toBe('');
      expect(result.dependencies).toEqual([]);
      expect(result.metadata).toEqual({});
    });
  });

  describe('validTemperature', () => {
    it('should return valid temperature', () => {
      expect(ValidationUtils.validTemperature(0.5, 'field')).toBe(0.5);
      expect(ValidationUtils.validTemperature(0, 'field')).toBe(0);
      expect(ValidationUtils.validTemperature(2, 'field')).toBe(2);
    });

    it('should return default for null/undefined', () => {
      expect(ValidationUtils.validTemperature(null, 'field')).toBe(0.7);
      expect(ValidationUtils.validTemperature(undefined, 'field')).toBe(0.7);
    });

    it('should throw ValidationError for out of range', () => {
      expect(() => ValidationUtils.validTemperature(-1, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validTemperature(3, 'field')).toThrow(ValidationError);
    });
  });

  describe('validMaxTokens', () => {
    it('should return valid maxTokens', () => {
      expect(ValidationUtils.validMaxTokens(1000, 'field')).toBe(1000);
      expect(ValidationUtils.validMaxTokens(1, 'field')).toBe(1);
      expect(ValidationUtils.validMaxTokens(128000, 'field')).toBe(128000);
    });

    it('should return default for null/undefined', () => {
      expect(ValidationUtils.validMaxTokens(null, 'field')).toBe(2000);
      expect(ValidationUtils.validMaxTokens(undefined, 'field')).toBe(2000);
    });

    it('should throw ValidationError for out of range', () => {
      expect(() => ValidationUtils.validMaxTokens(0, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validMaxTokens(200000, 'field')).toThrow(ValidationError);
    });
  });

  describe('safeString', () => {
    it('should return string for string input', () => {
      expect(ValidationUtils.safeString('test')).toBe('test');
      expect(ValidationUtils.safeString('')).toBe('');
    });

    it('should convert other types to string', () => {
      expect(ValidationUtils.safeString(123)).toBe('123');
      expect(ValidationUtils.safeString(true)).toBe('true');
      expect(ValidationUtils.safeString(false)).toBe('false');
    });

    it('should return empty string for null/undefined', () => {
      expect(ValidationUtils.safeString(null)).toBe('');
      expect(ValidationUtils.safeString(undefined)).toBe('');
    });

    it('should handle conversion errors gracefully', () => {
      const problematicObject = { toString: () => { throw new Error('Cannot convert'); } };
      expect(ValidationUtils.safeString(problematicObject)).toBe('');
    });
  });

  describe('safeNumber', () => {
    it('should return number for valid number input', () => {
      expect(ValidationUtils.safeNumber(123)).toBe(123);
      expect(ValidationUtils.safeNumber(0)).toBe(0);
      expect(ValidationUtils.safeNumber(-456)).toBe(-456);
    });

    it('should convert string numbers', () => {
      expect(ValidationUtils.safeNumber('123')).toBe(123);
      expect(ValidationUtils.safeNumber('45.67')).toBe(45.67);
      expect(ValidationUtils.safeNumber('-89')).toBe(-89);
    });

    it('should return default for invalid input', () => {
      expect(ValidationUtils.safeNumber('not-a-number')).toBe(0);
      expect(ValidationUtils.safeNumber(null)).toBe(0);
      expect(ValidationUtils.safeNumber(undefined)).toBe(0);
      expect(ValidationUtils.safeNumber(NaN)).toBe(0);
    });

    it('should use custom default value', () => {
      expect(ValidationUtils.safeNumber('invalid', 42)).toBe(42);
      expect(ValidationUtils.safeNumber(null, -1)).toBe(-1);
    });
  });

  describe('validApiKey', () => {
    it('should return valid API key', () => {
      const validKey = 'sk-1234567890abcdef';
      expect(ValidationUtils.validApiKey(validKey, 'field')).toBe(validKey);
    });

    it('should throw ValidationError for short keys', () => {
      expect(() => ValidationUtils.validApiKey('short', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validApiKey('123456789', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for placeholder keys', () => {
      expect(() => ValidationUtils.validApiKey('your-api-key', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validApiKey('sk-placeholder', 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validApiKey('enter-your-key', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for null/undefined', () => {
      expect(() => ValidationUtils.validApiKey(null, 'field')).toThrow(ValidationError);
      expect(() => ValidationUtils.validApiKey(undefined, 'field')).toThrow(ValidationError);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with message', () => {
      const error = new ValidationError('Test error');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
    });

    it('should store field and value information', () => {
      const error = new ValidationError('Test error', 'testField', 'testValue');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
    });
  });
});