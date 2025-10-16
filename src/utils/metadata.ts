/**
 * Image metadata embedding utilities - Spec Compliant Version
 * Embeds generation metadata into PNG and JPEG images
 * Compliant with Vertex AI Imagen metadata embedding specification
 */

import { randomUUID, createHash } from 'crypto';
import * as fs from 'fs/promises';
import { debugLog } from './cost.js';
import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import text from 'png-chunk-text';
import sharp from 'sharp';

/**
 * Metadata to embed in images (Spec Compliant)
 */
export interface ImageMetadata {
  // Required (all levels)
  openai_gpt_image_uuid: string;
  params_hash: string;

  // Standard level and above
  tool_name?: string;
  model?: string;
  created_at?: string;
  size?: string; // e.g., "1024x1024"
  quality?: string; // e.g., "high"

  // Full level only
  prompt?: string;
  parameters?: Record<string, any>;
}

/**
 * Metadata levels
 */
export type MetadataLevel = 'minimal' | 'standard' | 'full';

/**
 * Generate UUID for image (RFC 4122 v4)
 */
export function generateImageUUID(): string {
  return randomUUID();
}

/**
 * Calculate SHA-256 hash of parameters (sorted for consistency)
 */
export function calculateParamsHash(params: Record<string, any>): string {
  // Sort keys for consistent hashing
  const sortedKeys = Object.keys(params).sort();
  const sortedParams: Record<string, any> = {};

  for (const key of sortedKeys) {
    sortedParams[key] = params[key];
  }

  const paramsJson = JSON.stringify(sortedParams);
  return createHash('sha256').update(paramsJson, 'utf8').digest('hex');
}

/**
 * Check if metadata embedding is enabled
 */
export function isMetadataEmbeddingEnabled(): boolean {
  const envValue = process.env.OPENAI_IMAGE_EMBED_METADATA;
  // Default is true (enabled)
  return envValue !== 'false' && envValue !== '0';
}

/**
 * Get metadata level from environment variable
 */
export function getMetadataLevel(): MetadataLevel {
  const envValue = process.env.OPENAI_IMAGE_METADATA_LEVEL;

  if (envValue === 'minimal' || envValue === 'standard' || envValue === 'full') {
    return envValue;
  }

  // Default is 'standard'
  return 'standard';
}

/**
 * Build metadata object based on level
 */
export function buildMetadataObject(
  uuid: string,
  paramsHash: string,
  toolName: string,
  model: string,
  size: string,
  quality: string,
  prompt?: string,
  parameters?: Record<string, any>,
  level?: MetadataLevel
): ImageMetadata {
  const metadataLevel = level || getMetadataLevel();

  const metadata: ImageMetadata = {
    openai_gpt_image_uuid: uuid,
    params_hash: paramsHash,
  };

  // Standard level and above
  if (metadataLevel === 'standard' || metadataLevel === 'full') {
    metadata.tool_name = toolName;
    metadata.model = model;
    metadata.created_at = new Date().toISOString();
    metadata.size = size;
    metadata.quality = quality;
  }

  // Full level only
  if (metadataLevel === 'full' && prompt && parameters) {
    metadata.prompt = prompt;
    metadata.parameters = parameters;
  }

  return metadata;
}

/**
 * Embed metadata into PNG image
 * Uses png-chunks-extract, png-chunks-encode, png-chunk-text libraries
 */
export async function embedMetadataPNG(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<Buffer> {
  try {
    debugLog('[Metadata] Embedding metadata into PNG image using png-chunks-* libraries');

    // 1. Extract PNG chunks
    const chunks = extract(imageBuffer);

    // 2. Create tEXt chunk with metadata JSON
    const metadataJson = JSON.stringify(metadata);
    const textChunk = text.encode('openai_gpt_image_metadata', metadataJson);

    // 3. Find IEND chunk index (must be last chunk in PNG)
    const iendIndex = chunks.findIndex(chunk => chunk.name === 'IEND');

    if (iendIndex === -1) {
      throw new Error('IEND chunk not found');
    }

    // 4. Insert metadata chunk before IEND
    chunks.splice(iendIndex, 0, textChunk);

    // 5. Re-encode PNG
    const result = Buffer.from(encode(chunks));

    debugLog('[Metadata] PNG metadata embedded successfully');
    return result;
  } catch (error: any) {
    debugLog('[Metadata] Warning: Failed to embed PNG metadata:', error.message);
    // Return original buffer if metadata embedding fails (best effort)
    return imageBuffer;
  }
}

/**
 * Embed metadata into JPEG/WebP image
 * Uses Sharp library with .withMetadata()
 */
export async function embedMetadataJPEG(
  imageBuffer: Buffer,
  metadata: ImageMetadata,
  format: 'jpeg' | 'webp' = 'jpeg'
): Promise<Buffer> {
  try {
    debugLog(`[Metadata] Embedding metadata into ${format.toUpperCase()} image using Sharp`);

    const metadataJson = JSON.stringify(metadata);
    const image = sharp(imageBuffer);

    let result: Buffer;

    if (format === 'jpeg') {
      result = await image
        .jpeg({ quality: 95 })
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: metadataJson
            }
          }
        })
        .toBuffer();
    } else {
      result = await image
        .webp({ quality: 95 })
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: metadataJson
            }
          }
        })
        .toBuffer();
    }

    debugLog(`[Metadata] ${format.toUpperCase()} metadata embedded successfully`);
    return result;
  } catch (error: any) {
    debugLog(`[Metadata] Warning: Failed to embed ${format.toUpperCase()} metadata:`, error.message);
    // Return original buffer if metadata embedding fails (best effort)
    return imageBuffer;
  }
}

