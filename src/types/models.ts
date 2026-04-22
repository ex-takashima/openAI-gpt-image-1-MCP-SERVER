/**
 * Model capability definitions for OpenAI image generation models.
 *
 * Centralizes per-model differences so tool implementations and schema
 * definitions can branch on declarative capabilities instead of model IDs.
 */

import type { ImageModel, ImageSizePreset } from './tools.js';

export interface ModelSizeConstraints {
  edgeStep: number;
  maxEdge: number;
  ratioMax: number;
  pxMin: number;
  pxMax: number;
}

export interface ModelCapabilities {
  supportsInputFidelity: boolean;
  supportsTransparentBg: boolean;
  supportedSizePresets: ImageSizePreset[];
  sizeConstraints?: ModelSizeConstraints;
  maxPromptLength: number;
  experimentalSizes?: string[];
}

export const MODEL_CAPABILITIES: Record<ImageModel, ModelCapabilities> = {
  'gpt-image-1': {
    supportsInputFidelity: false,
    supportsTransparentBg: true,
    supportedSizePresets: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
    maxPromptLength: 32000,
  },
  'gpt-image-1.5': {
    supportsInputFidelity: true,
    supportsTransparentBg: true,
    supportedSizePresets: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
    maxPromptLength: 32000,
  },
  'gpt-image-2': {
    supportsInputFidelity: false,
    supportsTransparentBg: false,
    supportedSizePresets: [
      'auto',
      '1024x1024',
      '1536x1024',
      '1024x1536',
      '2048x2048',
      '2048x1152',
      '1152x2048',
      '3840x2160',
      '2160x3840',
    ],
    sizeConstraints: {
      edgeStep: 16,
      maxEdge: 3840,
      ratioMax: 3,
      pxMin: 655360,
      pxMax: 8294400,
    },
    experimentalSizes: ['3840x2160', '2160x3840'],
    maxPromptLength: 32000,
  },
};
