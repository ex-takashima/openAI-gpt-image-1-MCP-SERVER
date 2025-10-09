/**
 * MIME type utilities for image files
 */

import * as path from 'path';

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      // Default to PNG if unknown
      return 'image/png';
  }
}

/**
 * Get file extension for MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    default:
      return '.png';
  }
}
