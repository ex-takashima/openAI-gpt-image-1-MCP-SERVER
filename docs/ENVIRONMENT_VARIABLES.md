# Environment Variables Reference

Complete reference for all environment variables supported by OpenAI GPT-Image-1 MCP Server.

---

## Quick Reference Table

| Variable Name | Type | Default | Description |
|--------------|------|---------|-------------|
| `OPENAI_API_KEY` | ✅ Required | - | OpenAI API key (sk-proj-... format) |
| `OPENAI_ORGANIZATION` | Optional | - | OpenAI organization ID (if you belong to multiple) |
| `OPENAI_IMAGE_OUTPUT_DIR` | Optional | `~/Downloads/openai-images` | Output directory for generated images |
| `OPENAI_IMAGE_INPUT_DIR` | Optional | Same as output dir | Input directory for reading source images |
| `OPENAI_IMAGE_EMBED_METADATA` | Optional | `true` | Enable metadata embedding in images |
| `OPENAI_IMAGE_METADATA_LEVEL` | Optional | `standard` | Metadata detail level (`minimal`, `standard`, `full`) |
| `OPENAI_IMAGE_THUMBNAIL` | Optional | `false` | Enable thumbnail generation |
| `OPENAI_IMAGE_THUMBNAIL_SIZE` | Optional | `128` | Thumbnail size in pixels (1-512) |
| `OPENAI_IMAGE_THUMBNAIL_QUALITY` | Optional | `60` | Thumbnail JPEG quality (1-100) |
| `HISTORY_DB_PATH` | Optional | `{OUTPUT_DIR}/data/openai-gpt-image.db` | Custom database location for history |
| `DEBUG` | Optional | - | Set to `1` to enable detailed logging |

---

## Categories

### Authentication

#### `OPENAI_API_KEY` ✅ Required

Your OpenAI API key used to authenticate with the API.

**Format:** `sk-proj-...` (project-based key recommended)

**How to obtain:**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Complete organization verification
3. Create a new API key in [API Keys](https://platform.openai.com/api-keys) section

**Security notes:**
- Never commit this key to version control
- Add to `.gitignore` if storing in a `.env` file
- Rotate keys regularly
- Set file permissions: `chmod 600 .env` (Unix/Linux/macOS)

**Example:**
```bash
export OPENAI_API_KEY="sk-proj-abc123..."
```

#### `OPENAI_ORGANIZATION` Optional

OpenAI organization ID to use for API requests. Only required if you belong to multiple organizations.

**Format:** `org-...`

**How to obtain:**
1. Visit [OpenAI Platform > Settings > Organization](https://platform.openai.com/settings/organization)
2. Copy the organization ID

**Example:**
```bash
export OPENAI_ORGANIZATION="org-xyz789..."
```

---

### Path Configuration

#### `OPENAI_IMAGE_OUTPUT_DIR` Optional

Base directory where generated images are saved.

**Default:** `~/Downloads/openai-images`
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

**Notes:**
- Supports tilde expansion (`~` → home directory)
- Directory is created automatically if it doesn't exist
- All output paths are resolved relative to this directory (unless absolute paths are used)
- Security: All file operations are sandboxed to this directory to prevent unauthorized access

**Examples:**
```bash
# Unix/Linux/macOS
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/ai-generated"

# Windows (PowerShell)
$env:OPENAI_IMAGE_OUTPUT_DIR="C:\Users\username\Pictures\ai-generated"
```

**MCP Configuration:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_IMAGE_OUTPUT_DIR": "/Users/username/Pictures/ai-images"
      }
    }
  }
}
```

#### `OPENAI_IMAGE_INPUT_DIR` Optional

Base directory for reading input images (used in `edit_image` and `transform_image` tools).

**Default:** Same as `OPENAI_IMAGE_OUTPUT_DIR`

**Notes:**
- Supports tilde expansion
- Security: File access is sandboxed to this directory
- Can be different from output directory for organizing source vs. generated images

**Example:**
```bash
export OPENAI_IMAGE_INPUT_DIR="$HOME/Pictures/source-images"
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/generated-images"
```

**Use case:** Separate source images from generated images for better organization.

---

### Metadata Configuration

#### `OPENAI_IMAGE_EMBED_METADATA` Optional

Enable or disable metadata embedding in generated images.

**Type:** Boolean (`true`, `false`, or `0`)

**Default:** `true`

**Behavior:**
- `true` / `1`: Embed metadata according to `OPENAI_IMAGE_METADATA_LEVEL`
- `false` / `0`: Disable metadata embedding entirely

**Why disable?**
- Privacy concerns (don't want to store prompts in images)
- Minimal file size requirements
- Images will be processed by tools that strip metadata anyway

**Example:**
```bash
# Disable metadata embedding
export OPENAI_IMAGE_EMBED_METADATA="false"
```

**MCP Configuration:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_IMAGE_EMBED_METADATA": "false"
      }
    }
  }
}
```

