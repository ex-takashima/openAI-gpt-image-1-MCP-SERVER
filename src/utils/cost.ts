/**
 * Cost calculation utilities for OpenAI gpt-image-1 API
 * Pricing as of 2025-10 (subject to change - check official OpenAI pricing)
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
}

// Pricing constants (USD per token)
const TEXT_INPUT_COST_PER_TOKEN = 0.00001; // $0.01 per 1K tokens (estimated)
const TEXT_OUTPUT_COST_PER_TOKEN = 0.00001;

// Image generation costs (estimated based on quality and size)
const IMAGE_COST_BASE: Record<string, Record<string, number>> = {
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

  const imageGenerationCost = IMAGE_COST_BASE[quality]?.[size] || 0.05;

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

  const quality = params.quality || 'medium';
  const size = params.size || '1024x1024';
  const format = params.format || 'png';
  lines.push(`\n📏 Parameters: ${quality} quality | ${size} | ${format}`);

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
