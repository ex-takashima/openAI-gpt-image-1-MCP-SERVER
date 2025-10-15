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
 * Get default input directory (cross-platform)
 *
 * Priority:
 * 1. OPENAI_IMAGE_INPUT_DIR environment variable
 * 2. OPENAI_IMAGE_OUTPUT_DIR environment variable (same as output)
 * 3. ~/Downloads/openai-images (default)
 *
 * Works on macOS, Windows, and Linux
 */
export function getDefaultInputDirectory(): string {
  // Check input-specific environment variable first
  const envInputDir = process.env.OPENAI_IMAGE_INPUT_DIR;
  if (envInputDir) {
    debugLog(`Using custom input directory from env: ${envInputDir}`);
    return path.resolve(envInputDir);
  }

  // Fall back to output directory (same location)
  const outputDir = getDefaultOutputDirectory();
  debugLog(`Using output directory as input directory: ${outputDir}`);
  return outputDir;
}

/**
 * Normalize and validate output path (cross-platform)
 *
 * - Absolute paths: resolved and validated against base directory
 * - Relative paths: resolved relative to default output directory
 * - All paths must be within the base directory (security: prevents path traversal)
 * - Creates parent directory if it doesn't exist
 *
 * @param outputPath - Output file path (absolute or relative)
 * @returns Normalized absolute path
 * @throws Error if path traversal is detected
 */
export async function normalizeAndValidatePath(outputPath: string): Promise<string> {
  debugLog(`Normalizing output path: ${outputPath}`);

  const defaultDir = getDefaultOutputDirectory();
  let absolutePath: string;

  // Resolve path (both absolute and relative)
  if (path.isAbsolute(outputPath)) {
    absolutePath = outputPath;
    debugLog(`Path is absolute: ${absolutePath}`);
  } else {
    // Relative path: resolve from default output directory
    absolutePath = path.join(defaultDir, outputPath);
    debugLog(`Resolved relative path to: ${absolutePath}`);
  }

  // Security check: Ensure path is within base directory (prevent path traversal)
  const normalizedPath = path.resolve(absolutePath);
  const normalizedBase = path.resolve(defaultDir);

  if (!normalizedPath.startsWith(normalizedBase + path.sep) && normalizedPath !== normalizedBase) {
    const errorMsg =
      `Security error: Access denied. All paths must be within the configured output directory.\n` +
      `Base directory: ${normalizedBase}\n` +
      `Attempted path: ${normalizedPath}\n` +
      `Use OPENAI_IMAGE_OUTPUT_DIR environment variable to change the base directory.`;
    debugLog(errorMsg);
    throw new Error(errorMsg);
  }

  debugLog(`Path validated successfully: ${normalizedPath}`);

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
 * Normalize and validate input image path (cross-platform)
 *
 * - Absolute paths: resolved and validated against base directory
 * - Relative paths: resolved relative to default input directory
 * - All paths must be within the base directory (security: prevents path traversal)
 * - Validates file exists
 *
 * @param inputPath - Input file path (absolute or relative)
 * @returns Normalized absolute path
 * @throws Error if path traversal is detected or file doesn't exist
 */
export async function normalizeInputPath(inputPath: string): Promise<string> {
  debugLog(`Normalizing input path: ${inputPath}`);

  const defaultDir = getDefaultInputDirectory();
  let absolutePath: string;

  // Resolve path (both absolute and relative)
  if (path.isAbsolute(inputPath)) {
    absolutePath = inputPath;
    debugLog(`Path is absolute: ${absolutePath}`);
  } else {
    // Relative path: resolve from default input directory
    absolutePath = path.join(defaultDir, inputPath);
    debugLog(`Resolved relative path to: ${absolutePath}`);
  }

  // Security check: Ensure path is within base directory (prevent path traversal)
  const normalizedPath = path.resolve(absolutePath);
  const normalizedBase = path.resolve(defaultDir);

  if (!normalizedPath.startsWith(normalizedBase + path.sep) && normalizedPath !== normalizedBase) {
    const errorMsg =
      `Security error: Access denied. All paths must be within the configured input directory.\n` +
      `Base directory: ${normalizedBase}\n` +
      `Attempted path: ${normalizedPath}\n` +
      `Use OPENAI_IMAGE_INPUT_DIR environment variable to change the base directory.`;
    debugLog(errorMsg);
    throw new Error(errorMsg);
  }

  debugLog(`Path validated successfully: ${normalizedPath}`);

  // Validate file exists
  try {
    await fs.access(absolutePath);
    debugLog(`File exists: ${absolutePath}`);
  } catch (error) {
    const errorMsg =
      `Input file not found: ${absolutePath}\n` +
      `Make sure the file exists in: ${normalizedBase}`;
    debugLog(errorMsg);
    throw new Error(errorMsg);
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
