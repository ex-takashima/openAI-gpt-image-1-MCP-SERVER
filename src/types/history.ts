/**
 * Type definitions for history management
 */

/**
 * History record stored in database
 */
export interface HistoryRecord {
  uuid: string;
  created_at: string; // ISO 8601 timestamp
  tool_name: string; // generate_image, edit_image, transform_image
  prompt: string;
  parameters: string; // JSON string of parameters
  output_paths: string; // JSON array of output file paths
  sample_count: number;
  size?: string;
  quality?: string;
  output_format?: string;
}

/**
 * Parameters for creating a history record
 */
export interface CreateHistoryParams {
  tool_name: string;
  prompt: string;
  parameters: Record<string, any>;
  output_paths: string[];
  sample_count: number;
  size?: string;
  quality?: string;
  output_format?: string;
}

/**
 * Parameters for searching history
 */
export interface SearchHistoryParams {
  query?: string; // Search in prompt
  tool_name?: string;
  limit?: number;
  offset?: number;
}
