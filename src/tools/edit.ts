/**
 * Edit image tool - Edit images using inpainting with gpt-image-1
 */

import OpenAI, { toFile } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { imageFileToBase64, saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';
import { getMimeTypeFromPath } from '../utils/mime.js';
import { normalizeAndValidatePath, getDisplayPath, normalizeInputPath } from '../utils/path.js';
import { getDatabase } from '../utils/database.js';
import { saveImageWithMetadata, generateImageUUID, calculateParamsHash, buildMetadataObject } from '../utils/metadata.js';
import { generateThumbnailDataFromFile, createThumbnailContent, isThumbnailEnabled } from '../utils/thumbnail.js';
import type { EditImageParams } from '../types/tools.js';

export async function editImage(
  openai: OpenAI,
  params: EditImageParams
): Promise<string | { content: Array<{ type: string; text?: string; data?: string; mimeType?: string; annotations?: any }> }> {
  debugLog('Edit image called with params:', { ...params, reference_image_base64: '[REDACTED]', mask_image_base64: '[REDACTED]' });

  const {
    prompt,
    reference_image_base64,
    reference_image_path,
    mask_image_base64,
    mask_image_path,
    output_path = 'edited_image.png',
    size = 'auto',
    quality = 'auto',
    output_format = 'png',
    moderation = 'auto',
    sample_count = 1,
    return_base64 = false,
    include_thumbnail,
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

  if (!reference_image_base64 && !reference_image_path) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Either reference_image_base64 or reference_image_path must be provided'
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
      moderation,
      sample_count,
    };

    // Calculate parameter hash for integrity verification
    const paramsHash = calculateParamsHash(paramsForHash);
    debugLog(`[Metadata] Calculated params hash: ${paramsHash.substring(0, 16)}...`);

    // Prepare reference image as File object
    let referenceImageFile: any;
    if (reference_image_path) {
      // If file path is provided, normalize, validate, and read the file
      debugLog(`Loading reference image from file: ${reference_image_path}`);
      const resolvedPath = await normalizeInputPath(reference_image_path);
      debugLog(`Resolved reference image path: ${resolvedPath}`);
      const buffer = await fs.readFile(resolvedPath);
      const mimeType = getMimeTypeFromPath(resolvedPath);
      const fileName = path.basename(resolvedPath);
      referenceImageFile = await toFile(buffer, fileName, { type: mimeType });
      debugLog(`Reference image loaded with MIME type: ${mimeType}`);
    } else if (reference_image_base64) {
      // If base64 is provided, convert to File object
      debugLog('Converting reference image from base64 to File object');
      const buffer = Buffer.from(reference_image_base64, 'base64');
      referenceImageFile = await toFile(buffer, 'reference.png', { type: 'image/png' });
    }

    // Prepare mask image as File object (optional)
    let maskImageFile: any = undefined;
    if (mask_image_path) {
      debugLog(`Loading mask image from file: ${mask_image_path}`);
      const resolvedPath = await normalizeInputPath(mask_image_path);
      debugLog(`Resolved mask image path: ${resolvedPath}`);
      const buffer = await fs.readFile(resolvedPath);
      const mimeType = getMimeTypeFromPath(resolvedPath);
      const fileName = path.basename(resolvedPath);
      maskImageFile = await toFile(buffer, fileName, { type: mimeType });
      debugLog(`Mask image loaded with MIME type: ${mimeType}`);
    } else if (mask_image_base64) {
      debugLog('Converting mask image from base64 to File object');
      const buffer = Buffer.from(mask_image_base64, 'base64');
      maskImageFile = await toFile(buffer, 'mask.png', { type: 'image/png' });
    }

    debugLog('Calling OpenAI API for image editing...');

    // Build request parameters
    const requestParams: any = {
      model: 'gpt-image-1',
      prompt,
      image: referenceImageFile,
      n: sample_count,
    };

    if (maskImageFile) {
      requestParams.mask = maskImageFile;
    }

    if (size !== 'auto') {
      requestParams.size = size;
    }

    if (quality !== 'auto') {
      requestParams.quality = quality;
    }

    if (output_format !== 'png') {
      requestParams.output_format = output_format;
    }

    if (moderation !== 'auto') {
      requestParams.moderation = moderation;
    }

    debugLog('Request params:', JSON.stringify({ ...requestParams, image: '[REDACTED]', mask: maskImageFile ? '[REDACTED]' : undefined }, null, 2));

    const response = await openai.images.edit(requestParams);

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

    // Process and save all edited images
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
        'edit_image',
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
      tool_name: 'edit_image',
      prompt,
      parameters: {
        size,
        quality,
        output_format,
        moderation,
        sample_count,
        has_mask: !!(mask_image_base64 || mask_image_path),
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
      resultText = `Image edited successfully: ${displayPath}\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    } else {
      resultText = `${sample_count} images edited successfully:\n`;
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
    debugLog('Error editing image:', error);

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
          'Access denied. Your organization must be verified to use gpt-image-1.'
        );
      } else if (status === 400) {
        if (message.includes('content_policy_violation')) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Content policy violation: The prompt was rejected by the safety filters.'
          );
        }
        throw new McpError(ErrorCode.InvalidRequest, `Bad request: ${message}`);
      } else {
        throw new McpError(ErrorCode.InternalError, `API error (${status}): ${message}`);
      }
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to edit image: ${error.message}`
    );
  }
}
