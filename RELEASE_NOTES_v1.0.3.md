# Release Notes v1.0.3

**Release Date**: 2025-10-10

## 🎯 Overview

This release fixes critical file path handling issues in Claude Desktop and other MCP clients across all platforms (macOS, Windows, Linux). Users were experiencing errors when trying to save images due to differences between the internal container filesystem and the host OS filesystem.

## 🔧 What's Fixed

### Cross-Platform File Path Handling

**Problem**:
- On macOS Claude Desktop, relative paths like `generated_image.png` would fail because the internal Linux container couldn't access macOS filesystem locations
- Similar issues occurred on Windows with path format differences
- No clear default save location for generated images

**Solution**:
- New cross-platform path utility module (`src/utils/path.ts`)
- Smart default output directory: `~/Downloads/openai-images` (works on all OS)
- Automatic parent directory creation
- Support for both absolute and relative paths
- New environment variable: `OPENAI_IMAGE_OUTPUT_DIR` for custom output locations

## ✨ New Features

### 1. Default Output Directory
All images are now saved to `~/Downloads/openai-images` by default:
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

### 2. Environment Variable Support
Set a custom output directory:
```bash
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/ai-generated"
```

### 3. Flexible Path Handling
- **Absolute paths**: Used as-is
- **Relative paths**: Resolved from the default/custom output directory
- **Auto-creation**: Parent directories are created automatically

### 4. User-Friendly Display Paths
Paths are displayed with `~` notation for better readability:
```
Image generated successfully: ~/Downloads/openai-images/myimage.png
```

## 📝 Changes

### Added
- `src/utils/path.ts`: Cross-platform path utilities
  - `getDefaultOutputDirectory()`: Get default save location
  - `normalizeAndValidatePath()`: Resolve and validate paths
  - `getDisplayPath()`: Format paths for display
- Documentation updates in `CLAUDE.md` with detailed path handling instructions

### Modified
- `src/tools/generate.ts`: Use new path utilities
- `src/tools/edit.ts`: Use new path utilities
- `src/tools/transform.ts`: Use new path utilities

### Environment Variables
- Added: `OPENAI_IMAGE_OUTPUT_DIR` - Custom output directory (optional)

## 🔄 Migration Guide

No breaking changes! Existing code continues to work:

**Before (still works)**:
```typescript
output_path: "/absolute/path/to/image.png"  // Absolute paths work as before
```

**New default behavior**:
```typescript
output_path: "myimage.png"  // Now saved to ~/Downloads/openai-images/myimage.png
```

**Custom directory**:
```bash
# Set in claude_desktop_config.json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_OUTPUT_DIR": "/Users/username/Pictures/ai-images"
      }
    }
  }
}
```

## 🐛 Bug Fixes

- Fixed: File access errors in Claude Desktop on macOS
- Fixed: Path resolution issues on Windows
- Fixed: Container/host filesystem access problems
- Fixed: "ENOENT: no such file or directory" errors for relative paths

## 📦 Installation

```bash
npm install -g openai-gpt-image-mcp-server@1.0.3
```

Or update your existing installation:
```bash
npm update -g openai-gpt-image-mcp-server
```

## 🙏 Credits

Special thanks to the community for reporting the macOS Claude Desktop file access issues!

---

**Full Changelog**: https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER/compare/v1.0.2...v1.0.3
