# OpenAI GPT-Image-1 MCP Server

[![npm version](https://img.shields.io/npm/v/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)

English | [日本語](README.ja.md)

A Model Context Protocol (MCP) server that enables image generation and editing using OpenAI's gpt-image-1 API. Works seamlessly with Claude Desktop, Claude Code, and other MCP-compatible clients.

## Features

### Core Capabilities
- 🎨 **High-Quality Image Generation**: State-of-the-art text-to-image generation
- 📝 **Excellent Text Rendering**: Accurate text rendering within images
- ✂️ **Precise Image Editing**: Inpainting for targeted modifications
- 🔄 **Image Transformation**: Style transfer and reinterpretation
- 📐 **Flexible Sizing**: Square, portrait, and landscape formats
- 🎚️ **Quality Control**: Choose from low, medium, or high quality
- 🖼️ **Multiple Formats**: PNG, JPEG, and WebP support
- 🌐 **Cross-Platform**: Works on macOS, Windows, and Linux with smart path handling

### Advanced Features (v1.0.3+)
- 🎲 **Multi-Image Generation**: Generate 1-10 images in a single request
- 📚 **History Management**: SQLite-based generation history with search
- ⚡ **Async Job System**: Background processing with progress tracking
- 🏷️ **Metadata Embedding**: Automatic metadata in PNG/JPEG files
- 💰 **Cost Management**: Automatic token usage and cost estimation
- 🛡️ **Content Filtering**: Built-in safety filters
- 📁 **Image Management**: List and organize generated images
- 🔧 **Debug Mode**: Detailed logging for troubleshooting

### Batch Processing (v1.0.5+)
- 📦 **CLI Batch Tool**: Generate multiple images at once via command line
- 🔄 **Concurrency Control**: Parallel processing with configurable limits
- 📊 **Cost Estimation**: Preview costs before execution
- ⚙️ **Retry Policy**: Automatic retry for failed jobs
- 📝 **Multiple Output Formats**: Text or JSON results
- 🤖 **GitHub Actions**: Automated batch generation from Issue comments
- 💾 **Batch History**: Track and manage batch executions

## Prerequisites

- **Node.js** v18 or higher
- **OpenAI API Key** with verified organization
- **MCP-compatible client** (Claude Desktop, Claude Code, etc.)

> ⚠️ **Important**: Using gpt-image-1 requires OpenAI Organization Verification.

## Quick Start (5 Minutes)

**Prerequisites:** Node.js 18+, OpenAI API key with verified organization

### 1. Install

```bash
npm install -g openai-gpt-image-mcp-server
```

### 2. Configure

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here"
      }
    }
  }
}
```

> **Windows users**: Use `openai-gpt-image-mcp-server.cmd` as the command.

### 3. Restart Claude Desktop

Completely restart Claude Desktop (quit from system tray/menu bar).

### 4. Test

In Claude, try: `"Generate a beautiful sunset landscape"`

**Done!** For detailed setup and advanced features, see [Full Installation Guide](#installation) below.

---

## Installation

### Quick Install

```bash
npm install -g openai-gpt-image-mcp-server
```

### From Source

```bash
git clone https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER.git
cd openAI-gpt-image-1-MCP-SERVER
npm install
npm run build
```

## Setup

### 1. Get Your OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Log in or create an account
3. **Complete Organization Verification**:
   - Go to [Settings > Organization > General](https://platform.openai.com/settings/organization/general)
   - Click "Verify Organization"
   - Upload government-issued ID
   - Complete facial verification
   - Wait up to 15 minutes for approval
4. Create a new API key in the [API Keys](https://platform.openai.com/api-keys) section
5. Save the key securely

### 2. Configure API Key

Set your API key as an environment variable:

```bash
# Linux/macOS
export OPENAI_API_KEY="sk-proj-..."

# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-proj-..."
```

Or create a `.env` file:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

### 3. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-api-key-here",
        "OPENAI_IMAGE_OUTPUT_DIR": "/Users/username/Pictures/ai-images"
      }
    }
  }
}
```