#### `OPENAI_IMAGE_METADATA_LEVEL` Optional

Control how much metadata is embedded in images.

**Type:** String (`minimal`, `standard`, `full`)

**Default:** `standard`

**Levels:**

1. **`minimal`** - UUID and parameter hash only
   - **Best for:** Privacy-focused use cases
   - **Size impact:** ~100 bytes
   - **Contains:**
     - `openai_gpt_image_uuid` - Unique identifier
     - `params_hash` - SHA-256 hash of generation parameters

2. **`standard`** (default) - Basic generation information
   - **Best for:** Most use cases, balances detail and privacy
   - **Size impact:** ~300 bytes
   - **Contains:** All minimal fields plus:
     - `tool_name` - Tool used (generate_image, edit_image, transform_image)
     - `model` - Model name (gpt-image-1)
     - `created_at` - ISO 8601 timestamp
     - `size` - Image dimensions (e.g., "1024x1024")
     - `quality` - Quality level (low, medium, high)

3. **`full`** - Complete generation details
   - **Best for:** Full traceability and reproducibility
   - **Size impact:** 500-2000 bytes (varies by prompt length)
   - **Contains:** All standard fields plus:
     - `prompt` - Full generation prompt
     - `parameters` - Complete JSON of all parameters used

**Examples:**
```bash
# Minimal metadata for privacy
export OPENAI_IMAGE_METADATA_LEVEL="minimal"

# Full metadata for complete traceability
export OPENAI_IMAGE_METADATA_LEVEL="full"
```

**Reading metadata:**
```bash
# Using exiftool (install from https://exiftool.org/)
exiftool generated_image.png | grep openai

# View all metadata
exiftool generated_image.png
```

---

### Thumbnail Configuration

#### `OPENAI_IMAGE_THUMBNAIL` Optional

Enable thumbnail generation alongside the main image.

**Type:** Boolean (`true`, `false`)

**Default:** `false`

**Behavior:**
- When enabled, a small preview image is generated
- Thumbnail filename: `{original_name}_thumb.jpg`
- Useful for creating image galleries, listings, or previews

**Example:**
```bash
export OPENAI_IMAGE_THUMBNAIL="true"
```

#### `OPENAI_IMAGE_THUMBNAIL_SIZE` Optional

Maximum dimension (width or height) for thumbnail images in pixels.

**Type:** Integer (1-512)

**Default:** `128`

**Notes:**
- Maintains aspect ratio
- Larger thumbnails = better quality but larger file size
- Common sizes: 64 (small), 128 (medium), 256 (large)

**Example:**
```bash
export OPENAI_IMAGE_THUMBNAIL_SIZE="256"
```

#### `OPENAI_IMAGE_THUMBNAIL_QUALITY` Optional

JPEG quality for thumbnail images.

**Type:** Integer (1-100)

**Default:** `60`

**Notes:**
- Higher quality = less compression = larger file size
- 60-80 is typically a good balance for thumbnails
- 90+ for high-quality thumbnails

**Example:**
```bash
export OPENAI_IMAGE_THUMBNAIL_QUALITY="80"
```

**Complete thumbnail configuration:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_IMAGE_THUMBNAIL": "true",
        "OPENAI_IMAGE_THUMBNAIL_SIZE": "256",
        "OPENAI_IMAGE_THUMBNAIL_QUALITY": "75"
      }
    }
  }
}
```

---

### Advanced Configuration

#### `HISTORY_DB_PATH` Optional

Custom location for the SQLite history database.

**Default:** `{OPENAI_IMAGE_OUTPUT_DIR}/data/openai-gpt-image.db`

**Notes:**
- Supports tilde expansion
- Parent directory is created automatically
- Useful for separating data from images or using a shared database

**Example:**
```bash
export HISTORY_DB_PATH="$HOME/.openai-gpt-image/history.db"
```

#### `DEBUG` Optional

Enable detailed debug logging.

**Type:** String (any truthy value like `1`, `true`, `yes`)

**Default:** disabled

**Behavior:**
- Prints detailed request/response information
- Shows metadata embedding details
- Logs path resolution steps
- Useful for troubleshooting issues

**Example:**
```bash
DEBUG=1 openai-gpt-image-mcp-server
```

**MCP Configuration:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "DEBUG": "1"
      }
    }
  }
}
```

---

## Configuration Examples

### Minimal Configuration

Just the essentials to get started:

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

### Privacy-Focused Configuration

