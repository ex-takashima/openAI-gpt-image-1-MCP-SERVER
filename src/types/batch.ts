/**
 * Batch processing types
 */

/**
 * Single job configuration in batch
 */
export interface BatchJobConfig {
  prompt: string;
  output_path?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  output_format?: 'png' | 'jpeg' | 'webp';
  transparent_background?: boolean;
  moderation?: 'auto' | 'low' | 'medium' | 'high';
  sample_count?: number;
  return_base64?: boolean;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  max_retries?: number;
  retry_delay_ms?: number;
  retry_on_errors?: string[];
}

/**
 * Batch configuration
 */
export interface BatchConfig {
  jobs: BatchJobConfig[];
  output_dir?: string;
  max_concurrent?: number;
  timeout?: number;
  retry_policy?: RetryPolicy;
}

/**
 * Batch job result
 */
export interface BatchJobResult {
  job_id: string;
  prompt: string;
  status: 'completed' | 'failed' | 'cancelled';
  output_path?: string;
  output_paths?: string[];
  error?: string;
  duration_ms?: number;
  history_uuid?: string;
}

/**
 * Batch execution result
 */
export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  results: BatchJobResult[];
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  total_cost?: number;
}

/**
 * Batch execution options
 */
export interface BatchExecutionOptions {
  outputDir?: string;
  maxConcurrent?: number;
  timeout?: number;
  format?: 'text' | 'json';
  estimateOnly?: boolean;
}
