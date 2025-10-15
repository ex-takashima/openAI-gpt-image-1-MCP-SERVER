/**
 * Database utility for history management using SQLite
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import type { HistoryRecord, CreateHistoryParams, SearchHistoryParams } from '../types/history.js';

/**
 * History Database Manager
 */
export class HistoryDatabase {
  public db: Database.Database; // Public for job manager access

  constructor(dbPath?: string) {
    // Default database path: ~/.openai-gpt-image/history.db
    const defaultPath = path.join(
      os.homedir(),
      '.openai-gpt-image',
      'history.db'
    );

    const finalPath = dbPath || process.env.HISTORY_DB_PATH || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.initializeTables();
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    // Create history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        uuid TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        parameters TEXT NOT NULL,
        output_paths TEXT NOT NULL,
        sample_count INTEGER NOT NULL DEFAULT 1,
        size TEXT,
        quality TEXT,
        output_format TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_history_tool_name ON history(tool_name);

      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        parameters TEXT NOT NULL,
        sample_count INTEGER NOT NULL DEFAULT 1,
        output_paths TEXT,
        history_uuid TEXT,
        error_message TEXT,
        progress INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_tool_name ON jobs(tool_name);
    `);
  }

  /**
   * Create a new history record
   */
  createRecord(params: CreateHistoryParams): string {
    const uuid = randomUUID();
    const created_at = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO history (
        uuid, created_at, tool_name, prompt, parameters,
        output_paths, sample_count, size, quality, output_format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuid,
      created_at,
      params.tool_name,
      params.prompt,
      JSON.stringify(params.parameters),
      JSON.stringify(params.output_paths),
      params.sample_count,
      params.size || null,
      params.quality || null,
      params.output_format || null
    );

    return uuid;
  }

  /**
   * Get a record by UUID
   */
  getByUuid(uuid: string): HistoryRecord | null {
    const stmt = this.db.prepare('SELECT * FROM history WHERE uuid = ?');
    const row = stmt.get(uuid) as any;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * List recent history records
   */
  listRecent(limit: number = 20, offset: number = 0): HistoryRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM history
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Search history by prompt text
   */
  search(params: SearchHistoryParams): HistoryRecord[] {
    const { query, tool_name, limit = 20, offset = 0 } = params;

    let sql = 'SELECT * FROM history WHERE 1=1';
    const bindings: any[] = [];

    if (query) {
      sql += ' AND prompt LIKE ?';
      bindings.push(`%${query}%`);
    }

    if (tool_name) {
      sql += ' AND tool_name = ?';
      bindings.push(tool_name);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...bindings) as any[];
    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM history');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Delete a record by UUID
   */
  deleteByUuid(uuid: string): boolean {
    const stmt = this.db.prepare('DELETE FROM history WHERE uuid = ?');
    const result = stmt.run(uuid);
    return result.changes > 0;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Convert database row to HistoryRecord
   */
  private rowToRecord(row: any): HistoryRecord {
    return {
      uuid: row.uuid,
      created_at: row.created_at,
      tool_name: row.tool_name,
      prompt: row.prompt,
      parameters: row.parameters,
      output_paths: row.output_paths,
      sample_count: row.sample_count,
      size: row.size,
      quality: row.quality,
      output_format: row.output_format,
    };
  }
}

// Singleton instance
let dbInstance: HistoryDatabase | null = null;

/**
 * Get or create the database instance
 */
export function getDatabase(): HistoryDatabase {
  if (!dbInstance) {
    dbInstance = new HistoryDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
