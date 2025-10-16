#!/usr/bin/env node

/**
 * OpenAI GPT-Image-1 MCP Server
 *
 * Model Context Protocol server for OpenAI's gpt-image-1 API
 * Enables image generation and editing through Claude Desktop and other MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { generateImage } from './tools/generate.js';
import { editImage } from './tools/edit.js';
import { transformImage } from './tools/transform.js';
import { listImages } from './tools/list.js';
import { listHistory, getHistoryByUuid } from './tools/history.js';
import { getMetadataFromImage } from './tools/getMetadataFromImage.js';
import {
  startGenerationJob,
  checkJobStatus,
  getJobResult,
  cancelJob,
  listJobs,
} from './tools/async-jobs.js';
import { debugLog } from './utils/cost.js';

// Load environment variables
dotenv.config();

// Validate API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    'Error: OPENAI_API_KEY environment variable is required.\n' +
      'Please set it in your environment or .env file.\n' +
      'Example: export OPENAI_API_KEY="sk-proj-..."\n'
  );
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey,
  organization: process.env.OPENAI_ORGANIZATION,
});

// Create MCP server
const server = new Server(
  {
    name: 'openai-gpt-image-mcp-server',
    version: '1.0.4',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'generate_image',
    description:
      'Generate a new image from a text prompt using OpenAI gpt-image-1. ' +
      'Supports various sizes, quality levels, and output formats. ' +
      'Automatically calculates and reports token usage and cost.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The text prompt describing the image to generate',
        },
        output_path: {
          type: 'string',
          description: 'Output file path (default: generated_image.png)',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
          description: 'Image size (default: auto)',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'auto'],
          description: 'Image quality level (default: auto)',
        },
        output_format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Output image format (default: png)',
        },
        transparent_background: {
          type: 'boolean',
          description: 'Enable transparent background (PNG only, default: false)',
        },
        moderation: {
          type: 'string',
          enum: ['auto', 'low'],
          description: 'Content moderation level (default: auto)',
        },
        sample_count: {
          type: 'number',
          description: 'Number of images to generate (1-10, default: 1)',
          minimum: 1,
          maximum: 10,
        },
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
        },
        include_thumbnail: {
          type: 'boolean',
          description: 'Include thumbnail preview in MCP response for LLM recognition (default: false, overrides OPENAI_IMAGE_THUMBNAIL env var)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'edit_image',
    description:
      'Edit an existing image using inpainting with OpenAI gpt-image-1. ' +
      'Requires a reference image and optional mask image (transparent areas are edited). ' +
      'Automatically calculates and reports token usage and cost.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the desired edits',
        },
        reference_image_base64: {
          type: 'string',
          description: 'Base64 encoded reference image',
        },
        reference_image_path: {
          type: 'string',
          description: 'Path to reference image file',
        },
        mask_image_base64: {
          type: 'string',
          description: 'Base64 encoded mask image (transparent areas will be edited)',
        },
        mask_image_path: {
          type: 'string',
          description: 'Path to mask image file (transparent areas will be edited)',
        },
        output_path: {
          type: 'string',
          description: 'Output file path (default: edited_image.png)',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
          description: 'Image size (default: auto)',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'auto'],
          description: 'Image quality level (default: auto)',
        },
        output_format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Output image format (default: png)',
        },
        moderation: {
          type: 'string',
          enum: ['auto', 'low'],
          description: 'Content moderation level (default: auto)',
        },
        sample_count: {
          type: 'number',
          description: 'Number of images to generate (1-10, default: 1)',
          minimum: 1,
          maximum: 10,
        },
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
        },
        include_thumbnail: {
          type: 'boolean',
          description: 'Include thumbnail preview in MCP response for LLM recognition (default: false, overrides OPENAI_IMAGE_THUMBNAIL env var)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'transform_image',
    description:
      'Transform an existing image to a new style or interpretation using OpenAI gpt-image-1. ' +
      'Takes a reference image and a prompt describing the desired transformation. ' +
      'Automatically calculates and reports token usage and cost.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the desired transformation',
        },
        reference_image_base64: {
          type: 'string',
          description: 'Base64 encoded reference image',
        },
        reference_image_path: {
          type: 'string',
          description: 'Path to reference image file',
        },
        output_path: {
          type: 'string',
          description: 'Output file path (default: transformed_image.png)',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
          description: 'Image size (default: auto)',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'auto'],
          description: 'Image quality level (default: auto)',
        },
        output_format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Output image format (default: png)',
        },
        moderation: {
          type: 'string',
          enum: ['auto', 'low'],
          description: 'Content moderation level (default: auto)',
        },
        sample_count: {
          type: 'number',
          description: 'Number of images to generate (1-10, default: 1)',
          minimum: 1,
          maximum: 10,
        },
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
        },
        include_thumbnail: {
          type: 'boolean',
          description: 'Include thumbnail preview in MCP response for LLM recognition (default: false, overrides OPENAI_IMAGE_THUMBNAIL env var)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'list_generated_images',
    description:
      'List all image files in a directory. ' +
      'Shows file names, sizes, and modification dates sorted by newest first.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Directory path to search (default: current directory)',
        },
      },
    },
  },
  {
    name: 'list_history',
    description:
      'List generation history with optional filters. ' +
      'Shows recent image generation, editing, and transformation operations with their parameters and output files.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of records to return (1-100, default: 20)',
          minimum: 1,
          maximum: 100,
        },
        offset: {
          type: 'number',
          description: 'Number of records to skip (default: 0)',
          minimum: 0,
        },
        tool_name: {
          type: 'string',
          enum: ['generate_image', 'edit_image', 'transform_image'],
          description: 'Filter by specific tool',
        },
        query: {
          type: 'string',
          description: 'Search in prompt text',
        },
      },
    },
  },
  {
    name: 'get_history_by_uuid',
    description:
      'Get detailed information about a specific generation history record by UUID. ' +
      'Shows complete parameters, prompt, and all output files.',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'History record UUID',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'get_metadata_from_image',
    description:
      'Extract and display embedded metadata from a generated image file. ' +
      'Shows UUID, parameter hash, generation settings, and verifies integrity with database. ' +
      'Works with PNG and JPEG images that contain embedded OpenAI GPT-Image metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Path to the image file to read metadata from',
        },
      },
      required: ['image_path'],
    },
  },
  {
    name: 'start_generation_job',
    description:
      'Start an async image generation job that runs in the background. ' +
      'Use this for long-running operations or when you want to queue multiple generations. ' +
      'Returns a job ID that can be used to check status and retrieve results.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_name: {
          type: 'string',
          enum: ['generate_image', 'edit_image', 'transform_image'],
          description: 'Which image tool to use',
        },
        prompt: {
          type: 'string',
          description: 'The generation prompt',
        },
        output_path: {
          type: 'string',
          description: 'Output file path',
        },
        size: {
          type: 'string',
          enum: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
          description: 'Image size',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'auto'],
          description: 'Image quality',
        },
        output_format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Output format',
        },
        sample_count: {
          type: 'number',
          description: 'Number of images (1-10)',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['tool_name', 'prompt'],
    },
  },
  {
    name: 'check_job_status',
    description:
      'Check the status of an async job. ' +
      'Shows current status (pending/running/completed/failed/cancelled) and progress percentage.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: {
          type: 'string',
          description: 'Job ID returned from start_generation_job',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_job_result',
    description:
      'Get the result of a completed async job. ' +
      'Returns output file paths and history UUID. Only works for completed jobs.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: {
          type: 'string',
          description: 'Job ID',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'cancel_job',
    description:
      'Cancel a pending or running async job. ' +
      'Cannot cancel already completed, failed, or cancelled jobs.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: {
          type: 'string',
          description: 'Job ID to cancel',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'list_jobs',
    description:
      'List async jobs with optional filters. ' +
      'Shows job status, progress, creation time, and output information.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
          description: 'Filter by status',
        },
        tool_name: {
          type: 'string',
          enum: ['generate_image', 'edit_image', 'transform_image'],
          description: 'Filter by tool',
        },
        limit: {
          type: 'number',
          description: 'Max results (1-100, default: 20)',
          minimum: 1,
          maximum: 100,
        },
        offset: {
          type: 'number',
          description: 'Skip N results',
          minimum: 0,
        },
      },
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debugLog('Listing available tools');
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Redact sensitive data from logs
  const safeArgs = { ...args };
  if ('reference_image_base64' in safeArgs) {
    safeArgs.reference_image_base64 = '[REDACTED]';
  }
  if ('mask_image_base64' in safeArgs) {
    safeArgs.mask_image_base64 = '[REDACTED]';
  }
  debugLog(`Tool called: ${name}`, safeArgs);

  try {
    switch (name) {
      case 'generate_image': {
        const result = await generateImage(openai, args as any);
        // Result can be string or content object (when thumbnails are included)
        if (typeof result === 'string') {
          return { content: [{ type: 'text', text: result }] };
        }
        return result;
      }

      case 'edit_image': {
        const result = await editImage(openai, args as any);
        // Result can be string or content object (when thumbnails are included)
        if (typeof result === 'string') {
          return { content: [{ type: 'text', text: result }] };
        }
        return result;
      }

      case 'transform_image': {
        const result = await transformImage(openai, args as any);
        // Result can be string or content object (when thumbnails are included)
        if (typeof result === 'string') {
          return { content: [{ type: 'text', text: result }] };
        }
        return result;
      }

      case 'list_generated_images': {
        const result = await listImages(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'list_history': {
        const result = await listHistory(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'get_history_by_uuid': {
        const result = await getHistoryByUuid(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'get_metadata_from_image': {
        const result = await getMetadataFromImage(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'start_generation_job': {
        const result = await startGenerationJob(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'check_job_status': {
        const result = await checkJobStatus(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'get_job_result': {
        const result = await getJobResult(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'cancel_job': {
        const result = await cancelJob(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'list_jobs': {
        const result = await listJobs(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error: any) {
    debugLog('Tool execution error:', error);

    // Return user-friendly error message
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  debugLog('Starting OpenAI GPT-Image-1 MCP Server');
  debugLog(`API Key configured: ${apiKey!.substring(0, 10)}...`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  debugLog('Server running on stdio transport');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
