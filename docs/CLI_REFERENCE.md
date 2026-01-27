# CLI Reference

English | [日本語](CLI_REFERENCE.ja.md)

Technical reference for command-line interfaces and JSON schemas.

## Table of Contents

1. [Entry Points](#entry-points)
2. [MCP Server CLI](#mcp-server-cli)
3. [Batch CLI](#batch-cli)
4. [MCP Tool JSON Schemas](#mcp-tool-json-schemas)
5. [Type Definitions](#type-definitions)
6. [Exit Codes](#exit-codes)

---

## Entry Points

| Command | Binary | Source |
|---------|--------|--------|
| MCP Server | `openai-gpt-image-mcp-server` | `dist/index.js` |
| Batch CLI | `openai-gpt-image-batch` | `dist/cli/batch.js` |

### Installation

```bash
# Global install
npm install -g openai-gpt-image-mcp-server

# Local build
npm install && npm run build
```

---

## MCP Server CLI

### Usage

```bash
openai-gpt-image-mcp-server
```

The MCP server runs on stdio transport and accepts tool calls via the Model Context Protocol.

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key | - |
| `OPENAI_ORGANIZATION` | No | Organization ID | - |
| `OPENAI_IMAGE_OUTPUT_DIR` | No | Default output directory | `~/Downloads/openai-images` |
| `OPENAI_IMAGE_INPUT_DIR` | No | Input directory for edit/transform | - |
| `OPENAI_IMAGE_EMBED_METADATA` | No | Enable metadata embedding | `true` |
| `OPENAI_IMAGE_METADATA_LEVEL` | No | Detail level: `minimal`\|`standard`\|`full` | `standard` |
| `OPENAI_IMAGE_THUMBNAIL` | No | Enable thumbnails | `false` |
| `OPENAI_IMAGE_THUMBNAIL_SIZE` | No | Thumbnail size (pixels) | `128` |
| `OPENAI_IMAGE_THUMBNAIL_QUALITY` | No | JPEG quality (1-100) | `60` |
| `HISTORY_DB_PATH` | No | Database location | `~/.openai-gpt-image/history.db` |
| `OPENAI_IMAGE_ALLOW_ANY_PATH` | No | Bypass path security (`true`) | `false` |
| `DEBUG` | No | Enable debug logging | - |

---

## Batch CLI

### Usage

```bash
openai-gpt-image-batch <config.json> [OPTIONS]
```

### Options

| Option | Alias | Type | Description | Default |
|--------|-------|------|-------------|---------|
| `--help` | `-h` | flag | Show help message | - |
| `--version` | `-v` | flag | Show version | - |
| `--output-dir` | - | `<path>` | Override output directory | Config value |
| `--format` | - | `text`\|`json` | Output format | `text` |
| `--timeout` | - | `<ms>` | Timeout (min: 1000) | `600000` |
| `--max-concurrent` | - | `<n>` | Concurrent jobs (1-10) | `2` |
| `--estimate-only` | - | flag | Cost estimation only | - |
| `--allow-any-path` | - | flag | Bypass path security (CI/CD) | - |

### Examples

```bash
# Basic execution
openai-gpt-image-batch batch-config.json

# Custom output directory
openai-gpt-image-batch batch-config.json --output-dir ./my-images

# JSON output
openai-gpt-image-batch batch-config.json --format json > result.json

# Cost estimation
openai-gpt-image-batch batch-config.json --estimate-only

# High concurrency with extended timeout
openai-gpt-image-batch batch-config.json --max-concurrent 5 --timeout 1200000

# CI/CD: Output to any directory (bypass security)
openai-gpt-image-batch batch-config.json --output-dir ./artifacts --allow-any-path
```

### Batch Configuration JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["jobs"],
  "properties": {
    "jobs": {
      "type": "array",
      "minItems": 1,
      "maxItems": 100,
      "items": {
        "type": "object",
        "required": ["prompt"],
        "properties": {
          "prompt": { "type": "string", "minLength": 1 },
          "output_path": { "type": "string" },
          "size": { "enum": ["1024x1024", "1024x1536", "1536x1024", "auto"] },
          "quality": { "enum": ["low", "medium", "high", "auto"] },
          "output_format": { "enum": ["png", "jpeg", "webp"] },
          "transparent_background": { "type": "boolean" },
          "moderation": { "enum": ["auto", "low", "medium", "high"] },
          "sample_count": { "type": "integer", "minimum": 1, "maximum": 10 },
          "return_base64": { "type": "boolean" }
        }
      }
    },
    "output_dir": { "type": "string" },
    "max_concurrent": { "type": "integer", "minimum": 1, "maximum": 10 },
    "timeout": { "type": "integer", "minimum": 1000, "maximum": 3600000 },
    "retry_policy": {
      "type": "object",
      "properties": {
        "max_retries": { "type": "integer", "minimum": 0, "maximum": 5 },
        "retry_delay_ms": { "type": "integer", "minimum": 100, "maximum": 60000 },
        "retry_on_errors": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

### Batch Result JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "total": { "type": "integer" },
    "succeeded": { "type": "integer" },
    "failed": { "type": "integer" },
    "cancelled": { "type": "integer" },
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["job_id", "prompt", "status"],
        "properties": {
          "job_id": { "type": "string" },
          "prompt": { "type": "string" },
          "status": { "enum": ["completed", "failed", "cancelled"] },
          "output_path": { "type": "string" },
          "output_paths": { "type": "array", "items": { "type": "string" } },
          "error": { "type": "string" },
          "duration_ms": { "type": "integer" },
          "history_uuid": { "type": "string" }
        }
      }
    },
    "started_at": { "type": "string", "format": "date-time" },
    "finished_at": { "type": "string", "format": "date-time" },
    "total_duration_ms": { "type": "integer" },
    "total_cost": { "type": "number" }
  }
}
```

---

## MCP Tool JSON Schemas

### generate_image

Generate new images from text prompts.

```json
{
  "name": "generate_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Text prompt describing the image to generate"
      },
      "output_path": {
        "type": "string",
        "description": "Output file path",
        "default": "generated_image.png"
      },
      "model": {
        "type": "string",
        "enum": ["gpt-image-1", "gpt-image-1.5"],
        "description": "Model to use (1.5 is faster/cheaper)",
        "default": "gpt-image-1"
      },
      "size": {
        "type": "string",
        "enum": ["1024x1024", "1024x1536", "1536x1024", "auto"],
        "default": "auto"
      },
      "quality": {
        "type": "string",
        "enum": ["low", "medium", "high", "auto"],
        "default": "auto"
      },
      "output_format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"],
        "default": "png"
      },
      "transparent_background": {
        "type": "boolean",
        "description": "PNG only",
        "default": false
      },
      "moderation": {
        "type": "string",
        "enum": ["auto", "low"],
        "default": "auto"
      },
      "sample_count": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 1
      },
      "return_base64": {
        "type": "boolean",
        "default": false
      },
      "include_thumbnail": {
        "type": "boolean",
        "default": false
      }
    }
  }
}
```

### edit_image

Edit existing images using inpainting.

```json
{
  "name": "edit_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Description of desired edits"
      },
      "reference_image_base64": {
        "type": "string",
        "description": "Base64 encoded reference image"
      },
      "reference_image_path": {
        "type": "string",
        "description": "Path to reference image file"
      },
      "mask_image_base64": {
        "type": "string",
        "description": "Base64 mask (transparent areas edited)"
      },
      "mask_image_path": {
        "type": "string",
        "description": "Path to mask image file"
      },
      "output_path": {
        "type": "string",
        "default": "edited_image.png"
      },
      "model": {
        "type": "string",
        "enum": ["gpt-image-1", "gpt-image-1.5"],
        "default": "gpt-image-1"
      },
      "size": {
        "type": "string",
        "enum": ["1024x1024", "1024x1536", "1536x1024", "auto"],
        "default": "auto"
      },
      "quality": {
        "type": "string",
        "enum": ["low", "medium", "high", "auto"],
        "default": "auto"
      },
      "output_format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"],
        "default": "png"
      },
      "moderation": {
        "type": "string",
        "enum": ["auto", "low"],
        "default": "auto"
      },
      "sample_count": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 1
      },
      "return_base64": {
        "type": "boolean",
        "default": false
      },
      "include_thumbnail": {
        "type": "boolean",
        "default": false
      },
      "input_fidelity": {
        "type": "string",
        "enum": ["low", "high"],
        "description": "gpt-image-1.5 only. High preserves faces/logos better",
        "default": "low"
      }
    }
  }
}
```

### transform_image

Transform images to new styles.

```json
{
  "name": "transform_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Description of desired transformation"
      },
      "reference_image_base64": {
        "type": "string",
        "description": "Base64 encoded reference image"
      },
      "reference_image_path": {
        "type": "string",
        "description": "Path to reference image file"
      },
      "output_path": {
        "type": "string",
        "default": "transformed_image.png"
      },
      "model": {
        "type": "string",
        "enum": ["gpt-image-1", "gpt-image-1.5"],
        "default": "gpt-image-1"
      },
      "size": {
        "type": "string",
        "enum": ["1024x1024", "1024x1536", "1536x1024", "auto"],
        "default": "auto"
      },
      "quality": {
        "type": "string",
        "enum": ["low", "medium", "high", "auto"],
        "default": "auto"
      },
      "output_format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"],
        "default": "png"
      },
      "moderation": {
        "type": "string",
        "enum": ["auto", "low"],
        "default": "auto"
      },
      "sample_count": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 1
      },
      "return_base64": {
        "type": "boolean",
        "default": false
      },
      "include_thumbnail": {
        "type": "boolean",
        "default": false
      },
      "input_fidelity": {
        "type": "string",
        "enum": ["low", "high"],
        "description": "gpt-image-1.5 only",
        "default": "low"
      }
    }
  }
}
```

### list_generated_images

List image files in a directory.

```json
{
  "name": "list_generated_images",
  "inputSchema": {
    "type": "object",
    "properties": {
      "directory": {
        "type": "string",
        "description": "Directory path to search",
        "default": "current directory"
      }
    }
  }
}
```

### list_history

List generation history with filters.

```json
{
  "name": "list_history",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 20
      },
      "offset": {
        "type": "number",
        "minimum": 0,
        "default": 0
      },
      "tool_name": {
        "type": "string",
        "enum": ["generate_image", "edit_image", "transform_image"]
      },
      "query": {
        "type": "string",
        "description": "Search in prompt text"
      }
    }
  }
}
```

### get_history_by_uuid

Get history record details by UUID.

```json
{
  "name": "get_history_by_uuid",
  "inputSchema": {
    "type": "object",
    "required": ["uuid"],
    "properties": {
      "uuid": {
        "type": "string",
        "description": "History record UUID"
      }
    }
  }
}
```

### get_metadata_from_image

Extract metadata from generated images.

```json
{
  "name": "get_metadata_from_image",
  "inputSchema": {
    "type": "object",
    "required": ["image_path"],
    "properties": {
      "image_path": {
        "type": "string",
        "description": "Path to image file"
      }
    }
  }
}
```

### start_generation_job

Start async background job.

```json
{
  "name": "start_generation_job",
  "inputSchema": {
    "type": "object",
    "required": ["tool_name", "prompt"],
    "properties": {
      "tool_name": {
        "type": "string",
        "enum": ["generate_image", "edit_image", "transform_image"]
      },
      "prompt": {
        "type": "string"
      },
      "output_path": {
        "type": "string"
      },
      "model": {
        "type": "string",
        "enum": ["gpt-image-1", "gpt-image-1.5"],
        "default": "gpt-image-1"
      },
      "size": {
        "type": "string",
        "enum": ["1024x1024", "1024x1536", "1536x1024", "auto"]
      },
      "quality": {
        "type": "string",
        "enum": ["low", "medium", "high", "auto"]
      },
      "output_format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"]
      },
      "sample_count": {
        "type": "number",
        "minimum": 1,
        "maximum": 10
      },
      "input_fidelity": {
        "type": "string",
        "enum": ["low", "high"],
        "description": "gpt-image-1.5 only"
      }
    }
  }
}
```

### check_job_status

Check async job status.

```json
{
  "name": "check_job_status",
  "inputSchema": {
    "type": "object",
    "required": ["job_id"],
    "properties": {
      "job_id": {
        "type": "string",
        "description": "Job ID from start_generation_job"
      }
    }
  }
}
```

### get_job_result

Get completed job result.

```json
{
  "name": "get_job_result",
  "inputSchema": {
    "type": "object",
    "required": ["job_id"],
    "properties": {
      "job_id": {
        "type": "string"
      }
    }
  }
}
```

### cancel_job

Cancel pending/running job.

```json
{
  "name": "cancel_job",
  "inputSchema": {
    "type": "object",
    "required": ["job_id"],
    "properties": {
      "job_id": {
        "type": "string"
      }
    }
  }
}
```

### list_jobs

List async jobs with filters.

```json
{
  "name": "list_jobs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["pending", "running", "completed", "failed", "cancelled"]
      },
      "tool_name": {
        "type": "string",
        "enum": ["generate_image", "edit_image", "transform_image"]
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 20
      },
      "offset": {
        "type": "number",
        "minimum": 0
      }
    }
  }
}
```

---

## Type Definitions

### TypeScript Types

```typescript
// Image parameters
type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
type ImageFormat = 'png' | 'jpeg' | 'webp';
type ModerationLevel = 'auto' | 'low';
type ImageModel = 'gpt-image-1' | 'gpt-image-1.5';
type InputFidelity = 'low' | 'high';

