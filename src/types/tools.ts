/**
 * Type definitions for MCP tool parameters
 */

/**
 * Common image generation parameters
 */
export type ImageSizePreset =
  | '1024x1024'
  | '1024x1536'
  | '1536x1024'
  | '2048x2048'
  | '2048x1152'
  | '1152x2048'
  | '3840x2160'
  | '2160x3840'
  | 'auto';

// Preserve preset autocomplete while allowing arbitrary WxH strings (for gpt-image-2 custom sizes).
export type ImageSize = ImageSizePreset | (string & {});
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ModerationLevel = 'auto' | 'low';

/**
 * Supported image generation models
 * - gpt-image-1: Original model
 * - gpt-image-1.5: 4x faster, 20% cheaper, improved text rendering, supports input_fidelity
 * - gpt-image-2: Latest, flexible sizes up to 4K (experimental), no transparent bg / input_fidelity
 */
export type ImageModel = 'gpt-image-1' | 'gpt-image-1.5' | 'gpt-image-2';

/**
 * Input fidelity level for image editing (gpt-image-1.5 only)
 * - low: Default, standard fidelity
 * - high: High fidelity for faces, logos, and fine details (uses more tokens)
 */
export type InputFidelity = 'low' | 'high';

/**
 * Parameters for generate_image tool
 * Note: Reference images are NOT supported in the Images API (gpt-image-1/1.5).
 * Use edit_image or transform_image for reference-based generation,
 * or use the Responses API with gpt-4.1+ for reference image support.
 */
export interface GenerateImageParams {
  prompt: string;
  output_path?: string;
  model?: ImageModel;
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
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  moderation?: ModerationLevel;
  sample_count?: number;
  return_base64?: boolean;
  include_thumbnail?: boolean;
  /** Input fidelity for preserving faces/logos (gpt-image-1.5 only) */
  input_fidelity?: InputFidelity;
}

/**
 * Parameters for transform_image tool
 */
export interface TransformImageParams {
  prompt: string;
  reference_image_base64?: string;
  reference_image_path?: string;
  output_path?: string;
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  moderation?: ModerationLevel;
  sample_count?: number;
  return_base64?: boolean;
  include_thumbnail?: boolean;
  /** Input fidelity for preserving faces/logos (gpt-image-1.5 only) */
  input_fidelity?: InputFidelity;
}

/**
 * Parameters for list_generated_images tool
 */
export interface ListImagesParams {
  directory?: string;
}
