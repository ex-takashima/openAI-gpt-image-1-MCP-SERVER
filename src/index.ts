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
    version: '1.0.0',
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
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
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
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
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
        return_base64: {
          type: 'boolean',
          description: 'Return base64 image data in response (default: false)',
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
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debugLog('Listing available tools');
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  debugLog(`Tool called: ${name}`, args);

  try {
    switch (name) {
      case 'generate_image': {
        const result = await generateImage(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'edit_image': {
        const result = await editImage(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'transform_image': {
        const result = await transformImage(openai, args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'list_generated_images': {
        const result = await listImages(args as any);
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
