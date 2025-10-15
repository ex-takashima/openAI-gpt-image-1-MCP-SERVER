/**
 * Image metadata embedding utilities
 * Embeds generation metadata into PNG and JPEG images
 */

import * as fs from 'fs/promises';
import { debugLog } from './cost.js';

/**
 * Metadata to embed in images
 */
export interface ImageMetadata {
  tool: string;
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  format?: string;
  created_at: string;
  history_uuid?: string;
}

/**
 * Embed metadata into PNG image
 * Uses PNG tEXt chunks to store metadata
 */
export async function embedMetadataPNG(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<Buffer> {
  try {
    debugLog('Embedding metadata into PNG image');

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

    // Create metadata text chunks
    const textChunks: Buffer[] = [];

    // Add metadata as tEXt chunks
    const metadataEntries = [
      ['MCP-Tool', metadata.tool],
      ['MCP-Prompt', metadata.prompt],
      ['MCP-Model', metadata.model],
      ['MCP-Created', metadata.created_at],
    ];

    if (metadata.size) metadataEntries.push(['MCP-Size', metadata.size]);
    if (metadata.quality) metadataEntries.push(['MCP-Quality', metadata.quality]);
    if (metadata.format) metadataEntries.push(['MCP-Format', metadata.format]);
    if (metadata.history_uuid) metadataEntries.push(['MCP-History-UUID', metadata.history_uuid]);

    for (const [key, value] of metadataEntries) {
      const textChunk = createPNGTextChunk(key, value);
      textChunks.push(textChunk);
    }

    // Combine: original image (up to IEND) + text chunks + IEND chunk
    const beforeIEND = imageBuffer.subarray(0, iendPosition);
    const iendChunk = imageBuffer.subarray(iendPosition);

    const result = Buffer.concat([beforeIEND, ...textChunks, iendChunk]);

    debugLog('PNG metadata embedded successfully');
    return result;
  } catch (error: any) {
    debugLog('Warning: Failed to embed PNG metadata:', error.message);
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
 * Uses EXIF UserComment field to store metadata as JSON
 */
export async function embedMetadataJPEG(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<Buffer> {
  try {
    debugLog('Embedding metadata into JPEG image');

    // JPEG markers
    const SOI = 0xffd8; // Start of Image
    const APP1 = 0xffe1; // EXIF marker

    // Verify JPEG signature
    if (imageBuffer.readUInt16BE(0) !== SOI) {
      throw new Error('Invalid JPEG signature');
    }

    // Create metadata JSON string
    const metadataJson = JSON.stringify({
      tool: metadata.tool,
      prompt: metadata.prompt,
      model: metadata.model,
      size: metadata.size,
      quality: metadata.quality,
      format: metadata.format,
      created_at: metadata.created_at,
      history_uuid: metadata.history_uuid,
    });

    // Create APP1 (EXIF) segment with UserComment
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

    debugLog('JPEG metadata embedded successfully');
    return result;
  } catch (error: any) {
    debugLog('Warning: Failed to embed JPEG metadata:', error.message);
    // Return original buffer if metadata embedding fails
    return imageBuffer;
  }
}

/**
 * Create JPEG APP1 (EXIF) segment with UserComment
 */
function createJPEGEXIFSegment(metadataText: string): Buffer {
  // Simplified EXIF structure with UserComment
  // APP1 marker (FFE1) + Length (2) + "Exif\0\0" (6) + TIFF header + IFD + UserComment

  const exifIdentifier = Buffer.from('Exif\0\0', 'ascii');

  // TIFF header (little-endian)
  const tiffHeader = Buffer.from([
    0x49, 0x49, // Byte order (II = little-endian)
    0x2a, 0x00, // TIFF magic number (42)
    0x08, 0x00, 0x00, 0x00, // Offset to first IFD
  ]);

  // Create IFD with UserComment tag (0x9286)
  const userCommentTag = 0x9286;
  const userCommentType = 2; // ASCII
  const userCommentData = Buffer.from(metadataText, 'utf8');

  // IFD entry: Tag (2) + Type (2) + Count (4) + Value/Offset (4)
  const ifd = Buffer.alloc(2 + 12 + 4); // Entry count (2) + 1 entry (12) + Next IFD offset (4)

  ifd.writeUInt16LE(1, 0); // Number of entries

  // UserComment entry
  ifd.writeUInt16LE(userCommentTag, 2); // Tag
  ifd.writeUInt16LE(userCommentType, 4); // Type (ASCII)
  ifd.writeUInt32LE(userCommentData.length, 6); // Count
  ifd.writeUInt32LE(8 + ifd.length, 10); // Offset to data

  ifd.writeUInt32LE(0, 14); // Next IFD offset (none)

  // Combine TIFF structure
  const tiffData = Buffer.concat([tiffHeader, ifd, userCommentData]);

  // Create APP1 segment
  const segmentData = Buffer.concat([exifIdentifier, tiffData]);
  const segmentLength = Buffer.alloc(2);
  segmentLength.writeUInt16BE(segmentData.length + 2, 0); // +2 for length field itself

  const app1Marker = Buffer.from([0xff, 0xe1]);

  return Buffer.concat([app1Marker, segmentLength, segmentData]);
}

/**
 * Save image with embedded metadata
 */
export async function saveImageWithMetadata(
  base64Image: string,
  outputPath: string,
  metadata: ImageMetadata
): Promise<void> {
  debugLog(`Saving image with metadata to: ${outputPath}`);

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
    debugLog(`Format ${ext} does not support metadata embedding, saving without metadata`);
    finalBuffer = imageBuffer;
  }

  // Write to file
  await fs.writeFile(outputPath, finalBuffer);

  debugLog(`Image saved successfully: ${outputPath}`);
}
