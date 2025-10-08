/**
 * Transform image tool - Transform images using gpt-image-1
 */

import OpenAI from 'openai';
import { imageFileToBase64, saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';

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
    // Load reference image
    let referenceBase64 = reference_image_base64;
    if (!referenceBase64 && reference_image_path) {
      debugLog(`Loading reference image from: ${reference_image_path}`);
      referenceBase64 = await imageFileToBase64(reference_image_path);
    }

    debugLog('Calling OpenAI API for image transformation...');

    // Build request parameters
    // For transformation, we use the variations endpoint or edit without mask
    const requestParams: any = {
      model: 'gpt-image-1',
      prompt,
      image: referenceBase64!,
      response_format: 'b64_json',
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

    // Use edit endpoint without mask for transformation
    const response = await openai.images.edit(requestParams);

    debugLog('API response received');

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from API');
    }

    const imageData = response.data[0];
    if (!imageData.b64_json) {
      throw new Error('No base64 image data in response');
    }

    // Save image to file
    await saveBase64Image(imageData.b64_json, output_path);

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

    let result = `Image transformed successfully: ${output_path}\n${costInfo}`;

    if (return_base64) {
      result += `\n\n📎 Base64 data (first 100 chars): ${imageData.b64_json.substring(0, 100)}...`;
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
