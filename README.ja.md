# OpenAI GPT-Image-1 MCP Server

[![npm version](https://img.shields.io/npm/v/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)

[English](README.md) | 日本語

OpenAI の gpt-image-1 API を使用して画像生成・編集を可能にする MCP（Model Context Protocol）サーバーです。Claude Desktop、Claude Code などの MCP 対応クライアントとシームレスに連携します。

## 特徴

- 🎨 **高品質な画像生成**: 最先端のテキストから画像生成
- 📝 **優れたテキストレンダリング**: 画像内のテキストを正確に描画
- ✂️ **精密な画像編集**: インペインティングによる部分編集
- 🔄 **画像変換**: スタイル変換と再解釈
- 📐 **柔軟なサイズ設定**: 正方形、縦長、横長など多様なサイズに対応
- 🎚️ **品質レベル調整**: low、medium、high から選択可能
- 🖼️ **多様な出力形式**: PNG、JPEG、WebP に対応
- 💰 **コスト管理機能**: トークン使用量とコスト推定を自動計算
- 🛡️ **コンテンツフィルタリング**: 安全性フィルターによる適切な画像生成
- 📁 **画像管理**: 生成済み画像の一覧表示
- 🔧 **デバッグモード**: 詳細ログによるトラブルシュート支援
- 🌐 **クロスプラットフォーム対応**: macOS、Windows、Linux でスマートなパス処理

## 前提条件

- **Node.js** v18 以上
- **OpenAI API キー**（組織認証済み）
- **MCP 対応クライアント**（Claude Desktop、Claude Code など）

> ⚠️ **重要**: gpt-image-1 を使用するには、OpenAI 組織の認証（Organization Verification）が必要です。

## インストール

### クイックインストール

```bash
npm install -g openai-gpt-image-mcp-server
```

### ソースからビルド

```bash
git clone https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER.git
cd openAI-gpt-image-1-MCP-SERVER
npm install
npm run build
```

## セットアップ

### 1. OpenAI API キーの取得

1. [OpenAI Platform](https://platform.openai.com/) へアクセス
2. アカウントにログインまたは新規登録
3. **組織認証を完了**:
   - [Settings > Organization > General](https://platform.openai.com/settings/organization/general) へアクセス
   - 「Verify Organization」をクリック
   - 本人確認書類のアップロード（政府発行 ID）
   - 顔認証による本人確認
   - 認証完了まで最大 15 分
4. API Keys ページで新しいシークレットキーを作成
5. キーを安全に保管

### 2. API キーの設定

環境変数として設定：

```bash
# Linux/macOS
export OPENAI_API_KEY="sk-proj-..."

# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-proj-..."
```

または `.env` ファイルに保存：

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

### 3. Claude Desktop の設定

Claude Desktop の設定ファイルに以下を追加：

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

> **Windows ユーザー**: コマンドは `openai-gpt-image-mcp-server.cmd` を使用してください。

**オプションの環境変数**:
- `OPENAI_IMAGE_OUTPUT_DIR`: カスタム出力ディレクトリ（デフォルト: `~/Downloads/openai-images`）
- `OPENAI_ORGANIZATION`: OpenAI 組織 ID（複数組織に所属の場合）
- `DEBUG`: `1` を設定すると詳細ログを有効化

設定保存後、Claude Desktop を**完全に再起動**してください。

### 4. Claude Code での設定

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

## 使用例

### 基本的な画像生成

```
美しい夕日の風景を生成してください
```

### サイズ指定

```
1536x1024 のワイド画面で、山の風景を生成してください
```

### 品質指定

```
高品質で、宇宙空間を漂う宇宙飛行士を生成してください
```

### テキストレンダリング

```
「WELCOME」という文字が大きく書かれた看板の画像を生成してください
```

### 画像編集

```
この写真の背景を変更したいです。
マスク画像を使って、背景だけを美しいビーチに変更してください。
```

### 画像変換

```
この写真を油絵風に変換してください
```

### 透過背景

```
透過背景で、リンゴのイラストを生成してください
```

## 利用可能なツール

### 1. `generate_image` - テキストから画像生成

テキストプロンプトから新しい画像を生成します。

**主なパラメータ**:
- `prompt` (必須): 画像生成プロンプト
- `output_path`: 保存ファイル名（デフォルト: `generated_image.png`）
- `size`: `1024x1024`, `1024x1536`, `1536x1024`, `auto`
- `quality`: `low`, `medium`, `high`, `auto`
- `output_format`: `png`, `jpeg`, `webp`
- `transparent_background`: 透過背景（PNG のみ）
- `moderation`: コンテンツフィルタリング
- `return_base64`: Base64 形式で返却

### 2. `edit_image` - 画像編集（インペインティング）

既存画像の一部を編集・修正します。マスク画像で編集範囲を指定します。

**主なパラメータ**:
- `prompt` (必須): 編集内容の説明
- `reference_image_base64` または `reference_image_path`: 元画像
- `mask_image_base64` または `mask_image_path`: マスク画像（透明部分=編集対象）
- その他のパラメータは `generate_image` と同じ

**マスク画像の仕様**:
- PNG 形式推奨
- 透明（アルファ値 0）の部分が編集対象
- 不透明部分は保持される

### 3. `transform_image` - 画像変換

既存画像をベースに、新しいスタイルや内容の画像を生成します。

**主なパラメータ**:
- `prompt` (必須): 変換指示
- `reference_image_base64` または `reference_image_path`: 参照画像
- その他のパラメータは `generate_image` と同じ

### 4. `list_generated_images` - 画像一覧表示

ディレクトリ内の画像ファイルを一覧表示します。

**パラメータ**:
- `directory`: 検索対象フォルダ（省略時はカレントディレクトリ）

## 出力パスの処理

画像はスマートなクロスプラットフォーム対応パス処理で保存されます：

### デフォルトの動作

デフォルトでは、すべての画像は `~/Downloads/openai-images` に保存されます：
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

### パス解決の優先順位

1. **絶対パス**: そのまま使用
   ```
   /Users/username/Desktop/myimage.png  → そのまま保存
   C:\Users\username\Desktop\myimage.png  → そのまま保存
   ```

2. **相対パス**: デフォルトまたはカスタム出力ディレクトリからの相対パスとして解決
   ```
   myimage.png  → ~/Downloads/openai-images/myimage.png
   subfolder/image.png  → ~/Downloads/openai-images/subfolder/image.png
   ```

3. **自動作成**: 親ディレクトリが存在しない場合は自動的に作成

### カスタム出力ディレクトリ

`OPENAI_IMAGE_OUTPUT_DIR` 環境変数を設定：

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

これで `myimage.png` は `/Users/username/Pictures/ai-images/myimage.png` に保存されます。

## コスト管理

すべての操作で自動的に以下の情報が返却されます：

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

### 料金の目安（2025 年 10 月時点）

| サイズ | 品質 | 概算コスト |
|--------|------|-----------|
| 1024x1024 | low | $0.01-0.02 |
| 1024x1024 | medium | $0.04-0.07 |
| 1024x1024 | high | $0.17-0.19 |

> 最新の料金は [OpenAI 公式料金ページ](https://openai.com/api/pricing/) をご確認ください。

## トラブルシューティング

| 症状 | 解決策 |
|------|-------|
| サーバーが起動しない | Node.js v18+ を確認、PATH を確認 |
| 認証エラー | `OPENAI_API_KEY` を確認 |
| "organization must be verified" | [OpenAI Platform](https://platform.openai.com/settings/organization/general) で組織認証を完了 |
| 画像生成失敗 | プロンプトを具体的に、`moderation: "low"` を試す |
| 画像編集が期待通りでない | マスク画像が透過 PNG 形式か確認 |
| ファイルアクセスエラー (macOS/Windows) | 絶対パスを使用、または `OPENAI_IMAGE_OUTPUT_DIR` を設定 |
| "ENOENT: no such file or directory" | パス形式を確認、デフォルト `~/Downloads/openai-images` を試す |

### デバッグモード

詳細なログを出力するには：

```bash
DEBUG=1 openai-gpt-image-mcp-server
```

## セキュリティ

- API キーは `.gitignore` に追加し、公開リポジトリにコミットしない
- 環境変数または `.env` ファイルで管理
- 定期的にキーをローテーション
- [OpenAI Dashboard](https://platform.openai.com/usage) で使用状況を確認

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# Watch モード
npm run dev

# ローカル実行
npm start
```

## コントリビューション

貢献を歓迎します！Issue や Pull Request をお気軽にどうぞ。

## ライセンス

MIT License - 詳細は LICENSE ファイルを参照

## 謝辞

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API](https://platform.openai.com/)
- [Claude Desktop](https://claude.ai/download)

## リンク

- **npm パッケージ**: https://www.npmjs.com/package/openai-gpt-image-mcp-server
- **GitHub リポジトリ**: https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER
- **詳細ドキュメント**: [CLAUDE.md](CLAUDE.md)

---

**🎨 OpenAI gpt-image-1 で素敵な画像生成を！🚀**
