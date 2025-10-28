/**
 * Batch Manager - Manages batch image generation operations
 */

import OpenAI from 'openai';
import { JobManager, getJobManager } from './jobs.js';
import { debugLog } from './cost.js';
import { getDatabase } from './database.js';
import type {
  BatchConfig,
  BatchJobConfig,
  BatchResult,
  BatchJobResult,
  BatchExecutionOptions,
} from '../types/batch.js';
import type { JobRecord } from '../types/jobs.js';

/**
 * Semaphore for controlling concurrent execution
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const resolve = this.queue.shift();
    if (resolve) {
      this.permits--;
      resolve();
    }
  }
}

/**
 * BatchManager - Handles batch image generation
 */
export class BatchManager {
  private openai: OpenAI;
  private jobManager: JobManager;

  constructor(openai: OpenAI) {
    this.openai = openai;
    this.jobManager = getJobManager(openai);
  }

  /**
   * Execute batch image generation
   */
  async executeBatch(
    config: BatchConfig,
    options: BatchExecutionOptions = {}
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    debugLog('Starting batch execution', {
      jobCount: config.jobs.length,
      maxConcurrent: config.max_concurrent || 2,
      timeout: config.timeout || 600000,
    });

    // Prepare jobs with defaults
    const jobs = config.jobs.map((job, index) => ({
      ...job,
      output_path: job.output_path || `batch_${index + 1}.png`,
    }));

    // Create semaphore for concurrency control
    const maxConcurrent = config.max_concurrent || 2;
    const semaphore = new Semaphore(maxConcurrent);

    // Create timeout promise
    const timeoutMs = config.timeout || 600000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Execute jobs with concurrency control
    const jobPromises = jobs.map(async (job, index) => {
      try {
        // Acquire semaphore
        await semaphore.acquire();

        debugLog(`Starting job ${index + 1}/${jobs.length}`, {
          prompt: job.prompt.substring(0, 50),
        });

        // Create and start job
        const jobId = this.jobManager.createJob({
          tool_name: 'generate_image',
          prompt: job.prompt,
          parameters: job,
          sample_count: job.sample_count || 1,
        });

        await this.jobManager.startJob(jobId);

        // Wait for job completion
        const result = await this.waitForJobCompletion(jobId, config.retry_policy);

        debugLog(`Completed job ${index + 1}/${jobs.length}`, {
          status: result.status,
          jobId,
        });

        return result;
      } catch (error: any) {
        debugLog(`Failed job ${index + 1}/${jobs.length}`, {
          error: error.message,
        });

        return {
          job_id: 'N/A',
          prompt: job.prompt,
          status: 'failed' as const,
          error: error.message,
        };
      } finally {
        // Release semaphore
        semaphore.release();
      }
    });

    // Wait for all jobs or timeout
    let results: BatchJobResult[];
    try {
      results = await Promise.race([
        Promise.all(jobPromises),
        timeoutPromise,
      ]);
    } catch (error: any) {
      // Timeout occurred - collect results from completed jobs
      debugLog('Batch execution timeout', { error: error.message });

      // Wait a bit for in-progress jobs to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Collect results
      results = await Promise.allSettled(jobPromises).then(settled =>
        settled.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              job_id: 'N/A',
              prompt: jobs[index].prompt,
              status: 'cancelled' as const,
              error: 'Timeout',
            };
          }
        })
      );
    }

    const finishedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;

    // Calculate statistics
    const succeeded = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const cancelled = results.filter(r => r.status === 'cancelled').length;

    // Calculate total cost
    const totalCost = this.calculateTotalCost(results);

    const batchResult: BatchResult = {
      total: jobs.length,
      succeeded,
      failed,
      cancelled,
      results,
      started_at: startedAt,
      finished_at: finishedAt,
      total_duration_ms: totalDurationMs,
      total_cost: totalCost,
    };

    debugLog('Batch execution completed', {
      total: batchResult.total,
      succeeded: batchResult.succeeded,
      failed: batchResult.failed,
      cancelled: batchResult.cancelled,
      duration: totalDurationMs,
    });

    return batchResult;
  }

  /**
   * Wait for job completion with retry logic
   */
  private async waitForJobCompletion(
    jobId: string,
    retryPolicy?: BatchConfig['retry_policy']
  ): Promise<BatchJobResult> {
    const maxRetries = retryPolicy?.max_retries || 0;
    const retryDelayMs = retryPolicy?.retry_delay_ms || 5000;
    const retryOnErrors = retryPolicy?.retry_on_errors || [];

    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        // Poll job status
        let job = this.jobManager.getJob(jobId);
        if (!job) {
          throw new Error(`Job not found: ${jobId}`);
        }

        // Wait for job to complete
        while (job.status === 'pending' || job.status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          job = this.jobManager.getJob(jobId);
          if (!job) {
            throw new Error(`Job disappeared: ${jobId}`);
          }
        }

        // Job completed
        if (job.status === 'completed') {
          const outputPaths = job.output_paths ? JSON.parse(job.output_paths) : [];
          const createdAt = new Date(job.created_at).getTime();
          const updatedAt = new Date(job.updated_at).getTime();

          return {
            job_id: job.job_id,
            prompt: job.prompt,
            status: 'completed',
            output_path: outputPaths[0],
            output_paths: outputPaths,
            duration_ms: updatedAt - createdAt,
            history_uuid: job.history_uuid || undefined,
          };
        }

        // Job failed - check if we should retry
        if (job.status === 'failed') {
          const errorMessage = job.error_message || 'Unknown error';
          const shouldRetry = retryOnErrors.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
          );

          if (shouldRetry && attempts < maxRetries) {
            attempts++;
            debugLog(`Retrying job ${jobId} (attempt ${attempts}/${maxRetries})`, {
              error: errorMessage,
            });
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));

            // Create new job with same parameters
            const newJobId = this.jobManager.createJob({
              tool_name: job.tool_name as any,
              prompt: job.prompt,
              parameters: JSON.parse(job.parameters),
              sample_count: job.sample_count,
            });
            await this.jobManager.startJob(newJobId);
            jobId = newJobId;
            continue;
          }

          return {
            job_id: job.job_id,
            prompt: job.prompt,
            status: 'failed',
            error: errorMessage,
          };
        }

        // Job cancelled
        return {
          job_id: job.job_id,
          prompt: job.prompt,
          status: 'cancelled',
          error: job.error_message || 'Job was cancelled',
        };
      } catch (error: any) {
        if (attempts < maxRetries) {
          attempts++;
          debugLog(`Retrying job ${jobId} due to error (attempt ${attempts}/${maxRetries})`, {
            error: error.message,
          });
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }

        return {
          job_id: jobId,
          prompt: 'Unknown',
          status: 'failed',
          error: error.message,
        };
      }
    }

    return {
      job_id: jobId,
      prompt: 'Unknown',
      status: 'failed',
      error: 'Max retries exceeded',
    };
  }

  /**
   * Calculate total cost from batch results
   */
  private calculateTotalCost(results: BatchJobResult[]): number | undefined {
    let totalCost = 0;
    let hasAnyCost = false;

    for (const result of results) {
      if (result.status === 'completed' && result.history_uuid) {
        try {
          const db = getDatabase();
          const history = db.getByUuid(result.history_uuid);
          if (history && history.estimated_cost) {
            totalCost += history.estimated_cost;
            hasAnyCost = true;
          }
        } catch (error) {
          debugLog('Failed to get cost for history', { uuid: result.history_uuid });
        }
      }
    }

    return hasAnyCost ? totalCost : undefined;
  }

  /**
   * Estimate cost for batch execution (without actually executing)
   */
  async estimateBatchCost(config: BatchConfig): Promise<{
    totalJobs: number;
    estimatedCostMin: number;
    estimatedCostMax: number;
    breakdown: Array<{ quality: string; count: number; costMin: number; costMax: number }>;
  }> {
    // Cost estimates per quality level (approximate)
    const costEstimates = {
      low: { min: 0.01, max: 0.02 },
      medium: { min: 0.04, max: 0.07 },
      high: { min: 0.17, max: 0.19 },
      auto: { min: 0.04, max: 0.19 }, // Range from medium to high
    };

    const breakdown = new Map<string, { count: number; costMin: number; costMax: number }>();

    let totalCostMin = 0;
    let totalCostMax = 0;

    for (const job of config.jobs) {
      const quality = job.quality || 'auto';
      const sampleCount = job.sample_count || 1;
      const estimates = costEstimates[quality];

      const jobCostMin = estimates.min * sampleCount;
      const jobCostMax = estimates.max * sampleCount;

      totalCostMin += jobCostMin;
      totalCostMax += jobCostMax;

      // Update breakdown
      const existing = breakdown.get(quality);
      if (existing) {
        existing.count += sampleCount;
        existing.costMin += jobCostMin;
        existing.costMax += jobCostMax;
      } else {
        breakdown.set(quality, {
          count: sampleCount,
          costMin: jobCostMin,
          costMax: jobCostMax,
        });
      }
    }

    return {
      totalJobs: config.jobs.reduce((sum, job) => sum + (job.sample_count || 1), 0),
      estimatedCostMin: totalCostMin,
      estimatedCostMax: totalCostMax,
      breakdown: Array.from(breakdown.entries()).map(([quality, data]) => ({
        quality,
        ...data,
      })),
    };
  }
}