**Windows users**: Use `openai-gpt-image-mcp-server.cmd` as the command.

**Optional Environment Variables**:
- `OPENAI_IMAGE_OUTPUT_DIR`: Custom output directory (default: `~/Downloads/openai-images`)
- `OPENAI_IMAGE_INPUT_DIR`: Custom input directory (default: same as output directory)
- `OPENAI_IMAGE_EMBED_METADATA`: Enable metadata embedding (`true`/`false`, default: `true`)
- `OPENAI_IMAGE_METADATA_LEVEL`: Metadata detail level (`minimal`/`standard`/`full`, default: `standard`)
- `OPENAI_IMAGE_THUMBNAIL`: Enable thumbnail generation (`true`/`false`, default: `false`)
- `OPENAI_IMAGE_THUMBNAIL_SIZE`: Thumbnail size in pixels (default: `128`, range: 1-512)
- `OPENAI_IMAGE_THUMBNAIL_QUALITY`: Thumbnail JPEG quality (default: `60`, range: 1-100)
- `OPENAI_ORGANIZATION`: OpenAI organization ID (if you belong to multiple)
- `HISTORY_DB_PATH`: Custom database location (default: `~/.openai-gpt-image/history.db`)
- `DEBUG`: Set to `1` for detailed logging

> 📖 **Complete reference**: See [Environment Variables Reference](docs/ENVIRONMENT_VARIABLES.md) for detailed documentation of all variables.

Restart Claude Desktop after saving.

### 4. Configure Claude Code

For Claude Code, use this configuration:

**Windows**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "openai-gpt-image-mcp-server"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-api-key-here"
      }
    }
  }
}
```

**macOS/Linux**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "npx",
      "args": ["-y", "openai-gpt-image-mcp-server"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-api-key-here"
      }
    }
  }
}
```

## Usage Examples

### Basic Image Generation

```
Generate a beautiful sunset landscape
```

### With Size Specification

```
Generate a 1536x1024 wide mountain landscape
```

### With Quality

```
Generate a high-quality image of an astronaut floating in space
```

### Text Rendering

```
Create an image with "WELCOME" written on a large sign
```

### Image Editing

```
Edit this photo's background. Use the mask image to change only
the background to a beautiful beach.
```

### Image Transformation

```
Transform this photo into an oil painting style
```

### Transparent Background

```
Generate an illustration of an apple with a transparent background
```

### Multi-Image Generation (v1.0.3+)

```
Generate 5 different variations of a cyberpunk cityscape
```

### View History (v1.0.3+)

```
Show me my image generation history from the last week
```

### Async Jobs (v1.0.3+)

```
Start a background job to generate 10 high-quality landscape images.
I want to continue working while it processes.
```

## Batch Processing

Generate multiple images at once using the CLI batch tool.

### Quick Start

```bash
# Basic batch generation
openai-gpt-image-batch examples/batch-simple.json

# Estimate cost before execution
openai-gpt-image-batch examples/batch-detailed.json --estimate-only

# JSON output format
openai-gpt-image-batch examples/batch-large-scale.json --format json > result.json
```

### Batch Configuration Example

```json
{
  "jobs": [
    {
      "prompt": "A beautiful sunset over the ocean",
      "output_path": "sunset.png",
      "size": "1536x1024",
      "quality": "high"
    },
    {
      "prompt": "A futuristic city skyline",
      "output_path": "city.png",
      "quality": "medium"
    }
  ],
  "max_concurrent": 3,
  "timeout": 900000
}
```

### CLI Options

```bash
openai-gpt-image-batch <config.json> [options]

Options:
  --output-dir <path>      Output directory
  --format <text|json>     Output format (default: text)
  --timeout <ms>           Timeout in milliseconds
  --max-concurrent <n>     Max concurrent jobs (1-10)
  --estimate-only          Estimate cost without executing
  --help, -h               Show help
  --version, -v            Show version
```

### Features

