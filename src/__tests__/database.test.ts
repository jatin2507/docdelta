import { DatabaseManager, TokenUsageRecord } from '../core/database';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('DatabaseManager', () => {
  let db: DatabaseManager;
  let tempDbPath: string;

  beforeAll(async () => {
    // Create a temporary directory for test database
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docdelta-test-'));
    tempDbPath = path.join(tempDir, 'test.db');
  });

  beforeEach(async () => {
    db = new DatabaseManager();
    // Override the database path for testing
    (db as any).dbPath = tempDbPath;
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    if (await fs.pathExists(tempDbPath)) {
      await fs.unlink(tempDbPath);
    }
  });

  afterAll(async () => {
    const tempDir = path.dirname(tempDbPath);
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Initialization', () => {
    test('should initialize database successfully', async () => {
      expect(await fs.pathExists(tempDbPath)).toBe(true);
    });

    test('should create required tables', async () => {
      const dbInfo = await db.getDatabaseInfo();
      expect(dbInfo.path).toBe(tempDbPath);
      expect(dbInfo.totalRecords).toBe(0);
      expect(typeof dbInfo.sessionId).toBe('string');
    });

    test('should generate unique session ID', async () => {
      const sessionId1 = db.getCurrentSessionId();
      const db2 = new DatabaseManager();
      const tempDbPath2 = tempDbPath + '2';
      (db2 as any).dbPath = tempDbPath2;
      const sessionId2 = db2.getCurrentSessionId();

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);

      await db2.close();
      if (await fs.pathExists(tempDbPath2)) {
        await fs.unlink(tempDbPath2);
      }
    });
  });

  describe('Token Usage Recording', () => {
    test('should record token usage', async () => {
      const usage: Omit<TokenUsageRecord, 'id' | 'timestamp' | 'sessionId'> = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        promptTokens: 100,
        completionTokens: 50,
        operation: 'generateText',
        cost: 0.0001
      };

      await db.recordTokenUsage(usage);

      const history = await db.getUsageHistory(10);
      expect(history).toHaveLength(1);
      expect(history[0].provider).toBe('openai');
      expect(history[0].model).toBe('gpt-4o-mini');
      expect(history[0].tokensUsed).toBe(150);
      expect(history[0].operation).toBe('generateText');
      expect(history[0].cost).toBe(0.0001);
    });

    test('should record multiple usage entries', async () => {
      const usages = [
        {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tokensUsed: 100,
          operation: 'generateText'
        },
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          tokensUsed: 200,
          operation: 'analyzeCode'
        },
        {
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: 300,
          operation: 'summarize'
        }
      ];

      for (const usage of usages) {
        await db.recordTokenUsage(usage);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = await db.getUsageHistory(10);
      expect(history).toHaveLength(3);

      // Check that all entries are present
      const providers = history.map(h => h.provider);
      const models = history.map(h => h.model);

      expect(providers.filter(p => p === 'openai')).toHaveLength(2);
      expect(providers.filter(p => p === 'anthropic')).toHaveLength(1);
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('claude-3-5-sonnet');
      expect(models).toContain('gpt-4');
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(async () => {
      // Add test data
      const usages = [
        {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tokensUsed: 100,
          promptTokens: 70,
          completionTokens: 30,
          operation: 'generateText',
          cost: 0.00005
        },
        {
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: 200,
          promptTokens: 150,
          completionTokens: 50,
          operation: 'generateText',
          cost: 0.001
        },
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          tokensUsed: 150,
          operation: 'analyzeCode',
          cost: 0.0005
        },
        {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tokensUsed: 50,
          operation: 'summarize'
        }
      ];

      for (const usage of usages) {
        await db.recordTokenUsage(usage);
      }
    });

    test('should calculate total statistics', async () => {
      const stats = await db.getUsageStatistics();

      expect(stats.totalTokens).toBe(500); // 100 + 200 + 150 + 50
      expect(stats.totalCost).toBeCloseTo(0.00155); // 0.00005 + 0.001 + 0.0005
      expect(stats.sessionsCount).toBe(1);
      expect(stats.lastUsage).toBeInstanceOf(Date);
    });

    test('should calculate provider statistics', async () => {
      const stats = await db.getUsageStatistics();

      expect(stats.providerCounts['openai']).toBe(350); // 100 + 200 + 50
      expect(stats.providerCounts['anthropic']).toBe(150);
    });

    test('should calculate model statistics', async () => {
      const stats = await db.getUsageStatistics();

      expect(stats.modelCounts['gpt-4o-mini']).toBe(150); // 100 + 50
      expect(stats.modelCounts['gpt-4']).toBe(200);
      expect(stats.modelCounts['claude-3-5-sonnet']).toBe(150);
    });

    test('should calculate operation statistics', async () => {
      const stats = await db.getUsageStatistics();

      expect(stats.operationCounts['generateText']).toBe(2);
      expect(stats.operationCounts['analyzeCode']).toBe(1);
      expect(stats.operationCounts['summarize']).toBe(1);
    });

    test('should filter statistics by days', async () => {
      const statsAll = await db.getUsageStatistics();
      // Use future date to get no results
      const statsFiltered = await db.getUsageStatistics(-1); // Negative days should return no results

      expect(statsAll.totalTokens).toBe(500);
      expect(statsFiltered.totalTokens).toBe(0);
    });
  });

  describe('Usage History', () => {
    beforeEach(async () => {
      // Add test data with different providers
      const usages = [
        { provider: 'openai', model: 'gpt-4', tokensUsed: 100, operation: 'test1' },
        { provider: 'anthropic', model: 'claude-3', tokensUsed: 200, operation: 'test2' },
        { provider: 'openai', model: 'gpt-3.5', tokensUsed: 150, operation: 'test3' },
      ];

      for (const usage of usages) {
        await db.recordTokenUsage(usage);
      }
    });

    test('should retrieve usage history', async () => {
      const history = await db.getUsageHistory(10);
      expect(history).toHaveLength(3);

      // Check that all operations are present (order may vary)
      const operations = history.map(h => h.operation);
      expect(operations).toContain('test1');
      expect(operations).toContain('test2');
      expect(operations).toContain('test3');
    });

    test('should limit usage history results', async () => {
      const history = await db.getUsageHistory(2);
      expect(history).toHaveLength(2);
    });

    test('should filter usage history by provider', async () => {
      const openaiHistory = await db.getUsageHistory(10, 'openai');
      expect(openaiHistory).toHaveLength(2);
      expect(openaiHistory.every(record => record.provider === 'openai')).toBe(true);

      const anthropicHistory = await db.getUsageHistory(10, 'anthropic');
      expect(anthropicHistory).toHaveLength(1);
      expect(anthropicHistory[0].provider).toBe('anthropic');
    });
  });

  describe('Usage History Cleanup', () => {
    test('should clear all usage history', async () => {
      // Add some test data
      await db.recordTokenUsage({
        provider: 'openai',
        model: 'gpt-4',
        tokensUsed: 100,
        operation: 'test'
      });

      const historyBefore = await db.getUsageHistory(10);
      expect(historyBefore).toHaveLength(1);

      const cleared = await db.clearUsageHistory();
      expect(cleared).toBe(1);

      const historyAfter = await db.getUsageHistory(10);
      expect(historyAfter).toHaveLength(0);
    });
  });

  describe('Settings Management', () => {
    test('should set and get settings', async () => {
      await db.setSetting('test_key', 'test_value');
      const value = await db.getSetting('test_key');
      expect(value).toBe('test_value');
    });

    test('should return null for non-existent settings', async () => {
      const value = await db.getSetting('non_existent_key');
      expect(value).toBeNull();
    });

    test('should update existing settings', async () => {
      await db.setSetting('update_key', 'old_value');
      await db.setSetting('update_key', 'new_value');

      const value = await db.getSetting('update_key');
      expect(value).toBe('new_value');
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await db.recordTokenUsage({
        provider: 'openai',
        model: 'gpt-4',
        tokensUsed: 100,
        operation: 'test',
        cost: 0.001
      });
      await db.setSetting('test_setting', 'test_value');
    });

    test('should export usage data', async () => {
      const exportData = await db.exportUsageData();

      expect(exportData.exportDate).toBeDefined();
      expect(exportData.statistics).toBeDefined();
      expect(exportData.usageHistory).toHaveLength(1);
      expect(exportData.settings).toHaveLength(1);

      expect(exportData.statistics.totalTokens).toBe(100);
      expect(exportData.usageHistory[0].provider).toBe('openai');
      expect(exportData.settings[0].value).toBe('test_value');
    });
  });

  describe('Database Maintenance', () => {
    test('should provide database info', async () => {
      const info = await db.getDatabaseInfo();

      expect(info.path).toBe(tempDbPath);
      expect(typeof info.size).toBe('number');
      expect(info.totalRecords).toBe(0);
      expect(typeof info.sessionId).toBe('string');
    });

    test('should perform vacuum operation', async () => {
      // This should not throw an error
      await expect(db.vacuum()).resolves.not.toThrow();
    });

    test('should close database connection', async () => {
      await expect(db.close()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle database initialization errors gracefully', async () => {
      const dbWithBadPath = new DatabaseManager();
      // Set an invalid path that would cause permission errors on Windows
      (dbWithBadPath as any).dbPath = 'Z:\\invalid\\path\\test.db';

      // Should throw an error for invalid path
      await expect(dbWithBadPath.initialize()).rejects.toThrow();
    });

    test('should handle concurrent access', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        db.recordTokenUsage({
          provider: 'openai',
          model: 'gpt-4',
          tokensUsed: i + 1,
          operation: `test${i}`
        })
      );

      await Promise.all(promises);

      const history = await db.getUsageHistory(20);
      expect(history).toHaveLength(10);
    });
  });

  describe('Integration with AI Providers', () => {
    test('should work with realistic AI provider data', async () => {
      const openaiUsage = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensUsed: 1247,
        promptTokens: 892,
        completionTokens: 355,
        operation: 'generateText',
        cost: 0.000375
      };

      const anthropicUsage = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 2156,
        promptTokens: 1500,
        completionTokens: 656,
        operation: 'analyzeCode',
        cost: 0.0054
      };

      await db.recordTokenUsage(openaiUsage);
      await db.recordTokenUsage(anthropicUsage);

      const stats = await db.getUsageStatistics();
      expect(stats.totalTokens).toBe(3403);
      expect(stats.totalCost).toBeCloseTo(0.005775);
      expect(stats.providerCounts['openai']).toBe(1247);
      expect(stats.providerCounts['anthropic']).toBe(2156);
    });
  });
});