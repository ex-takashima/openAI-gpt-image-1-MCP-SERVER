#!/usr/bin/env node

/**
 * Batch Image Generation CLI Tool
 *
 * Usage:
 *   openai-gpt-image-batch <config.json> [options]
 *
 * Options:
 *   --output-dir <path>     Output directory (overrides config)
 *   --format <text|json>    Output format (default: text)
 *   --timeout <ms>          Timeout in milliseconds (default: 600000)
 *   --max-concurrent <n>    Max concurrent jobs (default: 2)
 *   --estimate-only         Estimate cost without executing
 *   --help, -h              Show help message
 *   --version, -v           Show version
 */

import { resolve } from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { BatchManager } from '../utils/batch-manager.js';
import { loadBatchConfig, mergeBatchConfig, BatchConfigError } from '../utils/batch-config.js';
import { getDisplayPath } from '../utils/path.js';
import type { BatchResult, BatchExecutionOptions } from '../types/batch.js';

// Load environment variables
dotenv.config();

/**
 * Parse command line arguments
 */
function parseArgs(): {
  configPath?: string;
  options: BatchExecutionOptions;
  showHelp: boolean;
  showVersion: boolean;
} {
  const args = process.argv.slice(2);
  const options: BatchExecutionOptions = {
    format: 'text',
  };
  let configPath: string | undefined;
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        showHelp = true;
        break;

      case '--version':
      case '-v':
        showVersion = true;
        break;

      case '--output-dir':
        options.outputDir = args[++i];
        break;

      case '--format':
        const format = args[++i];
        if (format !== 'text' && format !== 'json') {
          console.error('Error: --format must be "text" or "json"');
          process.exit(1);
        }
        options.format = format;
        break;

      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        if (isNaN(options.timeout) || options.timeout < 1000) {
          console.error('Error: --timeout must be a number >= 1000');
          process.exit(1);
        }
        break;

      case '--max-concurrent':
        options.maxConcurrent = parseInt(args[++i], 10);
        if (isNaN(options.maxConcurrent) || options.maxConcurrent < 1 || options.maxConcurrent > 10) {
          console.error('Error: --max-concurrent must be a number between 1 and 10');
          process.exit(1);
        }
        break;

      case '--estimate-only':
        options.estimateOnly = true;
        break;

      default:
        if (arg.startsWith('--')) {
          console.error(`Error: Unknown option: ${arg}`);
          process.exit(1);
        }
        if (!configPath) {
          configPath = arg;
        } else {
          console.error('Error: Multiple config files specified');
          process.exit(1);
        }
    }
  }

  return { configPath, options, showHelp, showVersion };
}

/**
 * Show help message
 */
function showHelpMessage(): void {
  console.log(`
OpenAI GPT-Image-1 Batch Generation Tool

Usage:
  openai-gpt-image-batch <config.json> [options]

Options:
  --output-dir <path>      Output directory (overrides config)
  --format <text|json>     Output format (default: text)
  --timeout <ms>           Timeout in milliseconds (default: 600000)
  --max-concurrent <n>     Max concurrent jobs (default: 2)
  --estimate-only          Estimate cost without executing
  --help, -h               Show this help message
  --version, -v            Show version

Environment Variables:
  OPENAI_API_KEY                  OpenAI API key (required)
  OPENAI_IMAGE_OUTPUT_DIR         Default output directory
  OPENAI_BATCH_MAX_CONCURRENT     Default max concurrent jobs
  OPENAI_BATCH_TIMEOUT            Default timeout in milliseconds
  DEBUG                           Enable debug logging (set to "1")

Examples:
  # Basic usage
  openai-gpt-image-batch batch-config.json

  # Custom output directory
  openai-gpt-image-batch batch-config.json --output-dir ./my-images

  # JSON output format
  openai-gpt-image-batch batch-config.json --format json > result.json

  # Estimate cost only
  openai-gpt-image-batch batch-config.json --estimate-only

  # Custom concurrency and timeout
  openai-gpt-image-batch batch-config.json --max-concurrent 5 --timeout 1200000

For more information, see: https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER
`);
}

/**
 * Show version information
 */
function showVersionInfo(): void {
  console.log('openai-gpt-image-batch version 1.1.0');
}

/**
 * Format batch result as text
 */
