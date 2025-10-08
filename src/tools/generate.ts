/**
 * Generate image tool - Create images from text prompts using gpt-image-1
 */

import OpenAI from 'openai';
import { saveBase64Image, validateImageFormat, validateImageSize, validateQuality } from '../utils/image.js';
import { calculateCost, formatCostBreakdown, debugLog } from '../utils/cost.js';

export interface GenerateImageParams {
  prompt: string;
  output_path?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  output_format?: 'png' | 'jpeg' | 'webp';
  transparent_background?: boolean;
  moderation?: 'auto' | 'low';
  return_base64?: boolean;
}

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
    return_base64 = false,
  } = params;

  // Validation
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  if (output_format !== 'png' && transparent_background) {
    throw new Error('Transparent background is only supported with PNG format');
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
    debugLog('Calling OpenAI API...');

    // Build request parameters
    const requestParams: any = {
      model: 'gpt-image-1',
      prompt,
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
      throw new Error('No image data returned from API');
    }

    const imageData = response.data[0];

    let base64Image: string;

    if (imageData.b64_json) {
      // If base64 is provided directly
      base64Image = imageData.b64_json;
      debugLog('Using b64_json from response');
    } else if (imageData.url) {
      // If URL is provided, download the image
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
    await saveBase64Image(base64Image, output_path);

    // Calculate cost (estimated)
    const estimatedInputTokens = Math.ceil(prompt.length / 4); // Rough estimate
    const estimatedOutputTokens = 4096; // Typical image generation tokens

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

    let result = `Image generated successfully: ${output_path}\n${costInfo}`;

    if (return_base64) {
      result += `\n\n📎 Base64 data (first 100 chars): ${base64Image.substring(0, 100)}...`;
    }

    return result;
  } catch (error: any) {
    debugLog('Error generating image:', error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        throw new Error(
          'Authentication failed. Please check your OPENAI_API_KEY environment variable.'
        );
      } else if (status === 403) {
        throw new Error(
          'Access denied. Your organization must be verified to use gpt-image-1. ' +
            'Please complete organization verification at: https://platform.openai.com/settings/organization/general'
        );
      } else if (status === 400) {
        if (message.includes('content_policy_violation')) {
          throw new Error(
            'Content policy violation: The prompt was rejected by the safety filters. ' +
              'Please modify your prompt and try again.'
          );
        }
        throw new Error(`Bad request: ${message}`);
      } else {
        throw new Error(`API error (${status}): ${message}`);
      }
    }

    throw new Error(`Failed to generate image: ${error.message}`);
  }
}