Minimal metadata embedding:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here",
        "OPENAI_IMAGE_METADATA_LEVEL": "minimal"
      }
    }
  }
}
```

### Production Configuration

Full traceability with organized paths:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here",
        "OPENAI_IMAGE_OUTPUT_DIR": "/var/app/generated-images",
        "OPENAI_IMAGE_INPUT_DIR": "/var/app/source-images",
        "OPENAI_IMAGE_METADATA_LEVEL": "full",
        "OPENAI_IMAGE_THUMBNAIL": "true",
        "OPENAI_IMAGE_THUMBNAIL_SIZE": "256",
        "HISTORY_DB_PATH": "/var/app/data/history.db"
      }
    }
  }
}
```

### Development Configuration

Debug mode enabled with custom paths:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here",
        "OPENAI_IMAGE_OUTPUT_DIR": "./test-output",
        "DEBUG": "1"
      }
    }
  }
}
```

### Gallery/Website Configuration

Thumbnails enabled for image galleries:

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-key-here",
        "OPENAI_IMAGE_OUTPUT_DIR": "/var/www/html/images/generated",
        "OPENAI_IMAGE_THUMBNAIL": "true",
        "OPENAI_IMAGE_THUMBNAIL_SIZE": "200",
        "OPENAI_IMAGE_THUMBNAIL_QUALITY": "75"
      }
    }
  }
}
```

---

## Platform-Specific Notes

### macOS

**Config file location:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Path examples:**
```bash
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/AI-Images"
# Expands to: /Users/username/Pictures/AI-Images
```

### Windows

**Config file location:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Command for MCP server:**
Use `.cmd` extension: `openai-gpt-image-mcp-server.cmd`

**Path examples:**
```powershell
$env:OPENAI_IMAGE_OUTPUT_DIR="C:\Users\username\Pictures\AI-Images"
```

**JSON config paths (forward slashes work):**
```json
{
  "env": {
    "OPENAI_IMAGE_OUTPUT_DIR": "C:/Users/username/Pictures/AI-Images"
  }
}
```

### Linux

**Config file location:**
```
~/.config/Claude/claude_desktop_config.json
```

**Path examples:**
```bash
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/AI-Images"
# Expands to: /home/username/Pictures/AI-Images
```

---

## Security Considerations

### API Key Security

- **Never** commit API keys to version control
- Use `.gitignore` to exclude `.env` files
- Set restrictive file permissions: `chmod 600 .env`
- Rotate keys periodically
- Monitor usage at [OpenAI Dashboard](https://platform.openai.com/usage)

### Path Sandboxing

All file operations are restricted to configured base directories:

**Protected system paths:**
- **Unix/Linux/macOS**: `/etc/*`, `/var/*`, `/root/*`, `/home/other_user/*`
- **Windows**: `C:\Windows\*`, `C:\Program Files\*`, `C:\Users\OtherUser\*`

**Security features:**
- ✅ Path traversal attack prevention (`../` restrictions)
- ✅ System file protection
- ✅ Other user data protection
- ✅ Operations limited to configured directories

**To change accessible directories**, explicitly configure base directories:
```json
{
  "env": {
    "OPENAI_IMAGE_OUTPUT_DIR": "/your/safe/output/directory",
    "OPENAI_IMAGE_INPUT_DIR": "/your/safe/input/directory"
  }
}
```

---

## Troubleshooting

### Environment variable not recognized

**Symptoms:**
- API key not found
- Images saved to wrong location

**Solutions:**
1. Restart MCP server/Claude Desktop after setting variables
2. Verify environment variable syntax (no spaces around `=` in bash)
3. Check config file JSON syntax with a validator

### Path issues

**Symptoms:**
- "ENOENT: no such file or directory"
- Permission denied errors

**Solutions:**
1. Use absolute paths or tilde expansion (`~`)
2. Verify directory exists or can be created
3. Check file permissions: `ls -la /path/to/directory`
4. Ensure directory is within configured base directory (sandboxing)

### Metadata not embedding

**Symptoms:**
- `exiftool` shows no OpenAI metadata

**Solutions:**
1. Verify `OPENAI_IMAGE_EMBED_METADATA` is not set to `false`
2. Check file format supports metadata (PNG, JPEG, WebP)
3. Enable debug mode: `DEBUG=1` to see embedding details
4. Note: Metadata embedding is "best effort" - failures don't prevent image saving

---

## See Also

- [README.md](../README.md) - Main documentation
- [README.ja.md](../README.ja.md) - 日本語ドキュメント
- [Advanced Path Configuration](advanced/path-configuration.md)
- [Metadata Embedding Guide](advanced/metadata.md)
- [History Management](advanced/history.md)
- [Thumbnail Configuration](advanced/thumbnail.md)

---

**Updated:** 2025-10-17
