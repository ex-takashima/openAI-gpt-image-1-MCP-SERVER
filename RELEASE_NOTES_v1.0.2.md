# Release v1.0.2

## 🎉 What's New

This release includes critical bug fixes for image editing functionality and improves cross-platform compatibility.

### 🐛 Bug Fixes

- **Fixed image editing API calls**: Resolved `400 Invalid type for 'image'` error by properly converting images to File objects with correct MIME types
- **Fixed MIME type detection**: Images are now sent with proper MIME types (`image/png`, `image/jpeg`, `image/webp`) instead of `application/octet-stream`
- **Improved cross-platform path handling**: Using `path.basename()` for safer path operations across Windows, macOS, and Linux

### ✨ Improvements

- **New MIME type utility**: Added automatic MIME type detection based on file extensions
- **Better error messages**: More descriptive error logging for debugging
- **Cross-platform compatibility**: Enhanced path handling works seamlessly on all operating systems

### 📦 Technical Changes

- Added `src/utils/mime.ts` for MIME type detection
- Updated `edit_image` to use File objects with proper MIME types
- Updated `transform_image` to use File objects with proper MIME types
- Replaced manual path splitting with `path.basename()` for better cross-platform support
- Changed from `fs.createReadStream()` to `fs.readFile()` with `toFile()` helper

### 🔧 Files Changed

- `src/utils/mime.ts` - New utility for MIME type detection
- `src/tools/edit.ts` - Fixed File object creation with proper MIME types
- `src/tools/transform.ts` - Fixed File object creation with proper MIME types
- `package.json` - Version bump to 1.0.2, added author information

## 📝 Breaking Changes

None. This release is fully backward compatible with v1.0.1.

## 🚀 How to Upgrade

### For Global Installation

```bash
npm install -g openai-gpt-image-mcp-server@1.0.2
```

### For MCP Configuration (Claude Desktop/Code)

Update your MCP configuration to use the latest version:

**NPX (Recommended)**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "npx",
      "args": ["-y", "openai-gpt-image-mcp-server@1.0.2"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-..."
      }
    }
  }
}
```

**Global Install**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-..."
      }
    }
  }
}
```

Restart Claude Desktop/Code after updating.

## 🙏 Acknowledgments

Thank you to all users who reported issues and provided feedback!

---

## 🇯🇵 日本語版リリースノート

## 🎉 新機能

このリリースでは、画像編集機能の重大なバグ修正とクロスプラットフォーム互換性の向上が含まれています。

### 🐛 バグ修正

- **画像編集 API 呼び出しの修正**: 適切な MIME タイプを持つ File オブジェクトへの変換により、`400 Invalid type for 'image'` エラーを解決
- **MIME タイプ検出の修正**: 画像が `application/octet-stream` ではなく、適切な MIME タイプ（`image/png`、`image/jpeg`、`image/webp`）で送信されるように修正
- **クロスプラットフォームパス処理の改善**: Windows、macOS、Linux 全体でより安全なパス操作のために `path.basename()` を使用

### ✨ 改善点

- **新しい MIME タイプユーティリティ**: ファイル拡張子に基づく自動 MIME タイプ検出を追加
- **より良いエラーメッセージ**: デバッグのためのより詳細なエラーログ
- **クロスプラットフォーム互換性**: すべてのオペレーティングシステムでシームレスに動作する強化されたパス処理

### 📦 技術的な変更

- MIME タイプ検出のための `src/utils/mime.ts` を追加
- 適切な MIME タイプを持つ File オブジェクトを使用するように `edit_image` を更新
- 適切な MIME タイプを持つ File オブジェクトを使用するように `transform_image` を更新
- より良いクロスプラットフォームサポートのために、手動パス分割を `path.basename()` に置き換え
- `toFile()` ヘルパーを使った `fs.readFile()` に `fs.createReadStream()` から変更

### 🔧 変更されたファイル

- `src/utils/mime.ts` - MIME タイプ検出用の新しいユーティリティ
- `src/tools/edit.ts` - 適切な MIME タイプでの File オブジェクト作成を修正
- `src/tools/transform.ts` - 適切な MIME タイプでの File オブジェクト作成を修正
- `package.json` - バージョンを 1.0.2 にバンプ、作者情報を追加

## 📝 破壊的変更

なし。このリリースは v1.0.1 と完全に後方互換性があります。

## 🚀 アップグレード方法

### グローバルインストールの場合

```bash
npm install -g openai-gpt-image-mcp-server@1.0.2
```

### MCP 設定の場合（Claude Desktop/Code）

最新バージョンを使用するように MCP 設定を更新してください：

**NPX（推奨）**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "npx",
      "args": ["-y", "openai-gpt-image-mcp-server@1.0.2"],
      "env": {
        "OPENAI_API_KEY": "sk-proj-..."
      }
    }
  }
}
```

**グローバルインストール**:
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-..."
      }
    }
  }
}
```

更新後、Claude Desktop/Code を再起動してください。

## 🙏 謝辞

問題を報告し、フィードバックを提供してくださったすべてのユーザーに感謝します！

---

**Full Changelog**: https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER/compare/v1.0.1...v1.0.2
