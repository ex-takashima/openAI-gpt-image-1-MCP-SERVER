# OpenAI GPT-Image-1 MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that enables image generation and editing using OpenAI's gpt-image-1 API. Works seamlessly with Claude Desktop, Claude Code, and other MCP-compatible clients.

## Features

- 🎨 **High-Quality Image Generation**: State-of-the-art text-to-image generation
- 📝 **Excellent Text Rendering**: Accurate text rendering within images
- ✂️ **Precise Image Editing**: Inpainting for targeted modifications
- 🔄 **Image Transformation**: Style transfer and reinterpretation
- 📐 **Flexible Sizing**: Square, portrait, and landscape formats
- 🎚️ **Quality Control**: Choose from low, medium, or high quality
- 🖼️ **Multiple Formats**: PNG, JPEG, and WebP support
- 💰 **Cost Management**: Automatic token usage and cost estimation
- 🛡️ **Content Filtering**: Built-in safety filters
- 📁 **Image Management**: List and organize generated images
- 🔧 **Debug Mode**: Detailed logging for troubleshooting

## Prerequisites

- **Node.js** v18 or higher
- **OpenAI API Key** with verified organization
- **MCP-compatible client** (Claude Desktop, Claude Code, etc.)

> ⚠️ **Important**: Using gpt-image-1 requires OpenAI Organization Verification.

## Installation

### Quick Install

```bash
npm install -g openai-gpt-image-mcp-server
```

### From Source

```bash
git clone <repository-url>
cd openai-gpt-image-mcp-server
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
        "OPENAI_API_KEY": "sk-proj-your-api-key-here"
      }
    }
  }
}
```

**Windows users**: Use `openai-gpt-image-mcp-server.cmd` as the command.

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
- `return_base64`: Return base64-encoded image

### 2. `edit_image`

Edit images using inpainting.

**Parameters**:
- `prompt` (required): Edit description
- `reference_image_base64` or `reference_image_path`: Source image
- `mask_image_base64` or `mask_image_path`: Mask (transparent = edit area)
- `output_path`: Save location
- Other parameters same as `generate_image`

### 3. `transform_image`

Transform images to new styles.

**Parameters**:
- `prompt` (required): Transformation description
- `reference_image_base64` or `reference_image_path`: Source image
- `output_path`: Save location
- Other parameters same as `generate_image`

### 4. `list_generated_images`

List images in a directory.

**Parameters**:
- `directory`: Path to search (default: current directory)

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

### Pricing (as of October 2025)

| Size | Quality | Approx. Cost |
|------|---------|--------------|
| 1024x1024 | low | $0.01-0.02 |
| 1024x1024 | medium | $0.04-0.07 |
| 1024x1024 | high | $0.17-0.19 |

> See [OpenAI Pricing](https://openai.com/api/pricing/) for current rates.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server won't start | Verify Node.js v18+, check PATH |
| Authentication error | Check `OPENAI_API_KEY` |
| "organization must be verified" | Complete verification at OpenAI Platform |
| Generation fails | Try `moderation: "low"` or refine prompt |
| Edit doesn't work | Ensure mask is transparent PNG |

### Debug Mode

Enable detailed logging:

```bash
DEBUG=1 openai-gpt-image-mcp-server
```

## Security

- Never commit API keys to version control
- Use environment variables or `.env` files
- Set file permissions: `chmod 600 .env`
- Rotate keys regularly
- Monitor usage at [OpenAI Dashboard](https://platform.openai.com/usage)

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
