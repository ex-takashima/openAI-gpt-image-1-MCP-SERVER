/**
 * Cost calculation utilities for OpenAI gpt-image-1 API
 * Pricing as of 2025-12 (subject to change - check official OpenAI pricing)
 */

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  textProcessingCost: number;
  imageGenerationCost: number;
  totalCost: number;
  currency: string;
}

export interface ImageParams {
  size?: string;
  quality?: string;
  format?: string;
  model?: string;
}

// Pricing constants (USD per token)
const TEXT_INPUT_COST_PER_TOKEN = 0.00001; // $0.01 per 1K tokens (estimated)
const TEXT_OUTPUT_COST_PER_TOKEN = 0.00001;

// Image generation costs for gpt-image-1 (estimated based on quality and size)
const IMAGE_COST_GPT_IMAGE_1: Record<string, Record<string, number>> = {
  low: {
    '1024x1024': 0.015,
    '1024x1536': 0.020,
    '1536x1024': 0.020,
  },
  medium: {
    '1024x1024': 0.05,
    '1024x1536': 0.065,
    '1536x1024': 0.065,
  },
  high: {
    '1024x1024': 0.18,
    '1024x1536': 0.20,
    '1536x1024': 0.20,
  },
};

// Image generation costs for gpt-image-1.5 (20% cheaper than gpt-image-1)
const GPT_IMAGE_1_5_DISCOUNT = 0.8; // 20% cheaper
const IMAGE_COST_GPT_IMAGE_1_5: Record<string, Record<string, number>> = {
  low: {
    '1024x1024': 0.015 * GPT_IMAGE_1_5_DISCOUNT,
    '1024x1536': 0.020 * GPT_IMAGE_1_5_DISCOUNT,
    '1536x1024': 0.020 * GPT_IMAGE_1_5_DISCOUNT,
  },
  medium: {
    '1024x1024': 0.05 * GPT_IMAGE_1_5_DISCOUNT,
    '1024x1536': 0.065 * GPT_IMAGE_1_5_DISCOUNT,
    '1536x1024': 0.065 * GPT_IMAGE_1_5_DISCOUNT,
  },
  high: {
    '1024x1024': 0.18 * GPT_IMAGE_1_5_DISCOUNT,
    '1024x1536': 0.20 * GPT_IMAGE_1_5_DISCOUNT,
    '1536x1024': 0.20 * GPT_IMAGE_1_5_DISCOUNT,
  },
};

// Image generation costs for gpt-image-2 (USD per image, 2026-04 OpenAI pricing)
// 3840x2160 / 2160x3840 are experimental and use approximate pricing.
const IMAGE_COST_GPT_IMAGE_2: Record<string, Record<string, number>> = {
  low: {
    '1024x1024': 0.006,
    '1024x1536': 0.005,
    '1536x1024': 0.005,
    '2048x2048': 0.012,
    '2048x1152': 0.009,
    '1152x2048': 0.009,
    '3840x2160': 0.02,
    '2160x3840': 0.02,
  },
  medium: {
    '1024x1024': 0.053,
    '1024x1536': 0.041,
    '1536x1024': 0.041,
    '2048x2048': 0.11,
    '2048x1152': 0.075,
    '1152x2048': 0.075,
    '3840x2160': 0.15,
    '2160x3840': 0.15,
  },
  high: {
    '1024x1024': 0.211,
    '1024x1536': 0.165,
    '1536x1024': 0.165,
    '2048x2048': 0.42,
    '2048x1152': 0.30,
    '1152x2048': 0.30,
    '3840x2160': 0.41,
    '2160x3840': 0.41,
  },
};

/**
 * Estimate cost for an arbitrary (custom) size by pixel-scaling from the
 * 1024x1024 reference cost. Used when an exact entry is missing from the
 * pricing table — notably for gpt-image-2 custom sizes.
 */
function estimateCostByPixels(
  pricingTable: Record<string, Record<string, number>>,
  quality: string,
  size: string
): number | undefined {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return undefined;
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  const referenceCost = pricingTable[quality]?.['1024x1024'];
  if (!referenceCost) return undefined;
  const referencePx = 1024 * 1024;
  return referenceCost * ((w * h) / referencePx);
}

/**
 * Calculate the estimated cost for image generation
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  params: ImageParams
): CostBreakdown {
  const textProcessingCost =
    inputTokens * TEXT_INPUT_COST_PER_TOKEN +
    outputTokens * TEXT_OUTPUT_COST_PER_TOKEN;

  const quality = params.quality || 'medium';
  const size = params.size || '1024x1024';
  const model = params.model || 'gpt-image-1';

  // Select pricing table based on model
  const pricingTable =
    model === 'gpt-image-2'
      ? IMAGE_COST_GPT_IMAGE_2
      : model === 'gpt-image-1.5'
        ? IMAGE_COST_GPT_IMAGE_1_5
        : IMAGE_COST_GPT_IMAGE_1;

  const imageGenerationCost =
    pricingTable[quality]?.[size] ??
    estimateCostByPixels(pricingTable, quality, size) ??
    pricingTable[quality]?.['1024x1024'] ??
    0.05;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    textProcessingCost,
    imageGenerationCost,
    totalCost: textProcessingCost + imageGenerationCost,
    currency: 'USD',
  };
}

/**
 * Format cost breakdown as human-readable text
 */
export function formatCostBreakdown(cost: CostBreakdown, params: ImageParams): string {
  const lines: string[] = [];

  lines.push('\n📊 Usage Statistics\n');
  lines.push(`- Input tokens: ${cost.inputTokens.toLocaleString()}`);
  lines.push(`- Output tokens (image): ${cost.outputTokens.toLocaleString()}`);
  lines.push(`- Total tokens: ${cost.totalTokens.toLocaleString()}`);
  lines.push(`- Estimated cost: $${cost.totalCost.toFixed(3)}`);

  lines.push('\n💰 Cost breakdown:');
  lines.push(`  - Text processing: $${cost.textProcessingCost.toFixed(6)}`);
  lines.push(`  - Image generation: $${cost.imageGenerationCost.toFixed(6)}`);

  const model = params.model || 'gpt-image-1';
  const quality = params.quality || 'medium';
  const size = params.size || '1024x1024';
  const format = params.format || 'png';
  lines.push(`\n📏 Parameters: ${model} | ${quality} quality | ${size} | ${format}`);

  return lines.join('\n');
}

/**
 * Log debug information if DEBUG environment variable is set
 */
export function debugLog(...args: any[]): void {
  if (process.env.DEBUG === '1') {
    console.error('[DEBUG]', ...args);
  }
}
