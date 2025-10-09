# Release Notes v1.0.3 - Cross-Platform File Path Handling

English | [日本語](#リリースノート-v103---クロスプラットフォーム対応のファイルパス処理)

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

---
---

# リリースノート v1.0.3 - クロスプラットフォーム対応のファイルパス処理

[English](#release-notes-v103---cross-platform-file-path-handling) | 日本語

**リリース日**: 2025年10月10日

## 🎯 概要

このリリースでは、Claude Desktop やその他の MCP クライアントにおける、すべてのプラットフォーム（macOS、Windows、Linux）でのファイルパス処理の重大な問題を修正しました。内部コンテナファイルシステムとホストOSファイルシステムの違いにより、画像保存時にエラーが発生していました。

## 🔧 修正内容

### クロスプラットフォーム対応のファイルパス処理

**問題**:
- macOS の Claude Desktop では、`generated_image.png` のような相対パスが失敗していた（内部 Linux コンテナが macOS ファイルシステムにアクセスできないため）
- Windows でもパス形式の違いにより同様の問題が発生
- 生成画像の明確なデフォルト保存場所がなかった

**解決策**:
- 新しいクロスプラットフォーム対応パスユーティリティモジュール（`src/utils/path.ts`）
- スマートなデフォルト出力ディレクトリ: `~/Downloads/openai-images`（全OS対応）
- 親ディレクトリの自動作成
- 絶対パスと相対パスの両方をサポート
- 新しい環境変数: `OPENAI_IMAGE_OUTPUT_DIR` でカスタム出力場所を指定可能

## ✨ 新機能

### 1. デフォルト出力ディレクトリ
すべての画像はデフォルトで `~/Downloads/openai-images` に保存されます：
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

### 2. 環境変数サポート
カスタム出力ディレクトリを設定：
```bash
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/ai-generated"
```

### 3. 柔軟なパス処理
- **絶対パス**: そのまま使用
- **相対パス**: デフォルト/カスタム出力ディレクトリからの相対パスとして解決
- **自動作成**: 親ディレクトリが存在しない場合は自動的に作成

### 4. ユーザーフレンドリーな表示パス
パスは `~` 表記で見やすく表示されます：
```
Image generated successfully: ~/Downloads/openai-images/myimage.png
```

## 📝 変更内容

### 追加
- `src/utils/path.ts`: クロスプラットフォーム対応パスユーティリティ
  - `getDefaultOutputDirectory()`: デフォルト保存場所を取得
  - `normalizeAndValidatePath()`: パスの解決と検証
  - `getDisplayPath()`: 表示用パスのフォーマット
- `CLAUDE.md` に詳細なパス処理手順を追加

### 変更
- `src/tools/generate.ts`: 新しいパスユーティリティを使用
- `src/tools/edit.ts`: 新しいパスユーティリティを使用
- `src/tools/transform.ts`: 新しいパスユーティリティを使用

### 環境変数
- 追加: `OPENAI_IMAGE_OUTPUT_DIR` - カスタム出力ディレクトリ（オプション）

## 🔄 移行ガイド

破壊的変更はありません！既存のコードはそのまま動作します：

**以前の方法（引き続き動作）**:
```typescript
output_path: "/absolute/path/to/image.png"  // 絶対パスは従来通り動作
```

**新しいデフォルト動作**:
```typescript
output_path: "myimage.png"  // ~/Downloads/openai-images/myimage.png に保存されます
```

**カスタムディレクトリ**:
```bash
# claude_desktop_config.json に設定
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

## 🐛 バグ修正

- 修正: macOS の Claude Desktop でのファイルアクセスエラー
- 修正: Windows でのパス解決の問題
- 修正: コンテナ/ホストファイルシステムのアクセス問題
- 修正: 相対パスでの "ENOENT: no such file or directory" エラー

## 📦 インストール

```bash
npm install -g openai-gpt-image-mcp-server@1.0.3
```

既存のインストールを更新する場合:
```bash
npm update -g openai-gpt-image-mcp-server
```

## 🙏 謝辞

macOS Claude Desktop のファイルアクセス問題を報告してくださったコミュニティの皆様に感謝します！

---

**変更履歴の全文**: https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER/compare/v1.0.2...v1.0.3
