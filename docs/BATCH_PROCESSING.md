# Batch Image Generation Guide

This document explains the batch image generation feature for OpenAI GPT-Image-1 MCP Server.

## Table of Contents

1. [Overview](#overview)
2. [CLI Batch Processing](#cli-batch-processing)
3. [Batch Configuration JSON Format](#batch-configuration-json-format)
4. [Batch Processing Result JSON Format](#batch-processing-result-json-format)
5. [Environment Variables](#environment-variables)
6. [GitHub Actions Integration](#github-actions-integration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The batch image generation feature allows you to generate multiple images at once. This feature can be used through:

- **CLI (Command Line)**: Direct execution from local or CI/CD environments
- **GitHub Actions**: Automated execution triggered by Issue comments

### Features

- ✅ **Async Job Management**: Efficient parallel processing using JobManager
- ✅ **Concurrency Control**: Resource usage limitation
- ✅ **Detailed Results**: Output in text or JSON format
- ✅ **Error Handling**: Continue execution even if individual jobs fail
- ✅ **Timeout Control**: Prevention of long-running executions
- ✅ **Retry Policy**: Automatic retry for failed jobs
- ✅ **Cost Estimation**: Estimate costs before execution

---

## CLI Batch Processing

### Installation

```bash
npm install -g openai-gpt-image-mcp-server
```

Or clone the repository and build locally:

```bash
git clone https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER.git
cd openAI-gpt-image-1-MCP-SERVER
npm install
npm run build
```

### Basic Usage

```bash
openai-gpt-image-batch <batch-config.json> [OPTIONS]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output-dir <path>` | Output directory | `OPENAI_IMAGE_OUTPUT_DIR` or `~/Downloads/openai-images` |
| `--format <text\|json>` | Output format | `text` |
| `--timeout <ms>` | Timeout in milliseconds | `600000` (10 minutes) |
| `--max-concurrent <n>` | Max concurrent jobs | `2` |
| `--estimate-only` | Estimate cost without executing | - |
| `--help`, `-h` | Show help message | - |
| `--version`, `-v` | Show version | - |

### Usage Examples

#### 1. Basic Execution

```bash
# Generate images using batch-config.json
openai-gpt-image-batch batch-config.json
```

#### 2. Custom Output Directory

```bash
# Save to ./my-images directory
openai-gpt-image-batch batch-config.json --output-dir ./my-images
```

#### 3. JSON Format Output

```bash
# Save results in JSON format to file
openai-gpt-image-batch batch-config.json --format json > result.json
```

#### 4. Set Timeout

```bash
# Set 20-minute timeout
openai-gpt-image-batch batch-config.json --timeout 1200000
```

#### 5. Cost Estimation Only

```bash
# Estimate cost without generating images
openai-gpt-image-batch batch-config.json --estimate-only
```

### Using Sample Configurations

```bash
# Simple batch (3 images)
openai-gpt-image-batch examples/batch-simple.json

# Detailed batch with custom settings
openai-gpt-image-batch examples/batch-detailed.json

# Multi-variant generation
openai-gpt-image-batch examples/batch-multi-variant.json

# Large-scale batch (10+ images)
openai-gpt-image-batch examples/batch-large-scale.json
```

---

## Batch Configuration JSON Format

### Basic Structure

```json
{
  "jobs": [
    {
      "prompt": "Image generation prompt",
      "output_path": "filename.png",
      "size": "1024x1024",
      "quality": "high",
      "output_format": "png",
      "transparent_background": false,
      "moderation": "auto",
      "sample_count": 1
    }
  ],
  "output_dir": "./output",
  "max_concurrent": 2,
  "timeout": 600000,
  "retry_policy": {
    "max_retries": 2,
    "retry_delay_ms": 5000,
    "retry_on_errors": ["rate_limit", "timeout"]
  }
}
```

### Field Descriptions

#### `jobs` (Required)

Array of image generation jobs. Each job has the following fields:

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `prompt` | string | ✅ | Image generation prompt | - |
| `output_path` | string | ❌ | Output file path (filename only) | Auto-generated |
| `size` | string | ❌ | Image size: `1024x1024`, `1024x1536`, `1536x1024`, `auto` | `auto` |
| `quality` | string | ❌ | Quality level: `low`, `medium`, `high`, `auto` | `auto` |
| `output_format` | string | ❌ | Output format: `png`, `jpeg`, `webp` | `png` |
| `transparent_background` | boolean | ❌ | Enable transparent background (PNG only) | `false` |
| `moderation` | string | ❌ | Content filtering: `auto`, `low`, `medium`, `high` | `auto` |
| `sample_count` | number | ❌ | Number of images to generate (1-10) | 1 |

#### `output_dir` (Optional)

Output directory path. Can be overridden by CLI `--output-dir` option.

#### `max_concurrent` (Optional)

Maximum concurrent jobs. Can be overridden by environment variable `OPENAI_BATCH_MAX_CONCURRENT` or CLI `--max-concurrent` option.

**Range**: 1-10
**Default**: 2

#### `timeout` (Optional)

Timeout in milliseconds. Can be overridden by CLI `--timeout` option.

**Range**: 1000-3600000 (1 second to 1 hour)
**Default**: 600000 (10 minutes)

#### `retry_policy` (Optional)

Retry configuration for failed jobs.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `max_retries` | number | Maximum retry attempts (0-5) | 2 |
| `retry_delay_ms` | number | Delay between retries in ms (100-60000) | 5000 |
| `retry_on_errors` | string[] | Error patterns to trigger retry | `["rate_limit", "timeout"]` |

### Sample Configurations

#### 1. Simple Configuration

```json
{
  "jobs": [
    {
      "prompt": "A beautiful sunset over the ocean"
    },
    {
      "prompt": "A futuristic city skyline"
    }
  ]
}
```

#### 2. Detailed Configuration

```json
{
  "jobs": [
    {
      "prompt": "A photorealistic portrait of a smiling person",
      "output_path": "portrait.png",
      "size": "1024x1536",
      "quality": "high",
      "output_format": "png"
    },
    {
      "prompt": "A minimalist abstract art piece",
      "output_path": "abstract.png",
      "size": "1024x1024",
      "quality": "medium",
      "output_format": "png"
    }
  ],
  "output_dir": "./generated-images",
  "max_concurrent": 3,
  "timeout": 900000
}
```

#### 3. Multi-Variant Generation

```json
{
  "jobs": [
    {
      "prompt": "A modern minimalist living room interior",
      "output_path": "living_room.png",
      "sample_count": 5,
      "quality": "high"
    }
  ],
  "max_concurrent": 2,
  "retry_policy": {
    "max_retries": 3,
    "retry_delay_ms": 5000
  }
}
```

---

## Batch Processing Result JSON Format

When batch processing is run with `--format json` option, results are output in JSON format.

### Basic Structure

```json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "cancelled": 0,
  "results": [
    {
      "job_id": "abc123",
      "prompt": "A beautiful sunset over the ocean",
      "status": "completed",
      "output_path": "/path/to/sunset.png",
      "output_paths": ["/path/to/sunset.png"],
      "duration_ms": 15230,
      "history_uuid": "8796265a-8dc8-48f4-9b40-fe241985379b"
    },
    {
      "job_id": "def456",
      "prompt": "An invalid prompt",
      "status": "failed",
      "error": "Content policy violation",
      "duration_ms": 3120
    }
  ],
  "started_at": "2025-10-28T10:00:00.000Z",
  "finished_at": "2025-10-28T10:00:45.320Z",
  "total_duration_ms": 45320,
  "total_cost": 0.42
}
```

### Field Descriptions

#### Top Level

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of jobs |
| `succeeded` | number | Number of successful jobs |
| `failed` | number | Number of failed jobs |
| `cancelled` | number | Number of cancelled jobs |
| `results` | array | Individual job results |
| `started_at` | string | Batch start time (ISO 8601) |
| `finished_at` | string | Batch finish time (ISO 8601) |
| `total_duration_ms` | number | Total execution time (ms) |
| `total_cost` | number | Total estimated cost (USD) |

#### `results` Array Elements

| Field | Type | Description | When Present |
|-------|------|-------------|--------------|
| `job_id` | string | Job unique identifier | Always |
| `prompt` | string | Generation prompt used | Always |
| `status` | string | Job status: `completed`, `failed`, `cancelled` | Always |
| `output_path` | string | Generated image file path | `status: "completed"` only |
| `output_paths` | string[] | All generated image file paths | `status: "completed"` only |
| `error` | string | Error message | `status: "failed"` or `cancelled` |
| `duration_ms` | number | Job execution time (ms) | When completed or failed |
| `history_uuid` | string | History record UUID | `status: "completed"` only |

### Status Types

| Status | Description |
|--------|-------------|
| `completed` | Job completed successfully, image generated |
| `failed` | Job failed (API error, safety filter, etc.) |
| `cancelled` | Job cancelled due to timeout or cancellation |

### Getting JSON Output

```bash
# Save result to JSON file
openai-gpt-image-batch batch-config.json --format json > result.json

# Display JSON to stdout
openai-gpt-image-batch batch-config.json --format json

# Parse with jq to show only completed jobs
openai-gpt-image-batch batch-config.json --format json | jq '.results[] | select(.status == "completed")'

# Extract error messages from failed jobs
openai-gpt-image-batch batch-config.json --format json | jq '.results[] | select(.status == "failed") | {prompt, error}'
```

---

## Environment Variables

The following environment variables are used in batch processing:

### Authentication (Required)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_IMAGE_OUTPUT_DIR` | Default output directory | `~/Downloads/openai-images` |
| `OPENAI_BATCH_MAX_CONCURRENT` | Default max concurrent jobs | `2` |
| `OPENAI_BATCH_TIMEOUT` | Default timeout (ms) | `600000` |
| `OPENAI_ORGANIZATION` | OpenAI organization ID | - |
| `HISTORY_DB_PATH` | Database location | `~/.openai-gpt-image/history.db` |
| `DEBUG` | Enable debug logging | - |

### Setting Examples

#### Bash/Zsh

```bash
export OPENAI_API_KEY="sk-proj-..."
export OPENAI_IMAGE_OUTPUT_DIR="./output"
export OPENAI_BATCH_MAX_CONCURRENT="3"
```

#### `.env` File

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_IMAGE_OUTPUT_DIR=./output
OPENAI_BATCH_MAX_CONCURRENT=3
OPENAI_BATCH_TIMEOUT=900000
```

---

## GitHub Actions Integration

You can use GitHub Actions to trigger batch image generation from Issue comments.

### Setup

#### 1. Repository Secrets

Set the following secret in Settings > Secrets and variables > Actions:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | ✅ |

#### 2. Workflow File

Create `.github/workflows/batch-image-generation.yml`:

```yaml
name: Batch Image Generation

on:
  issue_comment:
    types: [created]

permissions:
  issues: write
  contents: read

jobs:
  batch-generate:
    if: contains(github.event.comment.body, '/batch')
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Extract batch config
        id: config
        uses: actions/github-script@v7
        with:
          script: |
            const comment = context.payload.comment.body;
            const jsonMatch = comment.match(/```json\n([\s\S]+?)\n```/);
            if (!jsonMatch) {
              throw new Error('No JSON config found in comment');
            }
            const fs = require('fs');
            fs.writeFileSync('batch-config.json', jsonMatch[1]);
            return 'success';

      - name: Run batch generation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npm run batch batch-config.json --format json > result.json

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: generated-images-${{ github.run_id }}
          path: |
            ~/Downloads/openai-images/**/*.png
            ~/Downloads/openai-images/**/*.jpg
            ~/Downloads/openai-images/**/*.webp
          retention-days: 7

      - name: Comment results
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const result = JSON.parse(fs.readFileSync('result.json', 'utf8'));

            let comment = `## ✅ Batch Image Generation Completed\n\n`;
            comment += `**Summary:**\n`;
            comment += `- Total Jobs: ${result.total}\n`;
            comment += `- Succeeded: ${result.succeeded}\n`;
            comment += `- Failed: ${result.failed}\n`;
            comment += `- Duration: ${(result.total_duration_ms / 1000).toFixed(2)}s\n`;

            if (result.total_cost) {
              comment += `- Total Cost: $${result.total_cost.toFixed(4)}\n`;
            }

            comment += `\n`;

            if (result.succeeded > 0) {
              comment += `### ✅ Successfully Generated Images\n\n`;
              result.results
                .filter(r => r.status === 'completed')
                .forEach((r, i) => {
                  const filename = r.output_path ? r.output_path.split('/').pop() : 'unknown';
                  comment += `${i + 1}. \`${filename}\`: ${r.prompt.substring(0, 60)}\n`;
                });
            }

            if (result.failed > 0) {
              comment += `\n### ❌ Failed Jobs\n\n`;
              result.results
                .filter(r => r.status === 'failed')
                .forEach((r, i) => {
                  comment += `${i + 1}. ${r.prompt.substring(0, 60)}: ${r.error}\n`;
                });
            }

            comment += `\n📦 Download all generated images from the [workflow artifacts](${context.payload.repository.html_url}/actions/runs/${context.runId}).`;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Usage

#### 1. Create an Issue

Create an Issue with any title and description.

#### 2. Post Batch Configuration

Post a comment with `/batch` trigger and JSON configuration:

````markdown
/batch

```json
{
  "jobs": [
    {
      "prompt": "A beautiful sunset over the ocean",
      "output_path": "sunset.png"
    },
    {
      "prompt": "A futuristic city skyline at night",
      "output_path": "city.png"
    }
  ]
}
```
````

#### 3. Workflow Execution

After posting the comment, the GitHub Actions workflow starts automatically.

#### 4. Check Results

- After workflow completion, results are automatically posted as an Issue comment
- Generated images can be downloaded from GitHub Actions artifacts (retained for 7 days)

---

## Troubleshooting

### 1. Authentication Error

**Error**: `Error: OPENAI_API_KEY environment variable is required`

**Solution**:
- Ensure `OPENAI_API_KEY` environment variable is set
- Verify API key is valid
- Complete OpenAI Organization Verification if needed
- For GitHub Actions, check secret name is correct

### 2. Timeout Error

**Error**: `Timeout reached. Cancelling remaining jobs...`

**Solution**:
- Increase timeout with `--timeout` option
- Increase `max_concurrent` for more parallel processing
- Reduce number of jobs
- Consider splitting into multiple batches

### 3. Job Failures

**Error**: `Some jobs failed`

**Solution**:
- Check JSON output to identify failure reasons
- Verify prompts don't violate content policy
- Check OpenAI API quota
- Review error messages for specific issues

### 4. Configuration Errors

**Error**: `Configuration Error: jobs must be an array`

**Solution**:
- Validate JSON syntax (trailing commas, quotes, etc.)
- Use online JSON validator
- Ensure `jobs` array exists and is not empty
- Check all required fields are present

### 5. Rate Limiting

**Error**: Job fails with rate limit error

**Solution**:
- Reduce `max_concurrent` value
- Enable retry policy with rate_limit in `retry_on_errors`
- Contact OpenAI support to increase rate limits
- Add delays between batches

### 6. Out of Memory

**Error**: Process crashes with memory error

**Solution**:
- Reduce `max_concurrent` value
- Process images in smaller batches
- Reduce `sample_count` per job
- Use lower quality settings

---

## Best Practices

### 1. Start Small

Begin with small batches (3-5 images) to test configuration before scaling up.

### 2. Monitor Costs

Use `--estimate-only` to preview costs before execution:

```bash
openai-gpt-image-batch batch-config.json --estimate-only
```

### 3. Use Appropriate Concurrency

Recommended settings:
- Personal projects: `max_concurrent: 2`
- Small teams: `max_concurrent: 3-5`
- Large scale: Monitor rate limits carefully

### 4. Enable Retry Policy

For production use, always enable retry policy:

```json
{
  "retry_policy": {
    "max_retries": 2,
    "retry_delay_ms": 5000,
    "retry_on_errors": ["rate_limit", "timeout", "server_error"]
  }
}
```

### 5. Organize Output

Use descriptive output paths and organize by project:

```json
{
  "jobs": [
    {
      "prompt": "Logo design",
      "output_path": "project-a/logo_v1.png"
    }
  ],
  "output_dir": "./client-assets"
}
```

---

## Summary

The batch processing feature enables:
- Multiple image generation in a single execution
- GitHub Actions integration for CI/CD
- Team collaboration improvement
- Large-scale image generation use cases

**Next Steps:**

1. Try sample configuration files
2. Set up GitHub Actions workflow
3. Integrate into your CI/CD pipeline

**Support:**

For issues, please create an issue on GitHub:
https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER/issues

---

**Happy Batch Generating! 🎨**
