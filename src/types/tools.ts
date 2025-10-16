/**
 * Type definitions for MCP tool parameters
 */

/**
 * Common image generation parameters
 */
export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ModerationLevel = 'auto' | 'low';

/**
 * Parameters for generate_image tool
 */
export interface GenerateImageParams {
  prompt: string;
  output_path?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  transparent_background?: boolean;
  moderation?: ModerationLevel;
  sample_count?: number;
  return_base64?: boolean;
  include_thumbnail?: boolean;
}

/**
 * Parameters for edit_image tool
 */
export interface EditImageParams {
  prompt: string;
  reference_image_base64?: string;
  reference_image_path?: string;
  mask_image_base64?: string;
  mask_image_path?: string;
  output_path?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  moderation?: ModerationLevel;
  sample_count?: number;
  return_base64?: boolean;
  include_thumbnail?: boolean;
}

/**
 * Parameters for transform_image tool
 */
export interface TransformImageParams {
  prompt: string;
  reference_image_base64?: string;
  reference_image_path?: string;
  output_path?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  moderation?: ModerationLevel;
  sample_count?: number;
  return_base64?: boolean;
  include_thumbnail?: boolean;
}

/**
 * Parameters for list_generated_images tool
 */
export interface ListImagesParams {
  directory?: string;
}
