/**
 * Async job manager - Manages background image generation jobs
 */

import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { getDatabase } from './database.js';
import { debugLog } from './cost.js';
import { generateImage } from '../tools/generate.js';
import { editImage } from '../tools/edit.js';
import { transformImage } from '../tools/transform.js';
import type {
  JobRecord,
  JobStatus,
  CreateJobParams,
  UpdateJobParams,
  SearchJobsParams,
} from '../types/jobs.js';

/**
 * Job Manager - Handles async job operations
 */
export class JobManager {
  private openai: OpenAI;
  private runningJobs: Map<string, Promise<void>>;

  constructor(openai: OpenAI) {
    this.openai = openai;
    this.runningJobs = new Map();
  }

  /**
   * Create a new job
   */
  createJob(params: CreateJobParams): string {
    const job_id = randomUUID();
    const now = new Date().toISOString();

    const db = getDatabase();
    const stmt = db.db.prepare(`
      INSERT INTO jobs (
        job_id, created_at, updated_at, status, tool_name, prompt,
        parameters, sample_count, progress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      job_id,
      now,
      now,
      'pending',
      params.tool_name,
      params.prompt,
      JSON.stringify(params.parameters),
      params.sample_count,
      0
    );

    debugLog(`Job created: ${job_id}`);
    return job_id;
  }

  /**
   * Get job by ID
   */
  getJob(job_id: string): JobRecord | null {
    const db = getDatabase();
    const stmt = db.db.prepare('SELECT * FROM jobs WHERE job_id = ?');
    const row = stmt.get(job_id) as any;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Update job status and metadata
   */
  updateJob(job_id: string, updates: UpdateJobParams): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }

    if (updates.output_paths !== undefined) {
      fields.push('output_paths = ?');
      values.push(JSON.stringify(updates.output_paths));
    }

    if (updates.history_uuid !== undefined) {
      fields.push('history_uuid = ?');
      values.push(updates.history_uuid);
    }

    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }

    values.push(job_id);

    const sql = `UPDATE jobs SET ${fields.join(', ')} WHERE job_id = ?`;
    const stmt = db.db.prepare(sql);
    stmt.run(...values);

    debugLog(`Job updated: ${job_id}`, updates);
  }

  /**
   * Start executing a job
   */
  async startJob(job_id: string): Promise<void> {
    const job = this.getJob(job_id);
    if (!job) {
      throw new Error(`Job not found: ${job_id}`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${job_id} is already ${job.status}`);
    }

    // Mark as running
    this.updateJob(job_id, { status: 'running', progress: 10 });

    // Start job execution in background
    const jobPromise = this.executeJob(job_id, job);
    this.runningJobs.set(job_id, jobPromise);

    // Clean up after completion
    jobPromise.finally(() => {
      this.runningJobs.delete(job_id);
    });
  }

  /**
   * Execute job (internal method)
   */
  private async executeJob(job_id: string, job: JobRecord): Promise<void> {
    try {
      debugLog(`Executing job: ${job_id}`);

      const params = JSON.parse(job.parameters);

      let result: string;

      // Execute the appropriate tool
      switch (job.tool_name) {
        case 'generate_image':
          this.updateJob(job_id, { progress: 30 });
          result = await generateImage(this.openai, params);
          break;

        case 'edit_image':
          this.updateJob(job_id, { progress: 30 });
          result = await editImage(this.openai, params);
          break;

        case 'transform_image':
          this.updateJob(job_id, { progress: 30 });
          result = await transformImage(this.openai, params);
          break;

        default:
          throw new Error(`Unknown tool: ${job.tool_name}`);
      }

      // Extract history UUID from result if present
      const historyMatch = result.match(/📝 History ID: ([a-f0-9-]+)/);
      const history_uuid = historyMatch ? historyMatch[1] : null;

      // Get output paths from history record
      let output_paths: string[] = [];
      if (history_uuid) {
        const db = getDatabase();
        const historyRecord = db.getByUuid(history_uuid);
        if (historyRecord) {
          output_paths = JSON.parse(historyRecord.output_paths);
        }
      }

      // Mark as completed
      this.updateJob(job_id, {
        status: 'completed',
        progress: 100,
        output_paths,
        history_uuid: history_uuid || undefined,
      });

      debugLog(`Job completed: ${job_id}`);
    } catch (error: any) {
      debugLog(`Job failed: ${job_id}`, error);

      this.updateJob(job_id, {
        status: 'failed',
        error_message: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(job_id: string): boolean {
    const job = this.getJob(job_id);
    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false; // Cannot cancel already finished jobs
    }

    this.updateJob(job_id, {
      status: 'cancelled',
      error_message: 'Job cancelled by user',
    });

    debugLog(`Job cancelled: ${job_id}`);
    return true;
  }

  /**
   * List jobs with optional filters
   */
  listJobs(params: SearchJobsParams): JobRecord[] {
    const db = getDatabase();
    const { status, tool_name, limit = 20, offset = 0 } = params;

    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const bindings: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      bindings.push(status);
    }

    if (tool_name) {
      sql += ' AND tool_name = ?';
      bindings.push(tool_name);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const stmt = db.db.prepare(sql);
    const rows = stmt.all(...bindings) as any[];

    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Get total count of jobs
   */
  getTotalCount(status?: JobStatus): number {
    const db = getDatabase();

    let sql = 'SELECT COUNT(*) as count FROM jobs';
    const bindings: any[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      bindings.push(status);
    }

    const stmt = db.db.prepare(sql);
    const result = stmt.get(...bindings) as { count: number };
    return result.count;
  }

  /**
   * Delete old completed/failed jobs
   */
  cleanupJobs(olderThanDays: number = 7): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffISO = cutoffDate.toISOString();

    const stmt = db.db.prepare(`
      DELETE FROM jobs
      WHERE (status = 'completed' OR status = 'failed' OR status = 'cancelled')
        AND created_at < ?
    `);

    const result = stmt.run(cutoffISO);
    debugLog(`Cleaned up ${result.changes} old jobs`);
    return result.changes;
  }

  /**
   * Convert database row to JobRecord
   */
  private rowToRecord(row: any): JobRecord {
    return {
      job_id: row.job_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      status: row.status as JobStatus,
      tool_name: row.tool_name,
      prompt: row.prompt,
      parameters: row.parameters,
      sample_count: row.sample_count,
      output_paths: row.output_paths,
      history_uuid: row.history_uuid,
      error_message: row.error_message,
      progress: row.progress,
    };
  }
}

// Singleton instance
let jobManagerInstance: JobManager | null = null;

/**
 * Get or create the JobManager instance
 */
export function getJobManager(openai: OpenAI): JobManager {
  if (!jobManagerInstance) {
    jobManagerInstance = new JobManager(openai);
  }
  return jobManagerInstance;
}
