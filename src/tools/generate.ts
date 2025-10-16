/**
 * Generate image tool - Create images from text prompts using gpt-image-1
 */

import OpenAI from 'openai';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';
import { normalizeAndValidatePath, getDisplayPath, generateUniqueFilePath } from '../utils/path.js';
import { getDatabase } from '../utils/database.js';
import { saveImageWithMetadata, generateImageUUID, calculateParamsHash, buildMetadataObject } from '../utils/metadata.js';
import { generateThumbnailDataFromFile, createThumbnailContent, isThumbnailEnabled } from '../utils/thumbnail.js';
import type { GenerateImageParams } from '../types/tools.js';

export async function generateImage(
  openai: OpenAI,
  params: GenerateImageParams
): Promise<string | { content: Array<{ type: string; text?: string; data?: string; mimeType?: string; annotations?: any }> }> {
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
    include_thumbnail,
  } = params;

  // Normalize and validate output path (cross-platform)
  let normalizedPath = await normalizeAndValidatePath(output_path);

  // Generate unique file path to avoid overwriting existing files
  normalizedPath = await generateUniqueFilePath(normalizedPath);

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
    // Generate UUID for this image generation
    const uuid = generateImageUUID();
    debugLog(`[Metadata] Generated UUID: ${uuid}`);

    // Build params object for hashing (all generation parameters)
    const paramsForHash = {
      model: 'gpt-image-1',
      prompt,
      size,
      quality,
      output_format,
      transparent_background,
      moderation,
      sample_count,
    };

    // Calculate parameter hash for integrity verification
    const paramsHash = calculateParamsHash(paramsForHash);
    debugLog(`[Metadata] Calculated params hash: ${paramsHash.substring(0, 16)}...`);

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

      // gpt-image-1 always returns b64_json (URL is not supported)
      if (!imageData.b64_json) {
        throw new McpError(
          ErrorCode.InternalError,
          `No image data (b64_json) in response for image ${i + 1}`
        );
      }

      const base64Image = imageData.b64_json;
      debugLog(`Image ${i + 1}: Using b64_json from response`);

      // Generate numbered filename for multiple images
      let imagePath = normalizedPath;
      if (sample_count > 1) {
        const pathParts = normalizedPath.split('.');
        const ext = pathParts.pop();
        const basePath = pathParts.join('.');
        imagePath = `${basePath}_${i + 1}.${ext}`;
      }

      // Build metadata object for embedding (spec compliant)
      const metadata = buildMetadataObject(
        uuid,
        paramsHash,
        'generate_image',
        'gpt-image-1',
        actualSize,
        actualQuality,
        prompt,
        paramsForHash
      );

      // Save image to file with embedded metadata
      await saveImageWithMetadata(base64Image, imagePath, metadata);
      savedPaths.push(imagePath);
      debugLog(`Image ${i + 1}: Saved to ${imagePath}`);
    }

    // Get actual token usage from API response (gpt-image-1 specific)
    let inputTokens: number;
    let outputTokens: number;

    if (response.usage) {
      // Use actual values from API
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      debugLog(`[Usage] Actual tokens from API - Input: ${inputTokens}, Output: ${outputTokens}`);
    } else {
      // Fallback to estimation if usage is not available
      inputTokens = Math.ceil(prompt.length / 4);
      outputTokens = 4096 * sample_count;
      debugLog(`[Usage] Estimated tokens - Input: ${inputTokens}, Output: ${outputTokens}`);
    }

    const cost = calculateCost(inputTokens, outputTokens, {
      size: actualSize,
      quality: actualQuality,
      format: output_format,
    });

    const costInfo = formatCostBreakdown(cost, {
      size: actualSize,
      quality: actualQuality,
      format: output_format,
    });

    // Calculate total tokens
    const totalTokens = inputTokens + outputTokens;

    // Save to history database (use the same UUID)
    const db = getDatabase();
    const historyUuid = db.createRecord({
      uuid, // Use the generated UUID
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
      params_hash: paramsHash, // Add params hash for integrity verification
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost: cost.totalCost,
    });

    debugLog(`History record created: ${historyUuid}`);

    // Determine if thumbnails should be included
    const shouldIncludeThumbnail =
      include_thumbnail !== undefined
        ? include_thumbnail
        : isThumbnailEnabled();

    // Build result message
    let resultText: string;
    if (sample_count === 1) {
      const displayPath = getDisplayPath(savedPaths[0]);
      resultText = `Image generated successfully: ${displayPath}\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    } else {
      resultText = `${sample_count} images generated successfully:\n`;
      savedPaths.forEach((path, idx) => {
        resultText += `  ${idx + 1}. ${getDisplayPath(path)}\n`;
      });
      resultText += `\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    }

    // Return with thumbnails if enabled
    if (shouldIncludeThumbnail) {
      debugLog('[Thumbnail] Including thumbnails in response');
      const content: Array<{ type: string; text?: string; data?: string; mimeType?: string; annotations?: any }> = [
        { type: 'text', text: resultText },
      ];

      // Generate and add thumbnails for each image
      for (const imagePath of savedPaths) {
        try {
          const thumbnailData = await generateThumbnailDataFromFile(imagePath);
          const thumbnailContent = createThumbnailContent(thumbnailData);
          content.push(thumbnailContent);
          debugLog(`[Thumbnail] Added thumbnail for: ${imagePath}`);
        } catch (error: any) {
          debugLog(`[WARNING] Failed to generate thumbnail for ${imagePath}:`, error.message);
          // Continue without thumbnail for this image
        }
      }

      return { content };
    }

    return resultText;
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
