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
import { saveImageWithMetadata } from '../utils/metadata.js';
import type { EditImageParams } from '../types/tools.js';

export async function editImage(
  openai: OpenAI,
  params: EditImageParams
): Promise<string> {
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

      let base64Image: string;

      if (imageData.b64_json) {
        base64Image = imageData.b64_json;
        debugLog(`Image ${i + 1}: Using b64_json from response`);
      } else if (imageData.url) {
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
        tool: 'edit_image',
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
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = 4096 * sample_count;

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
    });

    debugLog(`History record created: ${historyUuid}`);

    // Build result message
    let result: string;
    if (sample_count === 1) {
      const displayPath = getDisplayPath(savedPaths[0]);
      result = `Image edited successfully: ${displayPath}\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    } else {
      result = `${sample_count} images edited successfully:\n`;
      savedPaths.forEach((path, idx) => {
        result += `  ${idx + 1}. ${getDisplayPath(path)}\n`;
      });
      result += `\n${costInfo}\n\n📝 History ID: ${historyUuid}`;
    }

    return result;
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