- **Concurrency Control**: Parallel processing with configurable limits (1-10 concurrent jobs)
- **Cost Estimation**: Preview costs before execution with `--estimate-only`
- **Retry Policy**: Automatic retry for failed jobs (configurable)
- **Multiple Output Formats**: Results in text or JSON format
- **Timeout Management**: Prevent long-running executions
- **Error Handling**: Continue processing even if individual jobs fail
- **GitHub Actions Integration**: Automated batch generation from Issue comments

### Sample Configurations

Four example configurations are included:

1. **batch-simple.json**: Basic batch with 3 images
2. **batch-detailed.json**: Detailed configuration with custom settings (5 images)
3. **batch-multi-variant.json**: Multi-variant generation (3-5 variants per prompt)
4. **batch-large-scale.json**: Large-scale batch processing (10+ images)

### Documentation

For detailed documentation, see [docs/BATCH_PROCESSING.md](docs/BATCH_PROCESSING.md), which includes:
- Comprehensive CLI usage guide
- Batch configuration JSON format
- GitHub Actions integration
- Troubleshooting guide
- Best practices

## Available Tools

### 1. `generate_image`

Generate new images from text prompts.

**Parameters**:
- `prompt` (required): Image description
- `output_path`: Save location (default: `generated_image.png`)
- `size`: `1024x1024`, `1024x1536`, `1536x1024`, or `auto`
- `quality`: `low`, `medium`, `high`, or `auto`
- `output_format`: `png`, `jpeg`, or `webp`
- `transparent_background`: Enable transparency (PNG only)
- `moderation`: Content filtering level
- `sample_count`: Number of images to generate (1-10, default: 1)
- `return_base64`: Return base64-encoded image

### 2. `edit_image`

Edit images using inpainting.

**Parameters**:
- `prompt` (required): Edit description
- `reference_image_base64` or `reference_image_path`: Source image
- `mask_image_base64` or `mask_image_path`: Mask (transparent = edit area)
- `output_path`: Save location
- `sample_count`: Number of images to generate (1-10, default: 1)
- Other parameters same as `generate_image`

### 3. `transform_image`

Transform images to new styles.

**Parameters**:
- `prompt` (required): Transformation description
- `reference_image_base64` or `reference_image_path`: Source image
- `output_path`: Save location
- `sample_count`: Number of images to generate (1-10, default: 1)
- Other parameters same as `generate_image`

### 4. `list_generated_images`

List images in a directory.

**Parameters**:
- `directory`: Path to search (default: current directory)

### 5. `list_history`

Browse generation history with optional filters.

**Parameters**:
- `limit`: Max records (1-100, default: 20)
- `offset`: Skip N records (pagination)
- `tool_name`: Filter by tool (`generate_image`, `edit_image`, `transform_image`)
- `query`: Search in prompts

### 6. `get_history_by_uuid`

Get detailed information about a specific generation.

**Parameters**:
- `uuid` (required): History record UUID

### 7. `start_generation_job`

Start an async image generation job in the background.

**Parameters**:
- `tool_name` (required): Which tool to use
- `prompt` (required): Generation prompt
- Other parameters same as the respective tool

### 8. `check_job_status`

Check the status of an async job.

**Parameters**:
- `job_id` (required): Job ID from `start_generation_job`

### 9. `get_job_result`

Get the result of a completed job.

**Parameters**:
- `job_id` (required): Job ID

### 10. `cancel_job`

Cancel a pending or running job.

**Parameters**:
- `job_id` (required): Job ID to cancel

### 11. `list_jobs`

List async jobs with optional filters.

**Parameters**:
- `status`: Filter by status (`pending`, `running`, `completed`, `failed`, `cancelled`)
- `tool_name`: Filter by tool
- `limit`: Max results (1-100, default: 20)
- `offset`: Skip N results

## Advanced Features

### Multi-Image Generation

All generation tools support the `sample_count` parameter to generate multiple images at once:

```
Generate 5 variations of a cat playing with yarn
```

