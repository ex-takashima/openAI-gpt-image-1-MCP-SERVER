/**
 * List images tool - List generated images in a directory
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { listImageFiles } from '../utils/image.js';
import { debugLog } from '../utils/cost.js';

export interface ListImagesParams {
  directory?: string;
}

export async function listImages(params: ListImagesParams): Promise<string> {
  debugLog('List images called with params:', params);

  const { directory = process.cwd() } = params;

  try {
    // Resolve directory path
    const resolvedDir = path.resolve(directory);

    debugLog(`Resolved directory: ${resolvedDir}`);

    // Check if directory exists
    try {
      const stats = await fs.stat(resolvedDir);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${resolvedDir}`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory does not exist: ${resolvedDir}`);
      }
      throw error;
    }

    const imageFiles = await listImageFiles(resolvedDir);

    if (imageFiles.length === 0) {
      return `No image files found in: ${resolvedDir}`;
    }

    const lines: string[] = [];
    lines.push(`\n📁 Found ${imageFiles.length} image(s) in: ${resolvedDir}\n`);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const filePath = path.join(resolvedDir, file);

      try {
        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        const modifiedDate = stats.mtime.toISOString().split('T')[0];

        lines.push(`${i + 1}. ${file}`);
        lines.push(`   Size: ${sizeKB} KB | Modified: ${modifiedDate}`);
      } catch (error) {
        lines.push(`${i + 1}. ${file} (unable to read file stats)`);
      }
    }

    return lines.join('\n');
  } catch (error: any) {
    debugLog('Error listing images:', error);
    throw new Error(`Failed to list images: ${error.message}`);
  }
}
