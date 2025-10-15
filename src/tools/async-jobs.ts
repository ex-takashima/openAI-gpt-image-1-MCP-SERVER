/**
 * Async job management tools
 */

import OpenAI from 'openai';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getJobManager } from '../utils/jobs.js';
import { debugLog } from '../utils/cost.js';
import { getDisplayPath } from '../utils/path.js';
import type { JobStatus } from '../types/jobs.js';

/**
 * Parameters for start_generation_job
 */
export interface StartGenerationJobParams {
  tool_name: 'generate_image' | 'edit_image' | 'transform_image';
  prompt: string;
  [key: string]: any; // Allow any additional tool-specific parameters
}

/**
 * Parameters for check_job_status
 */
export interface CheckJobStatusParams {
  job_id: string;
}

/**
 * Parameters for get_job_result
 */
export interface GetJobResultParams {
  job_id: string;
}

/**
 * Parameters for cancel_job
 */
export interface CancelJobParams {
  job_id: string;
}

/**
 * Parameters for list_jobs
 */
export interface ListJobsParams {
  status?: JobStatus;
  tool_name?: string;
  limit?: number;
  offset?: number;
}

/**
 * Start a new async image generation job
 */
export async function startGenerationJob(
  openai: OpenAI,
  params: StartGenerationJobParams
): Promise<string> {
  debugLog('Start generation job called with params:', params);

  const { tool_name, prompt, ...toolParams } = params;

  // Validation
  if (!tool_name || !['generate_image', 'edit_image', 'transform_image'].includes(tool_name)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'tool_name must be one of: generate_image, edit_image, transform_image'
    );
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Prompt is required and cannot be empty'
    );
  }

  try {
    const jobManager = getJobManager(openai);

    // Create job
    const job_id = jobManager.createJob({
      tool_name,
      prompt,
      parameters: { prompt, ...toolParams },
      sample_count: toolParams.sample_count || 1,
    });

    // Start job execution in background
    await jobManager.startJob(job_id);

    const result =
      `✅ Job started successfully!\n\n` +
      `🆔 Job ID: ${job_id}\n` +
      `🛠️  Tool: ${tool_name}\n` +
      `💬 Prompt: ${prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}\n\n` +
      `Use check_job_status to monitor progress and get_job_result to retrieve results when completed.`;

    return result;
  } catch (error: any) {
    debugLog('Error starting job:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to start job: ${error.message}`
    );
  }
}

/**
 * Check the status of an async job
 */
export async function checkJobStatus(
  openai: OpenAI,
  params: CheckJobStatusParams
): Promise<string> {
  debugLog('Check job status called with params:', params);

  const { job_id } = params;

  // Validation
  if (!job_id || job_id.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'job_id is required'
    );
  }

  try {
    const jobManager = getJobManager(openai);
    const job = jobManager.getJob(job_id);

    if (!job) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Job not found: ${job_id}`
      );
    }

    // Format status display
    const statusEmoji = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
    };

    const createdDate = new Date(job.created_at).toLocaleString();
    const updatedDate = new Date(job.updated_at).toLocaleString();

    let result = `📊 Job Status\n\n`;
    result += `🆔 Job ID: ${job.job_id}\n`;
    result += `${statusEmoji[job.status]} Status: ${job.status.toUpperCase()}\n`;
    result += `📈 Progress: ${job.progress}%\n`;
    result += `🛠️  Tool: ${job.tool_name}\n`;
    result += `📅 Created: ${createdDate}\n`;
    result += `🔄 Updated: ${updatedDate}\n`;

    if (job.status === 'running') {
      result += `\n💡 Job is currently running. Check back in a moment.`;
    } else if (job.status === 'completed') {
      result += `\n✅ Job completed successfully! Use get_job_result to retrieve the output.`;
    } else if (job.status === 'failed') {
      result += `\n❌ Job failed: ${job.error_message || 'Unknown error'}`;
    } else if (job.status === 'cancelled') {
      result += `\n🚫 Job was cancelled.`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error checking job status:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to check job status: ${error.message}`
    );
  }
}

/**
 * Get the result of a completed job
 */