- Supported range: 1-10 images per request
- Files are automatically numbered: `output_1.png`, `output_2.png`, etc.
- Cost is multiplied by the number of images
- All files are recorded in history

### History Management

Every generation is automatically saved to a local SQLite database (`~/.openai-gpt-image/history.db`):

**View recent history:**
```
Show me the last 10 images I generated
```

**Search history:**
```
Find all images I generated with "sunset" in the prompt
```

**Get details:**
```
Show me the details for this history ID: 8796265a-8dc8-48f4-9b40-fe241985379b
```

The history includes:
- Generation timestamp
- Tool used
- Prompt and parameters
- Output file paths
- Cost information

### Async Job System

For long-running operations or batch processing, use async jobs:

**Start a background job:**
```
Start a background job to generate 10 high-quality space images
```

**Check status:**
```
Check the status of job b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**Get results:**
```
Get the results for job b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**Job statuses:**
- ⏳ `pending`: Waiting to start
- 🔄 `running`: Currently processing
- ✅ `completed`: Finished successfully
- ❌ `failed`: Error occurred
- 🚫 `cancelled`: Manually cancelled

### Metadata Embedding

Generated images automatically include embedded metadata:

**PNG files**: tEXt chunks with:
- `openai_gpt_image_uuid`: Unique identifier
- `params_hash`: SHA-256 hash of parameters
- `tool_name`: Tool used (generate_image, edit_image, transform_image)
- `model`: Model name (gpt-image-1)
- `created_at`: ISO 8601 timestamp
- `size`: Image dimensions (e.g., "1024x1024")
- `quality`: Quality level (low, medium, high)
- `prompt`: Generation prompt (full level only)
- `parameters`: Complete generation parameters (full level only)

**JPEG/WebP files**: EXIF ImageDescription with JSON metadata

**View metadata:**
```bash
# macOS/Linux
exiftool generated_image.png | grep openai

# Windows (PowerShell)
exiftool generated_image.png
```

This allows you to identify how an image was created even after moving it to different locations.

#### Controlling Metadata Embedding

You can control metadata embedding behavior using environment variables:

**Disable metadata embedding entirely:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_EMBED_METADATA": "false"
      }
    }
  }
}
```

**Change metadata detail level:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_METADATA_LEVEL": "minimal"
      }
    }
  }
}
```

**Metadata levels:**

- **`minimal`**: UUID and parameter hash only
  - Best for: Privacy-focused use cases
  - Size impact: Minimal (~100 bytes)
  - Contains: `openai_gpt_image_uuid`, `params_hash`

- **`standard`** (default): Basic generation information
  - Best for: Most use cases, balances detail and privacy
  - Size impact: Small (~300 bytes)
  - Contains: All minimal fields + `tool_name`, `model`, `created_at`, `size`, `quality`

- **`full`**: Complete generation details
  - Best for: Full traceability and reproducibility
  - Size impact: Medium (varies by prompt length, typically 500-2000 bytes)
  - Contains: All standard fields + `prompt`, `parameters`

**Note**: Metadata embedding is "best effort" - if embedding fails, the image is still saved without metadata. Enable `DEBUG=1` to see metadata embedding details.

## Output Path Handling

Images are saved with smart cross-platform path handling:

### Default Behavior

By default, all images are saved to `~/Downloads/openai-images`:
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

### Path Resolution Priority

1. **Absolute paths**: Must be within base directory (security sandboxing)
   ```
   ~/Downloads/openai-images/myimage.png → ✅ saved (within base)
   /tmp/myimage.png → ❌ rejected (outside base)
   ```

2. **Relative paths**: Resolved from base directory
   ```
   myimage.png → ~/Downloads/openai-images/myimage.png
   subfolder/image.png → ~/Downloads/openai-images/subfolder/image.png
   ```

3. **Security**: Path traversal attacks prevented
   ```
   ../other/image.png → ❌ rejected (path traversal)
   ```

4. **Auto-creation**: Parent directories are created automatically

