import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

export interface TokenUsageRecord {
  id?: number;
  provider: string;
  model: string;
  tokensUsed: number;
  promptTokens?: number;
  completionTokens?: number;
  operation: string;
  timestamp: Date;
  cost?: number;
  sessionId: string;
}

export interface UsageStatistics {
  totalTokens: number;
  totalCost: number;
  operationCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  lastUsage: Date | null;
  sessionsCount: number;
}

export class DatabaseManager {
  private db?: Database.Database;
  private dbPath: string;
  private sessionId: string;

  constructor() {
    const homeDir = os.homedir();
    const scribeverseDir = path.join(homeDir, '.scribeverse');
    this.dbPath = path.join(scribeverseDir, 'usage.db');
    this.sessionId = this.generateSessionId();
  }

  async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Initialize SQLite database
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');

      // Create tables if they don't exist
      this.createTables();

      if (process.env.NODE_ENV !== 'test') {
        console.log(`Database initialized at: ${this.dbPath}`);
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Token usage tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        operation TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        cost REAL,
        session_id TEXT NOT NULL
      )
    `);

    // Index for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_provider_timestamp ON token_usage(provider, timestamp);
      CREATE INDEX IF NOT EXISTS idx_session_id ON token_usage(session_id);
      CREATE INDEX IF NOT EXISTS idx_operation ON token_usage(operation);
    `);

    // Settings table for configuration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async recordTokenUsage(record: Omit<TokenUsageRecord, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    if (!this.db) await this.initialize();

    const stmt = this.db!.prepare(`
      INSERT INTO token_usage (
        provider, model, tokens_used, prompt_tokens, completion_tokens,
        operation, cost, session_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      record.provider,
      record.model,
      record.tokensUsed,
      record.promptTokens || null,
      record.completionTokens || null,
      record.operation,
      record.cost || null,
      this.sessionId
    );
  }

  async getUsageStatistics(days?: number): Promise<UsageStatistics> {
    if (!this.db) await this.initialize();

    const whereClause = days
      ? `WHERE timestamp >= datetime('now', '-${days} days')`
      : '';

    // Get total statistics
    const totalStats = this.db!.prepare(`
      SELECT
        COALESCE(SUM(tokens_used), 0) as totalTokens,
        COALESCE(SUM(cost), 0) as totalCost,
        COUNT(DISTINCT session_id) as sessionsCount,
        MAX(timestamp) as lastUsage
      FROM token_usage ${whereClause}
    `).get() as any;

    // Get operation counts
    const operationStats = this.db!.prepare(`
      SELECT operation, COUNT(*) as count
      FROM token_usage ${whereClause}
      GROUP BY operation
    `).all() as any[];

    // Get provider counts
    const providerStats = this.db!.prepare(`
      SELECT provider, SUM(tokens_used) as count
      FROM token_usage ${whereClause}
      GROUP BY provider
    `).all() as any[];

    // Get model counts
    const modelStats = this.db!.prepare(`
      SELECT model, SUM(tokens_used) as count
      FROM token_usage ${whereClause}
      GROUP BY model
    `).all() as any[];

    return {
      totalTokens: totalStats.totalTokens || 0,
      totalCost: totalStats.totalCost || 0,
      sessionsCount: totalStats.sessionsCount || 0,
      lastUsage: totalStats.lastUsage ? new Date(totalStats.lastUsage) : null,
      operationCounts: operationStats.reduce((acc, row) => {
        acc[row.operation] = row.count;
        return acc;
      }, {} as Record<string, number>),
      providerCounts: providerStats.reduce((acc, row) => {
        acc[row.provider] = row.count;
        return acc;
      }, {} as Record<string, number>),
      modelCounts: modelStats.reduce((acc, row) => {
        acc[row.model] = row.count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async getUsageHistory(limit: number = 100, provider?: string): Promise<TokenUsageRecord[]> {
    if (!this.db) await this.initialize();

    const query = `
      SELECT * FROM token_usage
      ${provider ? 'WHERE provider = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const params = provider ? [provider, limit] : [limit];
    const rows = this.db!.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      tokensUsed: row.tokens_used,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      operation: row.operation,
      timestamp: new Date(row.timestamp),
      cost: row.cost,
      sessionId: row.session_id
    }));
  }

  async clearUsageHistory(days?: number): Promise<number> {
    if (!this.db) await this.initialize();

    let query = 'DELETE FROM token_usage';
    const params: any[] = [];

    if (days) {
      query += ` WHERE timestamp < datetime('now', '-${days} days')`;
    }

    const result = this.db!.prepare(query).run(...params);
    return result.changes;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) await this.initialize();

    this.db!.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(key, value);
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) await this.initialize();

    const result = this.db!.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return result?.value || null;
  }

  async exportUsageData(): Promise<any> {
    if (!this.db) await this.initialize();

    const usage = this.db!.prepare('SELECT * FROM token_usage ORDER BY timestamp').all();
    const settings = this.db!.prepare('SELECT * FROM settings').all();
    const stats = await this.getUsageStatistics();

    return {
      exportDate: new Date().toISOString(),
      statistics: stats,
      usageHistory: usage,
      settings: settings
    };
  }

  getCurrentSessionId(): string {
    return this.sessionId;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  // Database maintenance methods
  async vacuum(): Promise<void> {
    if (!this.db) await this.initialize();
    this.db!.exec('VACUUM');
  }

  async getDatabaseInfo(): Promise<{
    path: string;
    size: number;
    totalRecords: number;
    sessionId: string;
  }> {
    if (!this.db) await this.initialize();

    const stats = await fs.stat(this.dbPath);
    const recordCount = this.db!.prepare('SELECT COUNT(*) as count FROM token_usage').get() as any;

    return {
      path: this.dbPath,
      size: stats.size,
      totalRecords: recordCount.count,
      sessionId: this.sessionId
    };
  }
}