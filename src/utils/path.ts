/**
 * Cross-platform path utilities for image file handling
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { debugLog } from './cost.js';

/**
 * Claude Desktop virtual path patterns
 * These paths are used by Claude Desktop to reference cloud-stored files
 * and do not exist on the local filesystem
 */
const CLAUDE_DESKTOP_VIRTUAL_PATHS = [
  '/mnt/user-data/uploads/',
  '/mnt/transcripts/',
  '/mnt/user-data/',
];

/**
 * Check if a path is a Claude Desktop virtual path
 * Claude Desktop uploads are stored in Anthropic's cloud, not locally
 */
function isClaudeDesktopVirtualPath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  return CLAUDE_DESKTOP_VIRTUAL_PATHS.some(vp => normalizedPath.startsWith(vp.toLowerCase()));
}

/**
 * Check if a path is within a system temp directory
 * This allows Claude Desktop uploaded images to be accessed
 *
 * Recognized temp directories:
 * - os.tmpdir() (cross-platform)
 * - macOS: /private/var/folders/, /var/folders/, /tmp
 * - Windows: AppData\Local\Temp
 * - Linux: /tmp, /var/tmp
 */
function isSystemTempPath(filePath: string): boolean {
  const normalizedPath = path.resolve(filePath).toLowerCase();

  // Get system temp directory
  const systemTemp = os.tmpdir().toLowerCase();
  if (normalizedPath.startsWith(systemTemp)) {
    debugLog(`[Path] Allowed: path is in system temp directory (${systemTemp})`);
    return true;
  }

  // Platform-specific temp directories
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS: /private/var/folders/ (where Claude Desktop stores uploads)
    const macTempPaths = [
      '/private/var/folders/',
      '/var/folders/',
      '/tmp/',
    ];
    for (const tempPath of macTempPaths) {
      if (normalizedPath.startsWith(tempPath)) {
        debugLog(`[Path] Allowed: path is in macOS temp directory (${tempPath})`);
        return true;
      }
    }
  } else if (platform === 'win32') {
    // Windows: various temp locations
    const windowsTempPaths = [
      '\\appdata\\local\\temp',
      '\\temp',
      '\\tmp',
    ];
    for (const tempPath of windowsTempPaths) {
      if (normalizedPath.includes(tempPath)) {
        debugLog(`[Path] Allowed: path is in Windows temp directory (${tempPath})`);
        return true;
      }
    }
  } else {
    // Linux and others
    const linuxTempPaths = [
      '/tmp/',
      '/var/tmp/',
    ];
    for (const tempPath of linuxTempPaths) {
      if (normalizedPath.startsWith(tempPath)) {
        debugLog(`[Path] Allowed: path is in Linux temp directory (${tempPath})`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Expand tilde (~) in path to home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

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
    const expandedDir = expandTilde(envDir);
    debugLog(`Using custom output directory from env: ${expandedDir}`);
    return path.resolve(expandedDir);
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
    const expandedDir = expandTilde(envInputDir);
    debugLog(`Using custom input directory from env: ${expandedDir}`);
    return path.resolve(expandedDir);
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
 * - Claude Desktop virtual paths are resolved automatically
 * - Absolute paths: resolved and validated against base directory
 * - Relative paths: resolved relative to default input directory
 * - System temp directories are automatically allowed (for Claude Desktop uploads)
 * - Other paths must be within the base directory (security: prevents path traversal)
 * - Validates file exists
 *
 * @param inputPath - Input file path (absolute or relative)
 * @returns Normalized absolute path
 * @throws Error if path traversal is detected or file doesn't exist
 */
export async function normalizeInputPath(inputPath: string): Promise<string> {
  debugLog(`Normalizing input path: ${inputPath}`);

  // Check if this is a Claude Desktop virtual path (e.g., /mnt/user-data/uploads/...)
  // Claude Desktop uploads are stored in Anthropic's cloud, not locally
  if (isClaudeDesktopVirtualPath(inputPath)) {
    debugLog(`[Path] Detected Claude Desktop virtual path: ${inputPath}`);
    const errorMsg =
      `Claude Desktop のアップロード画像は Anthropic のクラウドに保存されており、\n` +
      `MCP ツールから直接アクセスすることはできません。\n` +
      `\n` +
      `検出されたパス: ${inputPath}\n` +
      `\n` +
      `【代替案】\n` +
      `1. 画像をローカルに保存してから、そのパスを指定してください\n` +
      `2. OPENAI_IMAGE_INPUT_DIR で指定したディレクトリに画像を配置してください\n` +
      `\n` +
      `例: "この画像を ~/Downloads/openai-images/input.jpg に保存して、\n` +
      `    そのパスで edit_image を実行してください"`;
    debugLog(errorMsg);
    throw new Error(errorMsg);
  }

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

  const normalizedPath = path.resolve(absolutePath);

  // Check if path is in system temp directory (allows Claude Desktop uploads)
  if (isSystemTempPath(normalizedPath)) {
    debugLog(`[Path] System temp path allowed: ${normalizedPath}`);
    // Skip base directory check for temp paths, but still validate file exists
    try {
      await fs.access(normalizedPath);
      debugLog(`File exists: ${normalizedPath}`);
    } catch (error) {
      const errorMsg = `Input file not found: ${normalizedPath}`;
      debugLog(errorMsg);
      throw new Error(errorMsg);
    }
    return normalizedPath;
  }

  // Security check: Ensure path is within base directory (prevent path traversal)
  const normalizedBase = path.resolve(defaultDir);

  if (!normalizedPath.startsWith(normalizedBase + path.sep) && normalizedPath !== normalizedBase) {
    const errorMsg =
      `Security error: Access denied. All paths must be within the configured input directory.\n` +
      `Base directory: ${normalizedBase}\n` +
      `Attempted path: ${normalizedPath}\n` +
      `Use OPENAI_IMAGE_INPUT_DIR environment variable to change the base directory.\n` +
      `Note: System temp directories and Claude Desktop virtual paths are automatically allowed.`;
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

/**
 * Generate unique file path by adding numbers if file exists
 *
 * Examples:
 * - "image.png" exists -> returns "image_1.png"
 * - "image_1.png" exists -> returns "image_2.png"
 * - "image.png" doesn't exist -> returns "image.png"
 *
 * @param filePath - Original file path
 * @returns Unique file path (may have number suffix)
 */
export async function generateUniqueFilePath(filePath: string): Promise<string> {
  try {
    await fs.access(filePath);
    // File exists, need to add number
  } catch {
    // File doesn't exist, can use original path
    debugLog(`File doesn't exist, using original path: ${filePath}`);
    return filePath;
  }

  // File exists, find available number
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  let counter = 1;
  let uniquePath: string;

  while (true) {
    uniquePath = path.join(dir, `${baseName}_${counter}${ext}`);
    try {
      await fs.access(uniquePath);
      // This path also exists, try next number
      counter++;
    } catch {
      // Found available path
      debugLog(`Generated unique path: ${uniquePath}`);
      return uniquePath;
    }

    // Safety limit to prevent infinite loop
    if (counter > 9999) {
      throw new Error(`Failed to generate unique filename after 9999 attempts for: ${filePath}`);
    }
  }
}