### Custom Output Directory

Set the `OPENAI_IMAGE_OUTPUT_DIR` environment variable:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_OUTPUT_DIR": "/Users/username/Pictures/ai-images"
      }
    }
  }
}
```

Now `myimage.png` will be saved to `/Users/username/Pictures/ai-images/myimage.png`.

## Input Path Handling

Input images (for `edit_image` and `transform_image`) are also managed with security:

### Default Behavior

- Input directory: Same as output directory by default
- Can be customized with `OPENAI_IMAGE_INPUT_DIR` environment variable

### Path Resolution

1. **Relative paths**: Resolved from input base directory
   ```
   photo.png → ~/Downloads/openai-images/photo.png
   source/photo.png → ~/Downloads/openai-images/source/photo.png
   ```

2. **Absolute paths**: Must be within base directory
   ```
   ~/Downloads/openai-images/photo.png → ✅ allowed
   /tmp/photo.png → ❌ rejected (outside base)
   ```

3. **Security**: Same sandboxing as output paths
   - Path traversal prevented
   - System files protected
   - Other user files protected

### Separate Input/Output Directories

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_INPUT_DIR": "~/Pictures/source-images",
        "OPENAI_IMAGE_OUTPUT_DIR": "~/Pictures/generated-images"
      }
    }
  }
}
```

## Cost Management

All operations automatically report:

- Input/output token counts
- Estimated cost in USD
- Cost breakdown (text processing + image generation)
- Parameter details

Example output:
```
📊 Usage Statistics

- Input tokens: 15
- Output tokens (image): 4,096
- Total tokens: 4,111
- Estimated cost: $0.042

💰 Cost breakdown:
  - Text processing: $0.000150
  - Image generation: $0.041850

📏 Parameters: high quality | 1024x1024 | png
```

### Pricing Examples

The following costs are approximate estimates. **Actual pricing may vary**.

| Size | Quality | Approx. Cost |
|------|---------|--------------|
| 1024x1024 | low | $0.01-0.02 |
| 1024x1024 | medium | $0.04-0.07 |
| 1024x1024 | high | $0.17-0.19 |

> **Important**: See [OpenAI Pricing](https://openai.com/api/pricing/) for current official rates.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server won't start | Verify Node.js v18+, check PATH |
| Authentication error | Check `OPENAI_API_KEY` |
| "organization must be verified" | Complete verification at OpenAI Platform |
| Generation fails | Try `moderation: "low"` or refine prompt |
| Edit doesn't work | Ensure mask is transparent PNG |
| File access error (macOS/Windows) | Use absolute paths or set `OPENAI_IMAGE_OUTPUT_DIR` |
| "ENOENT: no such file or directory" | Check path format, try default `~/Downloads/openai-images` |

### Debug Mode

Enable detailed logging:

```bash
DEBUG=1 openai-gpt-image-mcp-server
```

## Security

### API Key Security
- Never commit API keys to version control
- Use environment variables or `.env` files
- Set file permissions: `chmod 600 .env`
- Rotate keys regularly
- Monitor usage at [OpenAI Dashboard](https://platform.openai.com/usage)

### File Access Sandboxing

All file operations (read/write) are restricted to configured base directories:

**Protected system files:**
- **Unix/Linux/macOS**: `/etc/*`, `/var/*`, `/home/other_user/*`, `/root/*`
- **Windows**: `C:\Windows\*`, `C:\Program Files\*`, `C:\Users\OtherUser\*`

**Security features:**
- ✅ Path traversal attack prevention (`../` restrictions)
- ✅ System file protection
- ✅ Other user data protection
- ✅ Operations limited to configured directories only

**To access different directories**, configure base directories:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_IMAGE_OUTPUT_DIR": "/path/to/your/output",
        "OPENAI_IMAGE_INPUT_DIR": "/path/to/your/input"
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run locally
npm start
```

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API](https://platform.openai.com/)
- [Claude Desktop](https://claude.ai/download)

---

**Happy Image Generating! 🎨**
