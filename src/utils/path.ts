/**
 * Cross-platform path utilities for image file handling
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { debugLog } from './cost.js';

/**
 * Get default output directory (cross-platform)
 *
 * Priority:
 * 1. OPENAI_IMAGE_OUTPUT_DIR environment variable
 * 2. ~/Downloads/openai-images (default)
 *
 * Works on macOS, Windows, and Linux
 */
export function getDefaultOutputDirectory(): string {
  // Check environment variable first
  const envDir = process.env.OPENAI_IMAGE_OUTPUT_DIR;
  if (envDir) {
    debugLog(`Using custom output directory from env: ${envDir}`);
    return path.resolve(envDir);
  }

  // Use os.homedir() for cross-platform home directory
  const homeDir = os.homedir();
  const defaultDir = path.join(homeDir, 'Downloads', 'openai-images');

  debugLog(`Using default output directory: ${defaultDir}`);
  return defaultDir;
}

/**
 * Normalize and validate output path (cross-platform)
 *
 * - Absolute paths: used as-is
 * - Relative paths: resolved relative to default output directory
 * - Creates parent directory if it doesn't exist
 *
 * @param outputPath - Output file path (absolute or relative)
 * @returns Normalized absolute path
 */
export async function normalizeAndValidatePath(outputPath: string): Promise<string> {
  debugLog(`Normalizing output path: ${outputPath}`);

  let absolutePath: string;

  // If already absolute, use as-is
  if (path.isAbsolute(outputPath)) {
    absolutePath = outputPath;
    debugLog(`Path is absolute: ${absolutePath}`);
  } else {
    // Relative path: resolve from default output directory
    const defaultDir = getDefaultOutputDirectory();
    absolutePath = path.join(defaultDir, outputPath);
    debugLog(`Resolved relative path to: ${absolutePath}`);
  }

  // Ensure parent directory exists (create if needed)
  const dir = path.dirname(absolutePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    debugLog(`Ensured directory exists: ${dir}`);
  } catch (error) {
    debugLog(`Error creating directory: ${dir}`, error);
    throw new Error(`Failed to create output directory: ${dir}`);
  }

  return absolutePath;
}

/**
 * Get user-friendly display path
 * Converts absolute path to ~ notation for better readability
 */
export function getDisplayPath(absolutePath: string): string {
  const homeDir = os.homedir();
  if (absolutePath.startsWith(homeDir)) {
    return absolutePath.replace(homeDir, '~');
  }
  return absolutePath;
}
