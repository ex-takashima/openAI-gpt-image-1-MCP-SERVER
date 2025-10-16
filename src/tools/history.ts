/**
 * History management tools - List and retrieve generation history
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../utils/database.js';
import { debugLog } from '../utils/cost.js';
import { getDisplayPath } from '../utils/path.js';

/**
 * Parameters for list_history tool
 */
export interface ListHistoryParams {
  limit?: number;
  offset?: number;
  tool_name?: string;
  query?: string;
}

/**
 * Parameters for get_history_by_uuid tool
 */
export interface GetHistoryByUuidParams {
  uuid: string;
}

/**
 * List generation history with optional filters
 */
export async function listHistory(params: ListHistoryParams): Promise<string> {
  debugLog('List history called with params:', params);

  const {
    limit = 20,
    offset = 0,
    tool_name,
    query,
  } = params;

  // Validation
  if (limit < 1 || limit > 100) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Limit must be between 1 and 100'
    );
  }

  if (offset < 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Offset must be non-negative'
    );
  }

  try {
    const db = getDatabase();

    let records;
    if (query || tool_name) {
      // Use search if filters are provided
      records = db.search({
        query,
        tool_name,
        limit,
        offset,
      });
    } else {
      // List recent records
      records = db.listRecent(limit, offset);
    }

    if (records.length === 0) {
      return 'No history records found.';
    }

    // Format results
    let result = `Found ${records.length} history record(s):\n\n`;

    for (const record of records) {
      const params = JSON.parse(record.parameters);
      const outputPaths = JSON.parse(record.output_paths);
      const createdDate = new Date(record.created_at).toLocaleString();

      result += `📝 ${record.uuid}\n`;
      result += `   Tool: ${record.tool_name}\n`;
      result += `   Created: ${createdDate}\n`;
      result += `   Prompt: ${record.prompt.length > 60 ? record.prompt.substring(0, 60) + '...' : record.prompt}\n`;

      if (record.sample_count > 1) {
        result += `   Images: ${record.sample_count} images\n`;
      }

      if (record.size) {
        result += `   Size: ${record.size}`;
        if (record.quality) {
          result += ` | Quality: ${record.quality}`;
        }
        if (record.output_format) {
          result += ` | Format: ${record.output_format}`;
        }
        result += '\n';
      }

      // Show cost information if available
      if (record.estimated_cost !== null && record.estimated_cost !== undefined) {
        result += `   💰 Cost: $${record.estimated_cost.toFixed(3)}`;
        if (record.total_tokens) {
          result += ` (${record.total_tokens.toLocaleString()} tokens)`;
        }
        result += '\n';
      }

      // Show first output path
      if (outputPaths.length > 0) {
        result += `   Output: ${getDisplayPath(outputPaths[0])}`;
        if (outputPaths.length > 1) {
          result += ` (+${outputPaths.length - 1} more)`;
        }
        result += '\n';
      }

      result += '\n';
    }

    // Add pagination info
    const totalCount = db.getTotalCount();
    const hasMore = (offset + records.length) < totalCount;

    if (hasMore) {
      const remaining = totalCount - (offset + records.length);
      result += `\n💡 Showing ${offset + 1}-${offset + records.length} of ${totalCount} total records`;
      result += `\n   Use offset=${offset + limit} to see next ${Math.min(limit, remaining)} records.`;
    } else {
      result += `\n📊 Total: ${totalCount} record(s)`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error listing history:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list history: ${error.message}`
    );
  }
}

/**
 * Get a specific history record by UUID
 */
export async function getHistoryByUuid(params: GetHistoryByUuidParams): Promise<string> {
  debugLog('Get history by UUID called with params:', params);

  const { uuid } = params;

  // Validation
  if (!uuid || uuid.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'UUID is required'
    );
  }

  try {
    const db = getDatabase();
    const record = db.getByUuid(uuid);

    if (!record) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `History record not found: ${uuid}`
      );
    }

    // Parse JSON fields
    const params = JSON.parse(record.parameters);
    const outputPaths = JSON.parse(record.output_paths);
    const createdDate = new Date(record.created_at).toLocaleString();

    // Format detailed result
    let result = `📝 History Record: ${record.uuid}\n\n`;
    result += `🛠️  Tool: ${record.tool_name}\n`;
    result += `📅 Created: ${createdDate}\n\n`;
    result += `💬 Prompt:\n${record.prompt}\n\n`;

    // Parameters
    result += `⚙️  Parameters:\n`;
    for (const [key, value] of Object.entries(params)) {
      result += `   ${key}: ${JSON.stringify(value)}\n`;
    }

    // Image details
    if (record.sample_count > 1) {
      result += `\n📊 Generated ${record.sample_count} images\n`;
    }

    if (record.size || record.quality || record.output_format) {
      result += '\n🎨 Image Settings:\n';
      if (record.size) result += `   Size: ${record.size}\n`;
      if (record.quality) result += `   Quality: ${record.quality}\n`;
      if (record.output_format) result += `   Format: ${record.output_format}\n`;
    }

    // Cost information
    if (record.estimated_cost !== null && record.estimated_cost !== undefined) {
      result += '\n💰 Cost Information:\n';
      result += `   Estimated cost: $${record.estimated_cost.toFixed(3)}\n`;

      if (record.input_tokens) {
        result += `   Input tokens: ${record.input_tokens.toLocaleString()}\n`;
      }
      if (record.output_tokens) {
        result += `   Output tokens: ${record.output_tokens.toLocaleString()}\n`;
      }
      if (record.total_tokens) {
        result += `   Total tokens: ${record.total_tokens.toLocaleString()}\n`;
      }
    }

    // Output files
    result += '\n📁 Output Files:\n';
    for (let i = 0; i < outputPaths.length; i++) {
      result += `   ${i + 1}. ${getDisplayPath(outputPaths[i])}\n`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error getting history by UUID:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get history: ${error.message}`
    );
  }
}
