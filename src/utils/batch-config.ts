/**
 * Batch configuration validation and parsing
 */

import { readFileSync } from 'fs';
import type { BatchConfig, BatchJobConfig } from '../types/batch.js';

/**
 * Validation error class
 */
export class BatchConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchConfigError';
  }
}

/**
 * Validate a single job configuration
 */
function validateJobConfig(job: any, index: number): void {
  if (!job || typeof job !== 'object') {
    throw new BatchConfigError(`Job at index ${index} is not a valid object`);
  }

  // Required: prompt
  if (!job.prompt || typeof job.prompt !== 'string' || job.prompt.trim().length === 0) {
    throw new BatchConfigError(`Job at index ${index}: prompt is required and must be a non-empty string`);
  }

  // Optional: output_path
  if (job.output_path !== undefined && typeof job.output_path !== 'string') {
    throw new BatchConfigError(`Job at index ${index}: output_path must be a string`);
  }

  // Optional: size
  if (job.size !== undefined) {
    const validSizes = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
    if (!validSizes.includes(job.size)) {
      throw new BatchConfigError(
        `Job at index ${index}: size must be one of: ${validSizes.join(', ')}`
      );
    }
  }

  // Optional: quality
  if (job.quality !== undefined) {
    const validQualities = ['low', 'medium', 'high', 'auto'];
    if (!validQualities.includes(job.quality)) {
      throw new BatchConfigError(
        `Job at index ${index}: quality must be one of: ${validQualities.join(', ')}`
      );
    }
  }

  // Optional: output_format
  if (job.output_format !== undefined) {
    const validFormats = ['png', 'jpeg', 'webp'];
    if (!validFormats.includes(job.output_format)) {
      throw new BatchConfigError(
        `Job at index ${index}: output_format must be one of: ${validFormats.join(', ')}`
      );
    }
  }

  // Optional: transparent_background
  if (job.transparent_background !== undefined && typeof job.transparent_background !== 'boolean') {
    throw new BatchConfigError(`Job at index ${index}: transparent_background must be a boolean`);
  }

  // Optional: moderation
  if (job.moderation !== undefined) {
    const validModerations = ['auto', 'low', 'medium', 'high'];
    if (!validModerations.includes(job.moderation)) {
      throw new BatchConfigError(
        `Job at index ${index}: moderation must be one of: ${validModerations.join(', ')}`
      );
    }
  }

  // Optional: sample_count
  if (job.sample_count !== undefined) {
    if (typeof job.sample_count !== 'number' || job.sample_count < 1 || job.sample_count > 10) {
      throw new BatchConfigError(
        `Job at index ${index}: sample_count must be a number between 1 and 10`
      );
    }
  }

  // Optional: return_base64
  if (job.return_base64 !== undefined && typeof job.return_base64 !== 'boolean') {
    throw new BatchConfigError(`Job at index ${index}: return_base64 must be a boolean`);
  }
}

/**
 * Validate batch configuration
 */
export function validateBatchConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new BatchConfigError('Configuration must be a valid object');
  }

  // Required: jobs array
  if (!Array.isArray(config.jobs)) {
    throw new BatchConfigError('jobs must be an array');
  }

  if (config.jobs.length === 0) {
    throw new BatchConfigError('jobs array cannot be empty');
  }

  if (config.jobs.length > 100) {
    throw new BatchConfigError('jobs array cannot contain more than 100 jobs');
  }

  // Validate each job
  config.jobs.forEach((job: any, index: number) => {
    validateJobConfig(job, index);
  });

  // Optional: output_dir
  if (config.output_dir !== undefined && typeof config.output_dir !== 'string') {
    throw new BatchConfigError('output_dir must be a string');
  }

  // Optional: max_concurrent
  if (config.max_concurrent !== undefined) {
    if (typeof config.max_concurrent !== 'number' || config.max_concurrent < 1 || config.max_concurrent > 10) {
      throw new BatchConfigError('max_concurrent must be a number between 1 and 10');
    }
  }

  // Optional: timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 3600000) {
      throw new BatchConfigError('timeout must be a number between 1000 (1s) and 3600000 (1h)');
    }
  }

  // Optional: retry_policy
  if (config.retry_policy !== undefined) {
    if (typeof config.retry_policy !== 'object') {
      throw new BatchConfigError('retry_policy must be an object');
    }

    const policy = config.retry_policy;

    if (policy.max_retries !== undefined) {
      if (typeof policy.max_retries !== 'number' || policy.max_retries < 0 || policy.max_retries > 5) {
        throw new BatchConfigError('retry_policy.max_retries must be a number between 0 and 5');
      }
    }

    if (policy.retry_delay_ms !== undefined) {
      if (typeof policy.retry_delay_ms !== 'number' || policy.retry_delay_ms < 100 || policy.retry_delay_ms > 60000) {
        throw new BatchConfigError('retry_policy.retry_delay_ms must be a number between 100 and 60000');
      }
    }

    if (policy.retry_on_errors !== undefined) {
      if (!Array.isArray(policy.retry_on_errors)) {
        throw new BatchConfigError('retry_policy.retry_on_errors must be an array');
      }
    }
  }
}

/**
 * Parse batch configuration from JSON string
 */
export function parseBatchConfig(jsonString: string): BatchConfig {
  let config: any;

  try {
    config = JSON.parse(jsonString);
  } catch (error: any) {
    throw new BatchConfigError(`Invalid JSON: ${error.message}`);
  }

  validateBatchConfig(config);

  return config as BatchConfig;
}

/**
 * Load batch configuration from file
 */
export function loadBatchConfig(filePath: string): BatchConfig {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return parseBatchConfig(fileContent);
  } catch (error: any) {
    if (error instanceof BatchConfigError) {
      throw error;
    }
    throw new BatchConfigError(`Failed to load config file: ${error.message}`);
  }
}

/**
 * Get default batch configuration values
 */
export function getDefaultBatchConfig(): Partial<BatchConfig> {
  return {
    output_dir: process.env.OPENAI_IMAGE_OUTPUT_DIR,
    max_concurrent: parseInt(process.env.OPENAI_BATCH_MAX_CONCURRENT || '2', 10),
    timeout: parseInt(process.env.OPENAI_BATCH_TIMEOUT || '600000', 10),
    retry_policy: {
      max_retries: 2,
      retry_delay_ms: 5000,
      retry_on_errors: ['rate_limit', 'timeout'],
    },
  };
}

/**
 * Merge configuration with defaults
 */
export function mergeBatchConfig(config: BatchConfig, overrides?: Partial<BatchConfig>): BatchConfig {
  const defaults = getDefaultBatchConfig();

  return {
    ...defaults,
    ...config,
    ...overrides,
    retry_policy: {
      ...defaults.retry_policy,
      ...config.retry_policy,
      ...overrides?.retry_policy,
    },
  } as BatchConfig;
}