export async function getJobResult(
  openai: OpenAI,
  params: GetJobResultParams
): Promise<string> {
  debugLog('Get job result called with params:', params);

  const { job_id } = params;

  // Validation
  if (!job_id || job_id.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'job_id is required'
    );
  }

  try {
    const jobManager = getJobManager(openai);
    const job = jobManager.getJob(job_id);

    if (!job) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Job not found: ${job_id}`
      );
    }

    if (job.status === 'pending' || job.status === 'running') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Job is still ${job.status}. Please wait for completion.`
      );
    }

    if (job.status === 'failed') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Job failed: ${job.error_message || 'Unknown error'}`
      );
    }

    if (job.status === 'cancelled') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Job was cancelled and has no result.'
      );
    }

    // Job is completed - format result
    const createdDate = new Date(job.created_at).toLocaleString();
    const params = JSON.parse(job.parameters);
    const outputPaths = job.output_paths ? JSON.parse(job.output_paths) : [];

    let result = `✅ Job Result\n\n`;
    result += `🆔 Job ID: ${job.job_id}\n`;
    result += `🛠️  Tool: ${job.tool_name}\n`;
    result += `📅 Completed: ${createdDate}\n`;
    result += `💬 Prompt: ${job.prompt}\n\n`;

    if (outputPaths.length > 0) {
      result += `📁 Output Files (${outputPaths.length}):\n`;
      for (let i = 0; i < outputPaths.length; i++) {
        result += `  ${i + 1}. ${getDisplayPath(outputPaths[i])}\n`;
      }
    }

    if (job.history_uuid) {
      result += `\n📝 History ID: ${job.history_uuid}`;
      result += `\n💡 Use get_history_by_uuid to see detailed generation info.`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error getting job result:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get job result: ${error.message}`
    );
  }
}

/**
 * Cancel a running or pending job
 */
export async function cancelJob(
  openai: OpenAI,
  params: CancelJobParams
): Promise<string> {
  debugLog('Cancel job called with params:', params);

  const { job_id } = params;

  // Validation
  if (!job_id || job_id.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'job_id is required'
    );
  }

  try {
    const jobManager = getJobManager(openai);
    const success = jobManager.cancelJob(job_id);

    if (!success) {
      const job = jobManager.getJob(job_id);
      if (!job) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Job not found: ${job_id}`
        );
      }

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Cannot cancel job in ${job.status} status. Only pending/running jobs can be cancelled.`
      );
    }

    return `✅ Job cancelled successfully: ${job_id}`;
  } catch (error: any) {
    debugLog('Error cancelling job:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to cancel job: ${error.message}`
    );
  }
}

/**
 * List async jobs with optional filters
 */
export async function listJobs(
  openai: OpenAI,
  params: ListJobsParams
): Promise<string> {
  debugLog('List jobs called with params:', params);

  const {
    status,
    tool_name,
    limit = 20,
    offset = 0,
  } = params;

  // Validation
  if (limit < 1 || limit > 100) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'limit must be between 1 and 100'
    );
  }

  if (offset < 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'offset must be non-negative'
    );
  }

  try {
    const jobManager = getJobManager(openai);
    const jobs = jobManager.listJobs({ status, tool_name, limit, offset });

    if (jobs.length === 0) {
      return 'No jobs found.';
    }

    const statusEmoji = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
    };

    let result = `Found ${jobs.length} job(s):\n\n`;

    for (const job of jobs) {
      const createdDate = new Date(job.created_at).toLocaleString();

      result += `${statusEmoji[job.status]} ${job.job_id}\n`;
      result += `   Status: ${job.status} (${job.progress}%)\n`;
      result += `   Tool: ${job.tool_name}\n`;
      result += `   Created: ${createdDate}\n`;
      result += `   Prompt: ${job.prompt.length > 50 ? job.prompt.substring(0, 50) + '...' : job.prompt}\n`;

      if (job.status === 'completed' && job.output_paths) {
        const paths = JSON.parse(job.output_paths);
        result += `   Output: ${paths.length} file(s)\n`;
      }

      if (job.status === 'failed' && job.error_message) {
        result += `   Error: ${job.error_message}\n`;
      }

      result += '\n';
    }

    // Add pagination info
    const totalCount = jobManager.getTotalCount(status);
    const hasMore = (offset + jobs.length) < totalCount;

    if (hasMore) {
      const remaining = totalCount - (offset + jobs.length);
      result += `\n💡 Showing ${offset + 1}-${offset + jobs.length} of ${totalCount} total jobs`;
      result += `\n   Use offset=${offset + limit} to see next ${Math.min(limit, remaining)} jobs.`;
    } else {
      result += `\n📊 Total: ${totalCount} job(s)`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error listing jobs:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list jobs: ${error.message}`
    );
  }
}