/**
 * Extract metadata from PNG image
 * Uses png-chunks-extract and png-chunk-text libraries
 */
async function extractMetadataPNG(imageBuffer: Buffer): Promise<ImageMetadata | null> {
  try {
    debugLog('[Metadata] Extracting metadata from PNG using png-chunks-* libraries');

    // Extract PNG chunks
    const chunks = extract(imageBuffer);

    // Find our metadata tEXt chunk
    for (const chunk of chunks) {
      if (chunk.name === 'tEXt') {
        const decoded = text.decode(chunk.data);

        if (decoded.keyword === 'openai_gpt_image_metadata') {
          const metadata = JSON.parse(decoded.text) as ImageMetadata;
          debugLog('[Metadata] PNG metadata extracted successfully');
          return metadata;
        }
      }
    }

    debugLog('[Metadata] No metadata found in PNG');
    return null;
  } catch (error: any) {
    debugLog('[Metadata] Error extracting PNG metadata:', error.message);
    return null;
  }
}

/**
 * Extract metadata from JPEG/WebP image
 * Uses Sharp library to read EXIF
 */
async function extractMetadataJPEG(imageBuffer: Buffer): Promise<ImageMetadata | null> {
  try {
    debugLog('[Metadata] Extracting metadata from JPEG/WebP using Sharp');

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (metadata.exif) {
      const exifBuffer = metadata.exif;
      // Read EXIF as string (limit to 10KB to avoid performance issues)
      const exifString = exifBuffer.toString('utf8', 0, Math.min(exifBuffer.length, 10000));

      // Look for JSON containing our UUID field
      const jsonMatch = exifString.match(/\{[^{}]*openai_gpt_image_uuid[^{}]*\}/);

      if (jsonMatch) {
        const extractedMetadata = JSON.parse(jsonMatch[0]) as ImageMetadata;
        debugLog('[Metadata] JPEG/WebP metadata extracted successfully');
        return extractedMetadata;
      }
    }

    debugLog('[Metadata] No metadata found in JPEG/WebP');
    return null;
  } catch (error: any) {
    debugLog('[Metadata] Error extracting JPEG/WebP metadata:', error.message);
    return null;
  }
}

/**
 * Extract metadata from image file (unified function)
 */
export async function extractMetadataFromImage(imagePath: string): Promise<ImageMetadata | null> {
  try {
    const imageBuffer = await fs.readFile(imagePath);

    // Use Sharp to detect format
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const format = metadata.format;

    if (format === 'png') {
      return await extractMetadataPNG(imageBuffer);
    } else if (format === 'jpeg' || format === 'webp') {
      return await extractMetadataJPEG(imageBuffer);
    } else {
      debugLog(`[Metadata] Unsupported image format for metadata extraction: ${format}`);
      return null;
    }
  } catch (error: any) {
    debugLog('[Metadata] Error reading image file:', error.message);
    return null;
  }
}

/**
 * Verify integrity by comparing parameter hashes
 */
export function verifyIntegrity(
  imageMetadata: ImageMetadata,
  dbParams: Record<string, any>
): { valid: boolean; message: string } {
  try {
    // Calculate hash from database parameters
    const dbHash = calculateParamsHash(dbParams);
    const imageHash = imageMetadata.params_hash;

    if (dbHash === imageHash) {
      return {
        valid: true,
        message: 'Image integrity verified: parameter hashes match',
      };
    } else {
      return {
        valid: false,
        message: `Image integrity check failed: hash mismatch (DB: ${dbHash.substring(0, 16)}..., Image: ${imageHash.substring(0, 16)}...)`,
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      message: `Integrity verification error: ${error.message}`,
    };
  }
}

/**
 * Save image with embedded metadata
 */
export async function saveImageWithMetadata(
  base64Image: string,
  outputPath: string,
  metadata: ImageMetadata
): Promise<void> {
  debugLog(`[Metadata] Saving image with metadata to: ${outputPath}`);

  // Check if metadata embedding is enabled
  if (!isMetadataEmbeddingEnabled()) {
    debugLog('[Metadata] Metadata embedding is disabled, saving without metadata');
    const imageBuffer = Buffer.from(base64Image, 'base64');
    await fs.writeFile(outputPath, imageBuffer);
    debugLog(`[Metadata] Image saved successfully: ${outputPath}`);
    return;
  }

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(base64Image, 'base64');

  // Determine format from output path
  const ext = outputPath.toLowerCase().split('.').pop();

  let finalBuffer: Buffer;

  if (ext === 'png') {
    finalBuffer = await embedMetadataPNG(imageBuffer, metadata);
  } else if (ext === 'jpg' || ext === 'jpeg') {
    finalBuffer = await embedMetadataJPEG(imageBuffer, metadata, 'jpeg');
  } else if (ext === 'webp') {
    finalBuffer = await embedMetadataJPEG(imageBuffer, metadata, 'webp');
  } else {
    // For other formats, save without metadata
    debugLog(`[Metadata] Format ${ext} does not support metadata embedding, saving without metadata`);
    finalBuffer = imageBuffer;
  }

  // Write to file
  await fs.writeFile(outputPath, finalBuffer);

  debugLog(`[Metadata] Image saved successfully: ${outputPath}`);
}
