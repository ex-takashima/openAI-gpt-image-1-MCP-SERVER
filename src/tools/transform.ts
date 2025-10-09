/**
 * Transform image tool - Transform images using gpt-image-1
 */

import OpenAI, { toFile } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { imageFileToBase64, saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';
import { getMimeTypeFromPath } from '../utils/mime.js';
import { normalizeAndValidatePath, getDisplayPath } from '../utils/path.js';

export interface TransformImageParams {
  prompt: string;
  reference_image_base64?: string;
  reference_image_path?: string;
  output_path?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  output_format?: 'png' | 'jpeg' | 'webp';
  moderation?: 'auto' | 'low';
  return_base64?: boolean;
}

export async function transformImage(
  openai: OpenAI,
  params: TransformImageParams
): Promise<string> {
  debugLog('Transform image called with params:', { ...params, reference_image_base64: '[REDACTED]' });

  const {
    prompt,
    reference_image_base64,
    reference_image_path,
    output_path = 'transformed_image.png',
    size = 'auto',
    quality = 'auto',
    output_format = 'png',
    moderation = 'auto',
    return_base64 = false,
  } = params;

  // Normalize and validate output path (cross-platform)
  const normalizedPath = await normalizeAndValidatePath(output_path);

  // Validation
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  if (!reference_image_base64 && !reference_image_path) {
    throw new Error('Either reference_image_base64 or reference_image_path must be provided');
  }

  if (size !== 'auto' && !validateImageSize(size)) {
    throw new Error(`Invalid size: ${size}. Must be one of: 1024x1024, 1024x1536, 1536x1024, auto`);
  }

  if (quality !== 'auto' && !validateQuality(quality)) {
    throw new Error(`Invalid quality: ${quality}. Must be one of: low, medium, high, auto`);
  }

  if (!validateImageFormat(output_format)) {
    throw new Error(`Invalid format: ${output_format}. Must be one of: png, jpeg, webp`);
  }

  try {
    // Prepare reference image as File object
    let referenceImageFile: any;
    if (reference_image_path) {
      // If file path is provided, read the file and convert to File object with proper MIME type
      debugLog(`Loading reference image from file: ${reference_image_path}`);
      const buffer = await fs.readFile(reference_image_path);
      const mimeType = getMimeTypeFromPath(reference_image_path);
      const fileName = path.basename(reference_image_path);
      referenceImageFile = await toFile(buffer, fileName, { type: mimeType });
      debugLog(`Reference image loaded with MIME type: ${mimeType}`);
    } else if (reference_image_base64) {
      // If base64 is provided, convert to File object
      debugLog('Converting reference image from base64 to File object');
      const buffer = Buffer.from(reference_image_base64, 'base64');
      referenceImageFile = await toFile(buffer, 'reference.png', { type: 'image/png' });
    }

    debugLog('Calling OpenAI API for image transformation...');

    // Build request parameters
    // For transformation, we use the edit endpoint without mask
    const requestParams: any = {
      model: 'gpt-image-1',
      prompt,
      image: referenceImageFile,
      n: 1,
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

    if (moderation !== 'auto') {
      requestParams.moderation = moderation;
    }

    debugLog('Request params:', JSON.stringify({ ...requestParams, image: '[REDACTED]' }, null, 2));

    // Use edit endpoint without mask for transformation
    const response = await openai.images.edit(requestParams);

    debugLog('API response received');

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from API');
    }

    const imageData = response.data[0];

    let base64Image: string;

    if (imageData.b64_json) {
      base64Image = imageData.b64_json;
      debugLog('Using b64_json from response');
    } else if (imageData.url) {
      debugLog('Downloading image from URL:', imageData.url);
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
      debugLog('Image downloaded and converted to base64');
    } else {
      throw new Error('No image data (b64_json or url) in response');
    }

    // Save image to file
    await saveBase64Image(base64Image, normalizedPath);

    // Calculate cost (estimated)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = 4096;

    const actualSize = size === 'auto' ? '1024x1024' : size;
    const actualQuality = quality === 'auto' ? 'medium' : quality;

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

    const displayPath = getDisplayPath(normalizedPath);
    let result = `Image transformed successfully: ${displayPath}\n${costInfo}`;

    if (return_base64) {
      result += `\n\n📎 Base64 data (first 100 chars): ${base64Image.substring(0, 100)}...`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error transforming image:', error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        throw new Error(
          'Authentication failed. Please check your OPENAI_API_KEY environment variable.'
        );
      } else if (status === 403) {
        throw new Error(
          'Access denied. Your organization must be verified to use gpt-image-1.'
        );
      } else if (status === 400) {
        if (message.includes('content_policy_violation')) {
          throw new Error(
            'Content policy violation: The prompt was rejected by the safety filters.'
          );
        }
        throw new Error(`Bad request: ${message}`);
      } else {
        throw new Error(`API error (${status}): ${message}`);
      }
    }

    throw new Error(`Failed to transform image: ${error.message}`);
  }
}
