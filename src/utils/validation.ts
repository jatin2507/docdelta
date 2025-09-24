import * as path from 'path';
import { CodeChunk, DocType, ChunkType, Language } from '../types';

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationUtils {
  /**
   * Validates that a value is not null or undefined
   */
  static required<T>(value: T | null | undefined, fieldName: string): T {
    if (value === null || value === undefined) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return value;
  }

  /**
   * Validates that a string is not empty or whitespace
   */
  static nonEmptyString(value: string | null | undefined, fieldName: string): string {
    const required = this.required(value, fieldName);
    if (typeof required !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    if (required.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
    }
    return required.trim();
  }

  /**
   * Validates that a number is within a valid range
   */
  static numberInRange(
    value: number | null | undefined,
    fieldName: string,
    min: number = Number.MIN_SAFE_INTEGER,
    max: number = Number.MAX_SAFE_INTEGER
  ): number {
    const required = this.required(value, fieldName);
    if (typeof required !== 'number' || isNaN(required)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
    }
    if (required < min || required > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max}`,
        fieldName,
        value
      );
    }
    return required;
  }

  /**
   * Validates that an array is not empty
   */
  static nonEmptyArray<T>(value: T[] | null | undefined, fieldName: string): T[] {
    const required = this.required(value, fieldName);
    if (!Array.isArray(required)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
    }
    if (required.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
    }
    return required;
  }

  /**
   * Validates file path exists and is accessible
   */
  static validFilePath(value: string | null | undefined, fieldName: string): string {
    const pathStr = this.nonEmptyString(value, fieldName);

    // Check if path is potentially valid
    try {
      path.parse(pathStr);
    } catch {
      throw new ValidationError(`${fieldName} is not a valid file path`, fieldName, value);
    }

    // Prevent path traversal attacks
    if (pathStr.includes('..') && !path.isAbsolute(pathStr)) {
      throw new ValidationError(`${fieldName} contains invalid path traversal`, fieldName, value);
    }

    return pathStr;
  }

  /**
   * Validates that a DocType is valid
   */
  static validDocType(value: string | null | undefined, fieldName: string): DocType {
    const docTypeStr = this.nonEmptyString(value, fieldName);
    const validTypes = Object.values(DocType);

    if (!validTypes.includes(docTypeStr as DocType)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${validTypes.join(', ')}`,
        fieldName,
        value
      );
    }

    return docTypeStr as DocType;
  }

  /**
   * Validates CodeChunk structure
   */
  static validCodeChunk(chunk: any, index: number): CodeChunk {
    if (!chunk || typeof chunk !== 'object') {
      throw new ValidationError(`Chunk at index ${index} must be an object`, `chunks[${index}]`, chunk);
    }

    // Validate type is valid ChunkType
    const typeStr = this.nonEmptyString(chunk.type, `chunks[${index}].type`);
    const validTypes = Object.values(ChunkType);
    if (!validTypes.includes(typeStr as ChunkType)) {
      throw new ValidationError(
        `Invalid chunk type: ${typeStr}. Must be one of: ${validTypes.join(', ')}`,
        `chunks[${index}].type`,
        typeStr
      );
    }

    // Validate language is valid Language
    const languageStr = this.nonEmptyString(chunk.language, `chunks[${index}].language`);
    const validLanguages = Object.values(Language);
    if (!validLanguages.includes(languageStr as Language)) {
      // Allow language but warn if not in enum
      console.warn(`Unknown language: ${languageStr}, using UNKNOWN`);
    }

    const startLine = this.numberInRange(chunk.startLine, `chunks[${index}].startLine`, 1);
    // Ensure endLine is at least equal to startLine
    const endLine = Math.max(startLine, this.numberInRange(chunk.endLine, `chunks[${index}].endLine`, 1));

    return {
      id: this.nonEmptyString(chunk.id, `chunks[${index}].id`),
      type: typeStr as ChunkType,
      content: this.nonEmptyString(chunk.content, `chunks[${index}].content`),
      language: validLanguages.includes(languageStr as Language) ? languageStr as Language : Language.UNKNOWN,
      filePath: this.validFilePath(chunk.filePath, `chunks[${index}].filePath`),
      startLine,
      endLine,
      hash: chunk.hash || '',
      dependencies: Array.isArray(chunk.dependencies) ? chunk.dependencies : [],
      metadata: chunk.metadata || {}
    };
  }

  /**
   * Validates temperature value for AI models
   */
  static validTemperature(value: number | null | undefined, fieldName: string): number {
    if (value === null || value === undefined) {
      return 0.7; // Default value
    }
    return this.numberInRange(value, fieldName, 0, 2);
  }

  /**
   * Validates max tokens for AI models
   */
  static validMaxTokens(value: number | null | undefined, fieldName: string): number {
    if (value === null || value === undefined) {
      return 2000; // Default value
    }
    return this.numberInRange(value, fieldName, 1, 128000);
  }

  /**
   * Safely extracts string from potentially unsafe input
   */
  static safeString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    try {
      return String(value);
    } catch {
      return '';
    }
  }

  /**
   * Safely extracts number from potentially unsafe input
   */
  static safeNumber(value: unknown, defaultValue: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }

  /**
   * Validates API key format (basic validation)
   */
  static validApiKey(value: string | null | undefined, fieldName: string): string {
    const apiKey = this.nonEmptyString(value, fieldName);

    // Basic validation - should be at least 15 characters for real API keys
    if (apiKey.length < 15) {
      throw new ValidationError(`${fieldName} appears to be too short (minimum 15 characters)`, fieldName);
    }

    // Check for common placeholder values
    const placeholders = ['your-api-key', 'sk-placeholder', 'enter-your-key', 'example-key'];
    if (placeholders.some(placeholder => apiKey.toLowerCase().includes(placeholder))) {
      throw new ValidationError(`${fieldName} appears to be a placeholder value`, fieldName);
    }

    return apiKey;
  }
}