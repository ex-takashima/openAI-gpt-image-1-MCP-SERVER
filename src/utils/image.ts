/**
 * Image processing utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { debugLog } from './cost.js';
import { MODEL_CAPABILITIES } from '../types/models.js';
import type { ImageModel, ImageSizePreset } from '../types/tools.js';

/**
 * Read image file and convert to base64
 */
export async function imageFileToBase64(filePath: string): Promise<string> {
  debugLog(`Reading image file: ${filePath}`);
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

/**
 * Save base64 image to file
 */
export async function saveBase64Image(
  base64Data: string,
  outputPath: string
): Promise<void> {
  debugLog(`Saving image to: ${outputPath}`);

  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(outputPath, buffer);
  debugLog(`Image saved successfully: ${outputPath}`);
}

/**
 * List image files in a directory
 */
export async function listImageFiles(directory: string): Promise<string[]> {
  debugLog(`Listing image files in: ${directory}`);

  try {
    const files = await fs.readdir(directory);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // Get file stats for sorting by modification time
    const filesWithStats = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime };
      })
    );

    // Sort by modification time (newest first)
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return filesWithStats.map((item) => item.file);
  } catch (error) {
    debugLog(`Error listing image files:`, error);
    throw new Error(`Failed to list images in directory: ${directory}`);
  }
}

/**
 * Validate image format
 */
export function validateImageFormat(format: string): boolean {
  const validFormats = ['png', 'jpeg', 'webp'];
  return validFormats.includes(format.toLowerCase());
}

/**
 * Validate image size against the active model's capabilities.
 *
 * gpt-image-1 / 1.5: only the 3 hardcoded presets are valid.
 * gpt-image-2: presets + any custom WxH that satisfies edgeStep / maxEdge / ratio / pixel bounds.
 */
export function validateImageSize(size: string, model: ImageModel = 'gpt-image-1'): boolean {
  if (size === 'auto') return true;

  const caps = MODEL_CAPABILITIES[model];
  if (caps.supportedSizePresets.includes(size as ImageSizePreset)) return true;

  if (!caps.sizeConstraints) return false;

  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return false;

  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  const c = caps.sizeConstraints;

  if (w % c.edgeStep !== 0 || h % c.edgeStep !== 0) return false;
  if (w > c.maxEdge || h > c.maxEdge) return false;
  if (Math.max(w, h) / Math.min(w, h) > c.ratioMax) return false;

  const px = w * h;
  if (px < c.pxMin || px > c.pxMax) return false;

  return true;
}

/**
 * Check whether a size is flagged as experimental for the given model.
 */
export function isExperimentalSize(size: string, model: ImageModel): boolean {
  const caps = MODEL_CAPABILITIES[model];
  return caps.experimentalSizes?.includes(size) ?? false;
}

/**
 * Validate quality level
 */
export function validateQuality(quality: string): boolean {
  const validQualities = ['low', 'medium', 'high', 'auto'];
  return validQualities.includes(quality.toLowerCase());
}
