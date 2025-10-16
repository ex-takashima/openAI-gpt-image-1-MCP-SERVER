/**
 * Thumbnail generation utilities for MCP image responses
 * Uses Sharp for high-performance image processing
 */

import sharp from 'sharp';
import * as fs from 'fs/promises';
import { debugLog } from './cost.js';

/**
 * Thumbnail configuration
 */
export interface ThumbnailConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

/**
 * Thumbnail generation result
 */
export interface ThumbnailResult {
  base64: string;
  mimeType: string;
  size: number;
}

/**
 * Default thumbnail configuration
 */
export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  maxWidth: parseInt(process.env.OPENAI_IMAGE_THUMBNAIL_SIZE || '128', 10),
  maxHeight: parseInt(process.env.OPENAI_IMAGE_THUMBNAIL_SIZE || '128', 10),
  quality: parseInt(process.env.OPENAI_IMAGE_THUMBNAIL_QUALITY || '60', 10),
  format: 'jpeg',
};

/**
 * Check if thumbnail generation is enabled
 */
export function isThumbnailEnabled(): boolean {
  return process.env.OPENAI_IMAGE_THUMBNAIL === 'true';
}

/**
 * Generate thumbnail from image file
 *
 * @param filePath - Path to source image file
 * @param config - Thumbnail configuration (optional)
 * @returns Base64-encoded thumbnail data with metadata
 */
export async function generateThumbnailDataFromFile(
  filePath: string,
  config: ThumbnailConfig = DEFAULT_THUMBNAIL_CONFIG
): Promise<ThumbnailResult> {
  try {
    debugLog(`[Thumbnail] Generating thumbnail for: ${filePath}`);
    debugLog(`[Thumbnail] Config:`, config);

    // Validate config
    const validatedConfig = {
      maxWidth: Math.max(1, Math.min(config.maxWidth, 512)),
      maxHeight: Math.max(1, Math.min(config.maxHeight, 512)),
      quality: Math.max(1, Math.min(config.quality, 100)),
      format: config.format,
    };

    // Read and process image
    const imageBuffer = await fs.readFile(filePath);

    let processedImage = sharp(imageBuffer)
      .resize({
        width: validatedConfig.maxWidth,
        height: validatedConfig.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Apply format-specific compression
    let mimeType: string;
    switch (validatedConfig.format) {
      case 'jpeg':
        processedImage = processedImage.jpeg({
          quality: validatedConfig.quality,
          progressive: true,
        });
        mimeType = 'image/jpeg';
        break;
      case 'png':
        processedImage = processedImage.png({
          quality: validatedConfig.quality,
        });
        mimeType = 'image/png';
        break;
      case 'webp':
        processedImage = processedImage.webp({
          quality: validatedConfig.quality,
        });
        mimeType = 'image/webp';
        break;
      default:
        processedImage = processedImage.jpeg({
          quality: validatedConfig.quality,
          progressive: true,
        });
        mimeType = 'image/jpeg';
    }

    // Generate thumbnail buffer
    const thumbnailBuffer = await processedImage.toBuffer();
    const base64 = thumbnailBuffer.toString('base64');

    debugLog(`[Thumbnail] Generated successfully: ${thumbnailBuffer.length} bytes`);

    return {
      base64,
      mimeType,
      size: thumbnailBuffer.length,
    };
  } catch (error: any) {
    debugLog(`[Thumbnail] Error generating thumbnail:`, error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

/**
 * Create MCP image content from thumbnail data
 *
 * @param thumbnailData - Thumbnail data result
 * @param priority - Display priority (0.0-1.0)
 * @returns MCP image content object
 */
export function createThumbnailContent(
  thumbnailData: ThumbnailResult,
  priority: number = 0.8
) {
  return {
    type: 'image' as const,
    data: thumbnailData.base64,
    mimeType: thumbnailData.mimeType,
    annotations: {
      audience: ['user', 'assistant'] as const,
      priority,
    },
  };
}
