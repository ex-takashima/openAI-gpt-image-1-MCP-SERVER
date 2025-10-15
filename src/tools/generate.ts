/**
 * Generate image tool - Create images from text prompts using gpt-image-1
 */

import OpenAI from 'openai';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';
import { normalizeAndValidatePath, getDisplayPath } from '../utils/path.js';
import { getDatabase } from '../utils/database.js';
import { saveImageWithMetadata } from '../utils/metadata.js';
import type { GenerateImageParams } from '../types/tools.js';

export async function generateImage(
  openai: OpenAI,
  params: GenerateImageParams
): Promise<string> {
  debugLog('Generate image called with params:', params);

  const {
    prompt,
    output_path = 'generated_image.png',
    size = 'auto',
    quality = 'auto',
    output_format = 'png',
    transparent_background = false,
    moderation = 'auto',
    sample_count = 1,
    return_base64 = false,
  } = params;

  // Normalize and validate output path (cross-platform)
  const normalizedPath = await normalizeAndValidatePath(output_path);

  // Validation
  if (!prompt || prompt.trim().length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Prompt is required and cannot be empty'
    );
  }

  if (output_format !== 'png' && transparent_background) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Transparent background is only supported with PNG format'
    );
  }

  if (size !== 'auto' && !validateImageSize(size)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid size: ${size}. Must be one of: 1024x1024, 1024x1536, 1536x1024, auto`
    );
  }

  if (quality !== 'auto' && !validateQuality(quality)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid quality: ${quality}. Must be one of: low, medium, high, auto`
    );
  }

  if (!validateImageFormat(output_format)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid format: ${output_format}. Must be one of: png, jpeg, webp`
    );
  }

  if (sample_count < 1 || sample_count > 10) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid sample_count: ${sample_count}. Must be between 1 and 10`
    );
  }

  try {
    debugLog('Calling OpenAI API...');

    // Build request parameters
    const requestParams: any = {
      model: 'gpt-image-1',
      prompt,
      n: sample_count,
    };

    if (size !== 'auto') {
      requestParams.size = size;
    }

    if (quality !== 'auto') {
      requestParams.quality = quality;
    }

    if (output_format !== 'png') {
      requestParams.output_format = output_format;
    }

    if (transparent_background) {
      requestParams.transparent_background = true;
    }

    if (moderation !== 'auto') {
      requestParams.moderation = moderation;
    }

    debugLog('Request params:', JSON.stringify(requestParams, null, 2));

    const response = await openai.images.generate(requestParams);

    debugLog('API response received');

    if (!response.data || response.data.length === 0) {
      throw new McpError(
        ErrorCode.InternalError,
        'No image data returned from API'
      );
    }

    debugLog(`Received ${response.data.length} image(s) from API`);

    // Determine actual values for metadata
    const actualSize = size === 'auto' ? '1024x1024' : size;
    const actualQuality = quality === 'auto' ? 'medium' : quality;

    // Process and save all generated images
    const savedPaths: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageData = response.data[i];

      let base64Image: string;

      if (imageData.b64_json) {
        // If base64 is provided directly
        base64Image = imageData.b64_json;
        debugLog(`Image ${i + 1}: Using b64_json from response`);
      } else if (imageData.url) {
        // If URL is provided, download the image
        debugLog(`Image ${i + 1}: Downloading from URL:`, imageData.url);
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to download image ${i + 1}: ${imageResponse.statusText}`
          );
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(arrayBuffer).toString('base64');
        debugLog(`Image ${i + 1}: Downloaded and converted to base64`);
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          `No image data (b64_json or url) in response for image ${i + 1}`
        );
      }

      // Generate numbered filename for multiple images
      let imagePath = normalizedPath;
      if (sample_count > 1) {
        const pathParts = normalizedPath.split('.');
        const ext = pathParts.pop();
        const basePath = pathParts.join('.');
        imagePath = `${basePath}_${i + 1}.${ext}`;
      }

      // Prepare metadata for embedding
      const metadata = {
        tool: 'generate_image',
        prompt,
        model: 'gpt-image-1',
        size: actualSize,
        quality: actualQuality,
        format: output_format,
        created_at: new Date().toISOString(),
      };

      // Save image to file with embedded metadata
      await saveImageWithMetadata(base64Image, imagePath, metadata);
      savedPaths.push(imagePath);
      debugLog(`Image ${i + 1}: Saved to ${imagePath}`);
    }

    // Calculate cost (estimated) - multiply by number of images
    const estimatedInputTokens = Math.ceil(prompt.length / 4); // Rough estimate
    const estimatedOutputTokens = 4096 * sample_count; // Typical image generation tokens per image

    const cost = calculateCost(estimatedInputTokens, estimatedOutputTokens, {
      size: actualSize,
      quality: actualQuality,
      format: output_format,
    });

    const costInfo = formatCostBreakdown(cost, {
      size: actualSize,
      quality: actualQuality,
      format: output_format,
    });

    // Save to history database
    const db = getDatabase();
    const historyUuid = db.createRecord({
      tool_name: 'generate_image',
      prompt,
      parameters: {
        size,
        quality,
        output_format,
        transparent_background,
        moderation,
        sample_count,
      },
      output_paths: savedPaths,
      sample_count,
      size: actualSize,
      quality: actualQuality,
      output_format,
    });

    debugLog(`History record created: ${historyUuid}`);

    // Build result message
    let result: string;
    if (sample_count === 1) {
      const displayPath = getDisplayPath(savedPaths[0]);
      result = `Image generated successfully: ${displayPath}\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    } else {
      result = `${sample_count} images generated successfully:\n`;
      savedPaths.forEach((path, idx) => {
        result += `  ${idx + 1}. ${getDisplayPath(path)}\n`;
      });
      result += `\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error generating image:', error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Authentication failed. Please check your OPENAI_API_KEY environment variable.'
        );
      } else if (status === 403) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Access denied. Your organization must be verified to use gpt-image-1. ' +
            'Please complete organization verification at: https://platform.openai.com/settings/organization/general'
        );
      } else if (status === 400) {
        if (message.includes('content_policy_violation')) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Content policy violation: The prompt was rejected by the safety filters. ' +
              'Please modify your prompt and try again.'
          );
        }
        throw new McpError(ErrorCode.InvalidRequest, `Bad request: ${message}`);
      } else {
        throw new McpError(ErrorCode.InternalError, `API error (${status}): ${message}`);
      }
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to generate image: ${error.message}`
    );
  }
}
