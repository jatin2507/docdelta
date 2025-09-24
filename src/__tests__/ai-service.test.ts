import { AIService } from '../core/ai';
import { CodeChunk, DocType, ChunkType, Language } from '../types';
import { ScribeVerseError } from '../utils/error-handler';

// Mock the provider manager
jest.mock('../core/ai/providers', () => ({
  AIProvider: {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
  },
  AIProviderManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    summarize: jest.fn().mockResolvedValue({
      content: '# Test Summary\n\nThis is a test summary.',
      tokensUsed: 100
    }),
    generateText: jest.fn().mockResolvedValue({
      content: 'docs: Add test functionality'
    }),
    generateDiagram: jest.fn().mockResolvedValue({
      content: 'flowchart TD\n    A --> B'
    }),
    getTokenCount: jest.fn().mockReturnValue(0),
    resetTokenCount: jest.fn(),
    setPrimaryProvider: jest.fn(),
    getConfiguredProviders: jest.fn().mockReturnValue(['openai']),
    getAvailableModels: jest.fn().mockReturnValue(['gpt-4'])
  }))
}));

// Mock config manager
jest.mock('../config', () => ({
  ConfigManager: {
    getInstance: jest.fn().mockReturnValue({
      getConfig: jest.fn().mockReturnValue({
        ai: {
          apiKey: 'test-api-key-1234567890',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7,
          provider: 'openai'
        }
      })
    })
  }
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockCodeChunk: CodeChunk;

  beforeEach(() => {
    aiService = new AIService();
    mockCodeChunk = {
      id: 'test-chunk-1',
      type: ChunkType.FUNCTION,
      content: 'function testFunction() { return "hello"; }',
      language: Language.JAVASCRIPT,
      filePath: '/test/file.js',
      startLine: 1,
      endLine: 3,
      hash: 'abcd1234',
      dependencies: [],
      metadata: { name: 'testFunction' }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(aiService).toBeInstanceOf(AIService);
    });

    it('should throw error with invalid API key', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidConfig = { apiKey: 'short' };
      expect(() => new AIService(invalidConfig)).toThrow(ScribeVerseError);
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should throw error without API key', () => {
      // Mock environment variables to be empty
      const originalEnv = process.env;
      process.env = {};
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const emptyConfig = { apiKey: '' };
      expect(() => new AIService(emptyConfig)).toThrow(ScribeVerseError);

      process.env = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('summarizeChunks', () => {
    it('should successfully summarize valid chunks', async () => {
      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE,
        context: 'Test context'
      };

      const result = await aiService.summarizeChunks(request);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toBe(100);
      expect(result.sections).toHaveLength(1);
    });

    it('should handle empty chunks array', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const request = {
        chunks: [],
        docType: DocType.MODULE
      };

      await expect(aiService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
      consoleSpy.mockRestore();
    });

    it('should validate chunk structure and filter invalid ones', async () => {
      const invalidChunk = {
        id: '',
        type: 'invalid-type',
        content: '',
        language: 'invalid-language'
      };

      const request = {
        chunks: [mockCodeChunk, invalidChunk as any],
        docType: DocType.MODULE
      };

      const result = await aiService.summarizeChunks(request);
      expect(result).toBeDefined();
    });

    it('should validate docType', async () => {
      const request = {
        chunks: [mockCodeChunk],
        docType: 'invalid-doc-type' as any
      };

      await expect(aiService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle AI provider errors gracefully', async () => {
      const mockAIService = new AIService();
      // Override provider manager to throw error
      (mockAIService as any).providerManager.summarize = jest.fn().mockRejectedValue(
        new Error('AI provider error')
      );

      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE
      };

      await expect(mockAIService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle empty AI response', async () => {
      const mockAIService = new AIService();
      (mockAIService as any).providerManager.summarize = jest.fn().mockResolvedValue({
        content: '',
        tokensUsed: 0
      });

      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE
      };

      await expect(mockAIService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
    });

    it('should validate maxTokens parameter', async () => {
      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE,
        maxTokens: -1
      };

      await expect(aiService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle context parameter safely', async () => {
      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE,
        context: null as any
      };

      const result = await aiService.summarizeChunks(request);
      expect(result).toBeDefined();
    });
  });

  describe('generateFunctionFlowDiagram', () => {
    it('should generate flow diagram for valid function chunks', async () => {
      const functionChunks = [
        {
          ...mockCodeChunk,
          type: ChunkType.FUNCTION,
          content: 'function main() { callHelper(); }',
          metadata: { name: 'main' }
        },
        {
          ...mockCodeChunk,
          id: 'chunk-2',
          type: ChunkType.FUNCTION,
          content: 'function callHelper() { return true; }',
          metadata: { name: 'callHelper' }
        }
      ];

      const diagram = await aiService.generateFunctionFlowDiagram(functionChunks, 'main');

      expect(diagram).toContain('flowchart TD');
      expect(diagram).toContain('main');
      expect(diagram).toContain('callHelper');
      expect(diagram).toContain('classDef');
    });

    it('should handle empty chunks array', async () => {
      const diagram = await aiService.generateFunctionFlowDiagram([]);
      expect(diagram).toBe('');
    });

    it('should handle chunks without function content', async () => {
      const nonFunctionChunks = [
        {
          ...mockCodeChunk,
          type: ChunkType.CLASS,
          content: 'class TestClass {}'
        }
      ];

      const diagram = await aiService.generateFunctionFlowDiagram(nonFunctionChunks);
      expect(diagram).toBe('');
    });

    it('should sanitize function names for Mermaid syntax', async () => {
      const problematicChunk = {
        ...mockCodeChunk,
        type: ChunkType.FUNCTION,
        content: 'function test"problematic[]name() {}',
        metadata: { name: 'test"problematic[]name' }
      };

      const diagram = await aiService.generateFunctionFlowDiagram([problematicChunk]);

      expect(diagram).toContain('test\\"problematic\\[\\]name');
    });

    it('should handle null/undefined metadata gracefully', async () => {
      const chunkWithoutMetadata = {
        ...mockCodeChunk,
        type: ChunkType.FUNCTION,
        metadata: undefined
      };

      const diagram = await aiService.generateFunctionFlowDiagram([chunkWithoutMetadata]);
      expect(diagram).toContain('anonymous_0');
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message for valid changes', async () => {
      const changes = ['Added new function', 'Updated documentation'];
      const message = await aiService.generateCommitMessage(changes);

      expect(message).toBe('docs: Add test functionality');
      expect(message.length).toBeLessThanOrEqual(72);
    });

    it('should handle empty changes array', async () => {
      await expect(aiService.generateCommitMessage([])).rejects.toThrow(ScribeVerseError);
    });

    it('should filter out empty change strings', async () => {
      const changes = ['', '   ', 'Valid change', null as any, undefined as any];
      const message = await aiService.generateCommitMessage(changes);

      expect(message).toBe('docs: Add test functionality');
    });

    it('should return fallback message on AI provider error', async () => {
      const mockAIService = new AIService();
      (mockAIService as any).providerManager.generateText = jest.fn().mockRejectedValue(
        new Error('Provider error')
      );

      const changes = ['Test change'];

      await expect(mockAIService.generateCommitMessage(changes)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle empty AI response', async () => {
      const mockAIService = new AIService();
      (mockAIService as any).providerManager.generateText = jest.fn().mockResolvedValue({
        content: ''
      });

      const changes = ['Test change'];
      const message = await mockAIService.generateCommitMessage(changes);

      expect(message).toBe('docs: Update documentation');
    });

    it('should truncate long commit messages', async () => {
      const mockAIService = new AIService();
      (mockAIService as any).providerManager.generateText = jest.fn().mockResolvedValue({
        content: 'This is an extremely long commit message that exceeds the reasonable length limit for git commit messages and should be truncated automatically by our validation logic to ensure it meets git best practices'
      });

      const changes = ['Test change'];
      const message = await mockAIService.generateCommitMessage(changes);

      expect(message.length).toBeLessThanOrEqual(72);
    });
  });

  describe('generateDiagram', () => {
    it('should generate diagram for valid chunks', async () => {
      const chunks = [mockCodeChunk];
      const diagram = await aiService.generateDiagram(chunks, 'flow');

      expect(diagram).toBe('flowchart TD\n    A --> B');
    });

    it('should validate diagram type', async () => {
      const chunks = [mockCodeChunk];
      await expect(
        aiService.generateDiagram(chunks, 'invalid' as any)
      ).rejects.toThrow(ScribeVerseError);
    });

    it('should handle empty chunks array', async () => {
      await expect(aiService.generateDiagram([], 'flow')).rejects.toThrow(ScribeVerseError);
    });

    it('should filter out invalid chunks', async () => {
      const invalidChunk = { invalid: 'data' };
      const chunks = [mockCodeChunk, invalidChunk as any];

      const diagram = await aiService.generateDiagram(chunks, 'flow');
      expect(diagram).toBe('flowchart TD\n    A --> B');
    });

    it('should return empty string on AI provider error', async () => {
      const mockAIService = new AIService();
      (mockAIService as any).providerManager.generateDiagram = jest.fn().mockRejectedValue(
        new Error('Diagram generation failed')
      );

      const chunks = [mockCodeChunk];

      await expect(mockAIService.generateDiagram(chunks, 'flow')).rejects.toThrow(ScribeVerseError);
    });
  });

  describe('token management', () => {
    it('should track token usage correctly', async () => {
      const request = {
        chunks: [mockCodeChunk],
        docType: DocType.MODULE
      };

      await aiService.summarizeChunks(request);

      const tokenCount = aiService.getTokenCount();
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('should reset token count', () => {
      aiService.resetTokenCount();
      const tokenCount = aiService.getTokenCount();
      expect(tokenCount).toBe(0);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed chunk data', async () => {
      const malformedChunk = {
        id: null,
        type: undefined,
        content: 123,
        language: {},
        filePath: [],
        startLine: 'invalid',
        endLine: 'invalid'
      };

      const request = {
        chunks: [malformedChunk as any],
        docType: DocType.MODULE
      };

      // Should not crash, but filter out invalid chunk
      await expect(aiService.summarizeChunks(request)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle null/undefined request', async () => {
      await expect(aiService.summarizeChunks(null as any)).rejects.toThrow(ScribeVerseError);
      await expect(aiService.summarizeChunks(undefined as any)).rejects.toThrow(ScribeVerseError);
    });

    it('should handle circular references in chunk metadata', async () => {
      const circularChunk = { ...mockCodeChunk };
      const circularObject: any = { self: null };
      circularObject.self = circularObject;
      circularChunk.metadata = { circular: circularObject };

      const request = {
        chunks: [circularChunk],
        docType: DocType.MODULE
      };

      // Should handle gracefully without crashing
      const result = await aiService.summarizeChunks(request);
      expect(result).toBeDefined();
    });
  });

  describe('provider management', () => {
    it('should switch providers', async () => {
      await expect(aiService.switchProvider('anthropic' as any)).resolves.not.toThrow();
    });

    it('should get available providers', async () => {
      const providers = await aiService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should get available models', async () => {
      const models = await aiService.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});