// Job status
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Batch result status
type BatchJobStatus = 'completed' | 'failed' | 'cancelled';
```

### Parameter Interfaces

```typescript
interface GenerateImageParams {
  prompt: string;
  output_path?: string;
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  transparent_background?: boolean;
  moderation?: ModerationLevel;
  sample_count?: number;        // 1-10
  return_base64?: boolean;
  include_thumbnail?: boolean;
}

interface EditImageParams extends GenerateImageParams {
  reference_image_base64?: string;
  reference_image_path?: string;
  mask_image_base64?: string;
  mask_image_path?: string;
  input_fidelity?: InputFidelity;  // gpt-image-1.5 only
}

interface TransformImageParams extends GenerateImageParams {
  reference_image_base64?: string;
  reference_image_path?: string;
  input_fidelity?: InputFidelity;  // gpt-image-1.5 only
}
```

### Batch Interfaces

```typescript
interface BatchJobConfig {
  prompt: string;
  output_path?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  transparent_background?: boolean;
  moderation?: 'auto' | 'low' | 'medium' | 'high';
  sample_count?: number;
  return_base64?: boolean;
}

interface BatchConfig {
  jobs: BatchJobConfig[];          // 1-100 items
  output_dir?: string;
  max_concurrent?: number;         // 1-10, default: 2
  timeout?: number;                // 1000-3600000, default: 600000
  retry_policy?: RetryPolicy;
}

