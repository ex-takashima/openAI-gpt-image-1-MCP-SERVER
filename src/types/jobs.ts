/**
 * Type definitions for async job management
 */

/**
 * Job status enumeration
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job record in database
 */
export interface JobRecord {
  job_id: string;
  created_at: string;
  updated_at: string;
  status: JobStatus;
  tool_name: string;
  prompt: string;
  parameters: string; // JSON string
  sample_count: number;
  output_paths: string | null; // JSON array or null
  history_uuid: string | null;
  error_message: string | null;
  progress: number; // 0-100
}

/**
 * Parameters for creating a new job
 */
export interface CreateJobParams {
  tool_name: string;
  prompt: string;
  parameters: Record<string, any>;
  sample_count: number;
}

/**
 * Parameters for updating job status
 */
export interface UpdateJobParams {
  status?: JobStatus;
  progress?: number;
  output_paths?: string[];
  history_uuid?: string;
  error_message?: string;
}

/**
 * Parameters for searching jobs
 */
export interface SearchJobsParams {
  status?: JobStatus;
  tool_name?: string;
  limit?: number;
  offset?: number;
}