function formatResultAsText(result: BatchResult): string {
  const duration = (result.total_duration_ms / 1000).toFixed(2);
  const startTime = new Date(result.started_at).toLocaleString();
  const finishTime = new Date(result.finished_at).toLocaleString();

  let output = '';

  if (result.succeeded === result.total) {
    output += '✅ Batch Image Generation Completed Successfully\n\n';
  } else if (result.succeeded > 0) {
    output += '⚠️  Batch Image Generation Completed with Some Failures\n\n';
  } else {
    output += '❌ Batch Image Generation Failed\n\n';
  }

  output += '📊 Summary:\n';
  output += `- Total Jobs: ${result.total}\n`;
  output += `- Succeeded: ${result.succeeded}\n`;
  output += `- Failed: ${result.failed}\n`;
  if (result.cancelled > 0) {
    output += `- Cancelled: ${result.cancelled}\n`;
  }
  output += `- Duration: ${duration}s\n`;
  output += `- Started: ${startTime}\n`;
  output += `- Finished: ${finishTime}\n`;

  if (result.total_cost !== undefined) {
    output += `\n💰 Total Cost: $${result.total_cost.toFixed(4)}\n`;
  }

  // Successful jobs
  const succeeded = result.results.filter(r => r.status === 'completed');
  if (succeeded.length > 0) {
    output += '\n### ✅ Successfully Generated Images\n\n';
    for (let i = 0; i < succeeded.length; i++) {
      const job = succeeded[i];
      const paths = job.output_paths || [job.output_path];
      const displayPath = paths[0] ? getDisplayPath(paths[0]) : 'N/A';
      output += `${i + 1}. ${displayPath}\n`;
      output += `   Prompt: ${job.prompt.substring(0, 60)}${job.prompt.length > 60 ? '...' : ''}\n`;
      if (paths.length > 1) {
        output += `   (+ ${paths.length - 1} more variant${paths.length - 1 > 1 ? 's' : ''})\n`;
      }
    }
  }

  // Failed jobs
  const failed = result.results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    output += '\n### ❌ Failed Jobs\n\n';
    for (let i = 0; i < failed.length; i++) {
      const job = failed[i];
      output += `${i + 1}. ${job.prompt.substring(0, 60)}${job.prompt.length > 60 ? '...' : ''}\n`;
      output += `   Error: ${job.error || 'Unknown error'}\n`;
    }
  }

  // Cancelled jobs
  const cancelled = result.results.filter(r => r.status === 'cancelled');
  if (cancelled.length > 0) {
    output += '\n### 🚫 Cancelled Jobs\n\n';
    for (let i = 0; i < cancelled.length; i++) {
      const job = cancelled[i];
      output += `${i + 1}. ${job.prompt.substring(0, 60)}${job.prompt.length > 60 ? '...' : ''}\n`;
      output += `   Reason: ${job.error || 'Job was cancelled'}\n`;
    }
  }

  return output;
}

/**
 * Format batch result as JSON
 */
function formatResultAsJSON(result: BatchResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format cost estimate as text
 */
function formatEstimateAsText(estimate: {
  totalJobs: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  breakdown: Array<{ quality: string; count: number; costMin: number; costMax: number }>;
}): string {
  let output = '📊 Cost Estimation\n\n';
  output += `Total jobs: ${estimate.totalJobs}\n`;
  output += `Estimated total cost: $${estimate.estimatedCostMin.toFixed(2)} - $${estimate.estimatedCostMax.toFixed(2)}\n\n`;

  if (estimate.breakdown.length > 0) {
    output += 'Breakdown by quality:\n';
    for (const item of estimate.breakdown) {
      output += `  - ${item.count} x ${item.quality} quality: $${item.costMin.toFixed(2)} - $${item.costMax.toFixed(2)}\n`;
    }
  }

  output += '\nNote: These are approximate estimates. Actual costs may vary.\n';
  output += '      See https://openai.com/api/pricing/ for current pricing.\n';

  return output;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const { configPath, options, showHelp, showVersion } = parseArgs();

  // Show help or version
  if (showHelp) {
    showHelpMessage();
    process.exit(0);
  }

  if (showVersion) {
    showVersionInfo();
    process.exit(0);
  }

  // Validate config path
  if (!configPath) {
    console.error('Error: Configuration file path is required\n');
    console.error('Usage: openai-gpt-image-batch <config.json> [options]');
    console.error('Run "openai-gpt-image-batch --help" for more information');
    process.exit(1);
  }

  // Validate API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      'Error: OPENAI_API_KEY environment variable is required.\n' +
        'Please set it in your environment or .env file.\n' +
        'Example: export OPENAI_API_KEY="sk-proj-..."\n'
    );
    process.exit(1);
  }

  try {
    // Load and merge configuration
    const configFilePath = resolve(process.cwd(), configPath);
    const config = loadBatchConfig(configFilePath);
    const mergedConfig = mergeBatchConfig(config, {
      output_dir: options.outputDir,
      max_concurrent: options.maxConcurrent,
      timeout: options.timeout,
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORGANIZATION,
    });

    // Initialize BatchManager
    const batchManager = new BatchManager(openai);

    // Estimate only mode
    if (options.estimateOnly) {
      const estimate = await batchManager.estimateBatchCost(mergedConfig);
      if (options.format === 'json') {
        console.log(JSON.stringify(estimate, null, 2));
      } else {
        console.log(formatEstimateAsText(estimate));
      }
      process.exit(0);
    }

    // Execute batch
    const result = await batchManager.executeBatch(mergedConfig, options);

    // Format and output result
    if (options.format === 'json') {
      console.log(formatResultAsJSON(result));
    } else {
      console.log(formatResultAsText(result));
    }

    // Exit with appropriate code
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error: any) {
    if (error instanceof BatchConfigError) {
      console.error(`Configuration Error: ${error.message}`);
      process.exit(1);
    }

    console.error(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