interface RetryPolicy {
  max_retries?: number;            // 0-5, default: 2
  retry_delay_ms?: number;         // 100-60000, default: 5000
  retry_on_errors?: string[];      // ['rate_limit', 'timeout']
}

interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  results: BatchJobResult[];
  started_at: string;              // ISO 8601
  finished_at: string;             // ISO 8601
  total_duration_ms: number;
  total_cost?: number;             // USD
}

interface BatchJobResult {
  job_id: string;
  prompt: string;
  status: BatchJobStatus;
  output_path?: string;
  output_paths?: string[];
  error?: string;
  duration_ms?: number;
  history_uuid?: string;
}
```

---

## Exit Codes

### Batch CLI

| Code | Description |
|------|-------------|
| `0` | Success (all jobs completed) |
| `1` | Configuration/argument error |
| `1` | Some jobs failed (partial success) |
| `1` | Missing API key |
| `1` | Invalid JSON configuration |

### MCP Server

| Code | Description |
|------|-------------|
| `0` | Normal shutdown |
| `1` | Missing `OPENAI_API_KEY` |

---

## Related Documentation

- [Batch Processing Guide](BATCH_PROCESSING.md) - Detailed batch usage guide
- [Environment Variables](ENVIRONMENT_VARIABLES.md) - Complete env var reference
- [History](advanced/history.md) - History database details
- [Metadata](advanced/metadata.md) - Image metadata format
