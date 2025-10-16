/**
 * Image metadata embedding utilities - Spec Compliant Version
 * Embeds generation metadata into PNG and JPEG images
 * Compliant with Vertex AI Imagen metadata embedding specification
 */

import { randomUUID, createHash } from 'crypto';
import * as fs from 'fs/promises';
import { debugLog } from './cost.js';

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
 * Uses a single tEXt chunk with JSON
 */
export async function embedMetadataPNG(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<Buffer> {
  try {
    debugLog('[Metadata] Embedding metadata into PNG image');

    // PNG signature
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Verify PNG signature
    if (!imageBuffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error('Invalid PNG signature');
    }

    // Find IEND chunk position (last chunk)
    let iendPosition = -1;
    let position = 8; // Skip PNG signature

    while (position < imageBuffer.length - 12) {
      const chunkLength = imageBuffer.readUInt32BE(position);
      const chunkType = imageBuffer.toString('ascii', position + 4, position + 8);

      if (chunkType === 'IEND') {
        iendPosition = position;
        break;
      }

      // Move to next chunk (length + type + data + crc = 4 + 4 + length + 4)
      position += 12 + chunkLength;
    }

    if (iendPosition === -1) {
      throw new Error('IEND chunk not found');
    }

    // Create single tEXt chunk with JSON metadata
    const metadataJson = JSON.stringify(metadata);
    const textChunk = createPNGTextChunk('openai_gpt_image_metadata', metadataJson);

    // Combine: original image (up to IEND) + metadata chunk + IEND chunk
    const beforeIEND = imageBuffer.subarray(0, iendPosition);
    const iendChunk = imageBuffer.subarray(iendPosition);

    const result = Buffer.concat([beforeIEND, textChunk, iendChunk]);

    debugLog('[Metadata] PNG metadata embedded successfully');
    return result;
  } catch (error: any) {
    debugLog('[Metadata] Warning: Failed to embed PNG metadata:', error.message);
    // Return original buffer if metadata embedding fails
    return imageBuffer;
  }
}

/**
 * Create a PNG tEXt chunk
 */
function createPNGTextChunk(keyword: string, text: string): Buffer {
  // tEXt chunk format: Length (4) + Type (4) + Keyword (n) + Null (1) + Text (n) + CRC (4)
  const keywordBuffer = Buffer.from(keyword, 'latin1');
  const textBuffer = Buffer.from(text, 'latin1');
  const nullSeparator = Buffer.from([0x00]);

  const chunkType = Buffer.from('tEXt', 'ascii');
  const chunkData = Buffer.concat([keywordBuffer, nullSeparator, textBuffer]);
  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32BE(chunkData.length, 0);

  // Calculate CRC32 for type + data
  const crc = calculateCRC32(Buffer.concat([chunkType, chunkData]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([chunkLength, chunkType, chunkData, crcBuffer]);
}

/**
 * Calculate CRC32 checksum (PNG standard)
 */
function calculateCRC32(buffer: Buffer): number {
  // CRC32 lookup table
  const crcTable = makeCRCTable();

  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const lookupIndex = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ crcTable[lookupIndex];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Generate CRC32 lookup table
 */
function makeCRCTable(): number[] {
  const table: number[] = [];

  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  return table;
}

/**
 * Embed metadata into JPEG image
 * Uses EXIF ImageDescription field with JSON
 */
export async function embedMetadataJPEG(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<Buffer> {
  try {
    debugLog('[Metadata] Embedding metadata into JPEG image');

    // JPEG markers
    const SOI = 0xffd8; // Start of Image
    const APP1 = 0xffe1; // EXIF marker

    // Verify JPEG signature
    if (imageBuffer.readUInt16BE(0) !== SOI) {
      throw new Error('Invalid JPEG signature');
    }

    // Create metadata JSON string
    const metadataJson = JSON.stringify(metadata);

    // Create APP1 (EXIF) segment with metadata
    const exifSegment = createJPEGEXIFSegment(metadataJson);

    // Find position to insert APP1 (after SOI marker)
    let insertPosition = 2; // After SOI

    // If there's already an APP1, find the end of existing markers
    while (insertPosition < imageBuffer.length - 2) {
      const marker = imageBuffer.readUInt16BE(insertPosition);

      // Stop at first non-APPn marker (SOS, SOF, etc.)
      if ((marker & 0xfff0) !== 0xffe0 && marker !== 0xfffe) {
        break;
      }

      // Skip this segment
      const segmentLength = imageBuffer.readUInt16BE(insertPosition + 2);
      insertPosition += 2 + segmentLength;
    }

    // Insert EXIF segment
    const beforeEXIF = imageBuffer.subarray(0, insertPosition);
    const afterEXIF = imageBuffer.subarray(insertPosition);

    const result = Buffer.concat([beforeEXIF, exifSegment, afterEXIF]);

    debugLog('[Metadata] JPEG metadata embedded successfully');
    return result;
  } catch (error: any) {
    debugLog('[Metadata] Warning: Failed to embed JPEG metadata:', error.message);
    // Return original buffer if metadata embedding fails
    return imageBuffer;
  }
}

/**
 * Create JPEG APP1 (EXIF) segment with metadata
 */
function createJPEGEXIFSegment(metadataText: string): Buffer {
  // Simplified EXIF structure with ImageDescription
  // APP1 marker (FFE1) + Length (2) + "Exif\0\0" (6) + TIFF header + IFD + ImageDescription

  const exifIdentifier = Buffer.from('Exif\0\0', 'ascii');

  // TIFF header (little-endian)
  const tiffHeader = Buffer.from([
    0x49, 0x49, // Byte order (II = little-endian)
    0x2a, 0x00, // TIFF magic number (42)
    0x08, 0x00, 0x00, 0x00, // Offset to first IFD
  ]);

  // Create IFD with ImageDescription tag (0x010E)
  const imageDescTag = 0x010e;
  const imageDescType = 2; // ASCII
  const imageDescData = Buffer.from(metadataText, 'utf8');

  // IFD entry: Tag (2) + Type (2) + Count (4) + Value/Offset (4)
  const ifd = Buffer.alloc(2 + 12 + 4); // Entry count (2) + 1 entry (12) + Next IFD offset (4)

  ifd.writeUInt16LE(1, 0); // Number of entries

  // ImageDescription entry
  ifd.writeUInt16LE(imageDescTag, 2); // Tag
  ifd.writeUInt16LE(imageDescType, 4); // Type (ASCII)
  ifd.writeUInt32LE(imageDescData.length, 6); // Count
  ifd.writeUInt32LE(8 + ifd.length, 10); // Offset to data

  ifd.writeUInt32LE(0, 14); // Next IFD offset (none)

  // Combine TIFF structure
  const tiffData = Buffer.concat([tiffHeader, ifd, imageDescData]);

  // Create APP1 segment
  const segmentData = Buffer.concat([exifIdentifier, tiffData]);
  const segmentLength = Buffer.alloc(2);
  segmentLength.writeUInt16BE(segmentData.length + 2, 0); // +2 for length field itself

  const app1Marker = Buffer.from([0xff, 0xe1]);

  return Buffer.concat([app1Marker, segmentLength, segmentData]);
}

/**
 * Embed metadata into image buffer (unified function)
 */
export async function embedMetadata(
  imageBuffer: Buffer,
  metadata: ImageMetadata,
  format: string
): Promise<Buffer> {
  const normalizedFormat = format.toLowerCase();

  if (normalizedFormat === 'png') {
    return await embedMetadataPNG(imageBuffer, metadata);
  } else if (normalizedFormat === 'jpg' || normalizedFormat === 'jpeg') {
    return await embedMetadataJPEG(imageBuffer, metadata);
  } else {
    // For other formats (webp, etc.), metadata embedding not supported
    debugLog(`[Metadata] Format ${format} does not support metadata embedding`);
    return imageBuffer;
  }
}

/**
 * Extract metadata from PNG image
 */
async function extractMetadataPNG(imageBuffer: Buffer): Promise<ImageMetadata | null> {
  try {
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Verify PNG signature
    if (!imageBuffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return null;
    }

    let position = 8; // Skip PNG signature

    // Look for our metadata tEXt chunk
    while (position < imageBuffer.length - 12) {
      const chunkLength = imageBuffer.readUInt32BE(position);
      const chunkType = imageBuffer.toString('ascii', position + 4, position + 8);

      if (chunkType === 'IEND') {
        break;
      }

      if (chunkType === 'tEXt') {
        // Read chunk data
        const chunkData = imageBuffer.subarray(position + 8, position + 8 + chunkLength);

        // Find null separator between keyword and text
        let nullIndex = -1;
        for (let i = 0; i < chunkData.length; i++) {
          if (chunkData[i] === 0x00) {
            nullIndex = i;
            break;
          }
        }

        if (nullIndex !== -1) {
          const keyword = chunkData.toString('latin1', 0, nullIndex);
          const text = chunkData.toString('latin1', nullIndex + 1);

          if (keyword === 'openai_gpt_image_metadata') {
            const metadata = JSON.parse(text) as ImageMetadata;
            return metadata;
          }
        }
      }

      // Move to next chunk
      position += 12 + chunkLength;
    }

    return null;
  } catch (error: any) {
    debugLog('[Metadata] Error extracting PNG metadata:', error.message);
    return null;
  }
}

/**
 * Extract metadata from JPEG image
 */
async function extractMetadataJPEG(imageBuffer: Buffer): Promise<ImageMetadata | null> {
  try {
    const SOI = 0xffd8;

    // Verify JPEG signature
    if (imageBuffer.readUInt16BE(0) !== SOI) {
      return null;
    }

    let position = 2; // After SOI

    // Look for APP1 (EXIF) segments
    while (position < imageBuffer.length - 2) {
      const marker = imageBuffer.readUInt16BE(position);

      if (marker === 0xffe1) {
        // APP1 marker found
        const segmentLength = imageBuffer.readUInt16BE(position + 2);
        const segmentData = imageBuffer.subarray(position + 4, position + 2 + segmentLength);

        // Check for Exif identifier
        const exifIdentifier = segmentData.toString('ascii', 0, 6);
        if (exifIdentifier === 'Exif\0\0') {
          // Read TIFF data
          const tiffData = segmentData.subarray(6);

          // Try to find JSON metadata in ImageDescription or UserComment
          const dataString = tiffData.toString('utf8');

          // Look for JSON containing our UUID field
          const jsonMatch = dataString.match(/\{[^{}]*openai_gpt_image_uuid[^{}]*\}/);
          if (jsonMatch) {
            const metadata = JSON.parse(jsonMatch[0]) as ImageMetadata;
            return metadata;
          }
        }
      }

      // Stop at first SOS marker (start of scan)
      if (marker === 0xffda) {
        break;
      }

      // Move to next marker
      if ((marker & 0xff00) === 0xff00) {
        const segmentLength = imageBuffer.readUInt16BE(position + 2);
        position += 2 + segmentLength;
      } else {
        break;
      }
    }

    return null;
  } catch (error: any) {
    debugLog('[Metadata] Error extracting JPEG metadata:', error.message);
    return null;
  }
}

/**
 * Extract metadata from image file (unified function)
 */
export async function extractMetadataFromImage(imagePath: string): Promise<ImageMetadata | null> {
  try {
    const imageBuffer = await fs.readFile(imagePath);

    // Determine format from file signature
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8]);

    if (imageBuffer.subarray(0, 4).equals(PNG_SIGNATURE)) {
      return await extractMetadataPNG(imageBuffer);
    } else if (imageBuffer.subarray(0, 2).equals(JPEG_SIGNATURE)) {
      return await extractMetadataJPEG(imageBuffer);
    } else {
      debugLog('[Metadata] Unsupported image format for metadata extraction');
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
    finalBuffer = await embedMetadataJPEG(imageBuffer, metadata);
  } else {
    // For other formats (webp, etc.), save without metadata
    debugLog(`[Metadata] Format ${ext} does not support metadata embedding, saving without metadata`);
    finalBuffer = imageBuffer;
  }

  // Write to file
  await fs.writeFile(outputPath, finalBuffer);

  debugLog(`[Metadata] Image saved successfully: ${outputPath}`);
}
