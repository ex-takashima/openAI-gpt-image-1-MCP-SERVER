# OpenAI GPT-Image-1 MCP Server

[![npm version](https://img.shields.io/npm/v/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/openai-gpt-image-mcp-server.svg)](https://www.npmjs.com/package/openai-gpt-image-mcp-server)

[English](README.md) | 日本語

OpenAI の gpt-image-1 API を使用して画像生成・編集を可能にする MCP（Model Context Protocol）サーバーです。Claude Desktop、Claude Code などの MCP 対応クライアントとシームレスに連携します。

## 特徴

### コア機能
- 🎨 **高品質な画像生成**: 最先端のテキストから画像生成
- 📝 **優れたテキストレンダリング**: 画像内のテキストを正確に描画
- ✂️ **精密な画像編集**: インペインティングによる部分編集
- 🔄 **画像変換**: スタイル変換と再解釈
- 📐 **柔軟なサイズ設定**: 正方形、縦長、横長など多様なサイズに対応
- 🎚️ **品質レベル調整**: low、medium、high から選択可能
- 🖼️ **多様な出力形式**: PNG、JPEG、WebP に対応
- 🌐 **クロスプラットフォーム対応**: macOS、Windows、Linux でスマートなパス処理

### 高度な機能 (v1.0.3+)
- 🎲 **複数画像一括生成**: 1回のリクエストで1-10枚の画像を生成
- 📚 **履歴管理**: SQLiteベースの生成履歴と検索機能
- ⚡ **非同期ジョブシステム**: バックグラウンド処理と進捗追跡
- 🏷️ **メタデータ埋め込み**: PNG/JPEGファイルへの自動メタデータ埋め込み
- 💰 **コスト管理機能**: トークン使用量とコスト推定を自動計算
- 🛡️ **コンテンツフィルタリング**: 安全性フィルターによる適切な画像生成
- 📁 **画像管理**: 生成済み画像の一覧表示
- 🔧 **デバッグモード**: 詳細ログによるトラブルシュート支援

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
4. [API Keys](https://platform.openai.com/api-keys) ページで新しいシークレットキーを作成
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

**Windows ユーザー**: コマンドは `openai-gpt-image-mcp-server.cmd` を使用してください。

**オプションの環境変数**:
- `OPENAI_IMAGE_OUTPUT_DIR`: カスタム出力ディレクトリ（デフォルト: `~/Downloads/openai-images`）
- `OPENAI_IMAGE_INPUT_DIR`: カスタム入力ディレクトリ（デフォルト: 出力ディレクトリと同じ）
- `OPENAI_IMAGE_THUMBNAIL`: サムネイル生成を有効化（`true`/`false`、デフォルト: `false`）
- `OPENAI_IMAGE_THUMBNAIL_SIZE`: サムネイルサイズ（ピクセル、デフォルト: `128`、範囲: 1-512）
- `OPENAI_IMAGE_THUMBNAIL_QUALITY`: サムネイルJPEG品質（デフォルト: `60`、範囲: 1-100）
- `OPENAI_ORGANIZATION`: OpenAI 組織 ID（複数組織に所属の場合）
- `HISTORY_DB_PATH`: カスタムデータベース場所（デフォルト: `~/.openai-gpt-image/history.db`）
- `DEBUG`: `1` を設定すると詳細ログを有効化

設定保存後、Claude Desktop を**完全に再起動**してください。

### 4. Claude Code での設定

Claude Code では以下の設定を使用：

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

### 複数画像生成 (v1.0.3+)

```
サイバーパンクな都市の画像を5パターン生成してください
```

### 履歴表示 (v1.0.3+)

```
先週生成した画像の履歴を表示してください
```

### 非同期ジョブ (v1.0.3+)

```
バックグラウンドで高品質な風景画を10枚生成してください。
その間に別の作業をしたいです。
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
- `sample_count`: 生成枚数（1-10、デフォルト: 1）
- `return_base64`: Base64 形式で返却

### 2. `edit_image` - 画像編集

既存画像の一部を編集・修正します。

**主なパラメータ**:
- `prompt` (必須): 編集内容の説明
- `reference_image_base64` または `reference_image_path`: 元画像
- `mask_image_base64` または `mask_image_path`: マスク画像（透明部分=編集対象）
- `output_path`: 保存場所
- `sample_count`: 生成枚数（1-10、デフォルト: 1）
- その他のパラメータは `generate_image` と同じ

### 3. `transform_image` - 画像変換

既存画像を新しいスタイルに変換します。

**主なパラメータ**:
- `prompt` (必須): 変換指示
- `reference_image_base64` または `reference_image_path`: 参照画像
- `output_path`: 保存場所
- `sample_count`: 生成枚数（1-10、デフォルト: 1）
- その他のパラメータは `generate_image` と同じ

### 4. `list_generated_images` - 画像一覧表示

ディレクトリ内の画像ファイルを一覧表示します。

**パラメータ**:
- `directory`: 検索対象フォルダ（省略時はカレントディレクトリ）

### 5. `list_history` - 履歴一覧

生成履歴をフィルター付きで表示します。

**パラメータ**:
- `limit`: 最大レコード数（1-100、デフォルト: 20）
- `offset`: スキップするレコード数（ページネーション用）
- `tool_name`: ツールでフィルター（`generate_image`, `edit_image`, `transform_image`）
- `query`: プロンプト内を検索

### 6. `get_history_by_uuid` - 履歴詳細取得

特定の生成履歴の詳細情報を取得します。

**パラメータ**:
- `uuid` (必須): 履歴レコードのUUID

### 7. `start_generation_job` - 非同期ジョブ開始

バックグラウンドで画像生成ジョブを開始します。

**パラメータ**:
- `tool_name` (必須): 使用するツール
- `prompt` (必須): 生成プロンプト
- その他のパラメータは各ツールと同じ

### 8. `check_job_status` - ジョブ状態確認

非同期ジョブの状態を確認します。

**パラメータ**:
- `job_id` (必須): `start_generation_job` から返されたジョブID

### 9. `get_job_result` - ジョブ結果取得

完了したジョブの結果を取得します。

**パラメータ**:
- `job_id` (必須): ジョブID

### 10. `cancel_job` - ジョブキャンセル

実行中または待機中のジョブをキャンセルします。

**パラメータ**:
- `job_id` (必須): キャンセルするジョブID

### 11. `list_jobs` - ジョブ一覧

非同期ジョブをフィルター付きで一覧表示します。

**パラメータ**:
- `status`: ステータスでフィルター（`pending`, `running`, `completed`, `failed`, `cancelled`）
- `tool_name`: ツールでフィルター
- `limit`: 最大結果数（1-100、デフォルト: 20）
- `offset`: スキップする結果数

## 高度な機能

### 複数画像一括生成

すべての生成ツールで `sample_count` パラメータを使用して複数画像を一度に生成できます：

```
毛糸で遊ぶ猫の画像を5パターン生成してください
```

- サポート範囲: 1リクエストで1-10枚
- ファイルは自動的に番号付け: `output_1.png`, `output_2.png`, など
- コストは画像枚数に比例
- すべてのファイルが履歴に記録されます

### 履歴管理

すべての生成は自動的にローカル SQLite データベース（`~/.openai-gpt-image/history.db`）に保存されます：

**最近の履歴を表示:**
```
最近生成した画像を10件表示してください
```

**履歴を検索:**
```
「夕日」というキーワードで生成した画像を検索してください
```

**詳細を取得:**
```
この履歴IDの詳細を表示してください: 8796265a-8dc8-48f4-9b40-fe241985379b
```

履歴には以下が含まれます：
- 生成タイムスタンプ
- 使用したツール
- プロンプトとパラメータ
- 出力ファイルパス
- コスト情報

### 非同期ジョブシステム

長時間の処理やバッチ処理には非同期ジョブを使用：

**バックグラウンドジョブ開始:**
```
バックグラウンドで高品質な宇宙画像を10枚生成してください
```

**状態確認:**
```
ジョブ b7912655-0d8e-4ecc-be58-cbc2c4746932 の状態を確認してください
```

**結果取得:**
```
ジョブ b7912655-0d8e-4ecc-be58-cbc2c4746932 の結果を取得してください
```

**ジョブステータス:**
- ⏳ `pending`: 開始待ち
- 🔄 `running`: 実行中
- ✅ `completed`: 正常完了
- ❌ `failed`: エラー発生
- 🚫 `cancelled`: 手動キャンセル

### メタデータ埋め込み

生成された画像には自動的にメタデータが埋め込まれます：

**PNG ファイル**: tEXt チャンクに以下を含む:
- `MCP-Tool`: 使用したツール
- `MCP-Prompt`: 生成プロンプト
- `MCP-Model`: モデル名（gpt-image-1）
- `MCP-Created`: タイムスタンプ
- `MCP-Size`, `MCP-Quality`, `MCP-Format`
- `MCP-History-UUID`: 履歴レコードへのリンク

**JPEG ファイル**: EXIF UserComment に JSON メタデータ

**メタデータを表示:**
```bash
# macOS/Linux
exiftool generated_image.png | grep MCP

# Windows (PowerShell)
exiftool generated_image.png
```

これにより、画像を別の場所に移動しても、どのように作成されたかを特定できます。

## 出力パスの処理

画像はスマートなクロスプラットフォーム対応パス処理で保存されます：

### デフォルトの動作

デフォルトでは、すべての画像は `~/Downloads/openai-images` に保存されます：
- **macOS**: `/Users/username/Downloads/openai-images/`
- **Windows**: `C:\Users\username\Downloads\openai-images\`
- **Linux**: `/home/username/Downloads/openai-images/`

### パス解決の優先順位

1. **絶対パス**: ベースディレクトリ内である必要あり（セキュリティサンドボックス）
   ```
   ~/Downloads/openai-images/myimage.png → ✅ 保存（ベース内）
   /tmp/myimage.png → ❌ 拒否（ベース外）
   ```

2. **相対パス**: ベースディレクトリからの相対パスとして解決
   ```
   myimage.png → ~/Downloads/openai-images/myimage.png
   subfolder/image.png → ~/Downloads/openai-images/subfolder/image.png
   ```

3. **セキュリティ**: パストラバーサル攻撃を防止
   ```
   ../other/image.png → ❌ 拒否（パストラバーサル）
   ```

4. **自動作成**: 親ディレクトリが自動的に作成されます

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

## 入力パスの処理

入力画像（`edit_image` と `transform_image` 用）もセキュリティ管理されています：

### デフォルトの動作

- 入力ディレクトリ: デフォルトで出力ディレクトリと同じ
- `OPENAI_IMAGE_INPUT_DIR` 環境変数でカスタマイズ可能

### パス解決

1. **相対パス**: 入力ベースディレクトリからの相対パスとして解決
   ```
   photo.png → ~/Downloads/openai-images/photo.png
   source/photo.png → ~/Downloads/openai-images/source/photo.png
   ```

2. **絶対パス**: ベースディレクトリ内である必要あり
   ```
   ~/Downloads/openai-images/photo.png → ✅ 許可
   /tmp/photo.png → ❌ 拒否（ベース外）
   ```

3. **セキュリティ**: 出力パスと同じサンドボックス化
   - パストラバーサル防止
   - システムファイル保護
   - 他ユーザーファイル保護

### 入力/出力ディレクトリの分離

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

## コスト管理

すべての操作で自動的に以下の情報が返却されます：

- 入力/出力トークン数
- 推定コスト（USD）
- コスト内訳（テキスト処理 + 画像生成）
- パラメータ詳細

出力例:
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

### 料金の目安（2025年10月時点）

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

### API キーセキュリティ
- API キーは `.gitignore` に追加し、公開リポジトリにコミットしない
- 環境変数または `.env` ファイルで管理
- ファイル権限を設定: `chmod 600 .env`
- 定期的にキーをローテーション
- [OpenAI Dashboard](https://platform.openai.com/usage) で使用状況を監視

### ファイルアクセスサンドボックス

すべてのファイル操作（読み取り/書き込み）は設定されたベースディレクトリに制限されます：

**保護されるシステムファイル:**
- **Unix/Linux/macOS**: `/etc/*`, `/var/*`, `/home/other_user/*`, `/root/*`
- **Windows**: `C:\Windows\*`, `C:\Program Files\*`, `C:\Users\OtherUser\*`

**セキュリティ機能:**
- ✅ パストラバーサル攻撃の防止（`../` 制限）
- ✅ システムファイル保護
- ✅ 他ユーザーデータ保護
- ✅ 設定されたディレクトリ内のみで操作

**異なるディレクトリにアクセスするには**、ベースディレクトリを設定：
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
- **詳細ドキュメント**: [claude.md](claude.md)

---

**🎨 OpenAI gpt-image-1 で素敵な画像生成を！🚀**
