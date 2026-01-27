# CLI リファレンス

[English](CLI_REFERENCE.md) | 日本語

コマンドラインインターフェースとJSONスキーマの技術リファレンス。

## 目次

1. [エントリーポイント](#エントリーポイント)
2. [MCPサーバーCLI](#mcpサーバーcli)
3. [バッチCLI](#バッチcli)
4. [MCPツールJSONスキーマ](#mcpツールjsonスキーマ)
5. [型定義](#型定義)
6. [終了コード](#終了コード)

---

## エントリーポイント

| コマンド | バイナリ | ソース |
|---------|--------|--------|
| MCPサーバー | `openai-gpt-image-mcp-server` | `dist/index.js` |
| バッチCLI | `openai-gpt-image-batch` | `dist/cli/batch.js` |

### インストール

```bash
# グローバルインストール
npm install -g openai-gpt-image-mcp-server

# ローカルビルド
npm install && npm run build
```

---

## MCPサーバーCLI

### 使用方法

```bash
openai-gpt-image-mcp-server
```

MCPサーバーはstdioトランスポートで動作し、Model Context Protocolを介してツール呼び出しを受け付けます。

### 環境変数

| 変数 | 必須 | 説明 | デフォルト |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI APIキー | - |
| `OPENAI_ORGANIZATION` | No | 組織ID | - |
| `OPENAI_IMAGE_OUTPUT_DIR` | No | デフォルト出力ディレクトリ | `~/Downloads/openai-images` |
| `OPENAI_IMAGE_INPUT_DIR` | No | 編集/変換用入力ディレクトリ | - |
| `OPENAI_IMAGE_EMBED_METADATA` | No | メタデータ埋め込み有効化 | `true` |
| `OPENAI_IMAGE_METADATA_LEVEL` | No | 詳細レベル: `minimal`\|`standard`\|`full` | `standard` |
| `OPENAI_IMAGE_THUMBNAIL` | No | サムネイル有効化 | `false` |
| `OPENAI_IMAGE_THUMBNAIL_SIZE` | No | サムネイルサイズ（ピクセル） | `128` |
| `OPENAI_IMAGE_THUMBNAIL_QUALITY` | No | JPEG品質（1-100） | `60` |
| `HISTORY_DB_PATH` | No | データベースの場所 | `~/.openai-gpt-image/history.db` |
| `OPENAI_IMAGE_ALLOW_ANY_PATH` | No | パス制限を緩和（`true`） | `false` |
| `DEBUG` | No | デバッグログ有効化 | - |

---

## バッチCLI

### 使用方法

```bash
openai-gpt-image-batch <config.json> [オプション]
```

### オプション

| オプション | 短縮形 | 型 | 説明 | デフォルト |
|--------|-------|------|-------------|---------|
| `--help` | `-h` | flag | ヘルプメッセージを表示 | - |
| `--version` | `-v` | flag | バージョンを表示 | - |
| `--output-dir` | - | `<path>` | 出力ディレクトリを上書き | 設定値 |
| `--format` | - | `text`\|`json` | 出力形式 | `text` |
| `--timeout` | - | `<ms>` | タイムアウト（最小: 1000） | `600000` |
| `--max-concurrent` | - | `<n>` | 同時実行ジョブ数（1-10） | `2` |
| `--estimate-only` | - | flag | コスト見積もりのみ | - |
| `--allow-any-path` | - | flag | パス制限を緩和（CI/CD用） | - |

### 使用例

```bash
# 基本実行
openai-gpt-image-batch batch-config.json

# カスタム出力ディレクトリ
openai-gpt-image-batch batch-config.json --output-dir ./my-images

# JSON出力
openai-gpt-image-batch batch-config.json --format json > result.json

# コスト見積もり
openai-gpt-image-batch batch-config.json --estimate-only

# 高並列・タイムアウト延長
openai-gpt-image-batch batch-config.json --max-concurrent 5 --timeout 1200000

# CI/CD: 任意のディレクトリに出力（セキュリティ制限を緩和）
openai-gpt-image-batch batch-config.json --output-dir ./artifacts --allow-any-path
```

### バッチ設定JSONスキーマ

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

### バッチ結果JSONスキーマ

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

## MCPツールJSONスキーマ

### generate_image

テキストプロンプトから新しい画像を生成。

```json
{
  "name": "generate_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "生成する画像を説明するテキストプロンプト"
      },
      "output_path": {
        "type": "string",
        "description": "出力ファイルパス",
        "default": "generated_image.png"
      },
      "model": {
        "type": "string",
        "enum": ["gpt-image-1", "gpt-image-1.5"],
        "description": "使用モデル（1.5は高速・低コスト）",
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
        "description": "PNGのみ",
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

インペインティングを使用して既存の画像を編集。

```json
{
  "name": "edit_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "希望する編集内容の説明"
      },
      "reference_image_base64": {
        "type": "string",
        "description": "Base64エンコードされた参照画像"
      },
      "reference_image_path": {
        "type": "string",
        "description": "参照画像ファイルのパス"
      },
      "mask_image_base64": {
        "type": "string",
        "description": "Base64マスク（透明部分が編集される）"
      },
      "mask_image_path": {
        "type": "string",
        "description": "マスク画像ファイルのパス"
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
        "description": "gpt-image-1.5のみ。highは顔/ロゴをより良く保持",
        "default": "low"
      }
    }
  }
}
```

### transform_image

画像を新しいスタイルに変換。

```json
{
  "name": "transform_image",
  "inputSchema": {
    "type": "object",
    "required": ["prompt"],
    "properties": {
      "prompt": {
        "type": "string",
        "description": "希望する変換の説明"
      },
      "reference_image_base64": {
        "type": "string",
        "description": "Base64エンコードされた参照画像"
      },
      "reference_image_path": {
        "type": "string",
        "description": "参照画像ファイルのパス"
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
        "description": "gpt-image-1.5のみ",
        "default": "low"
      }
    }
  }
}
```

### list_generated_images

ディレクトリ内の画像ファイルを一覧表示。

```json
{
  "name": "list_generated_images",
  "inputSchema": {
    "type": "object",
    "properties": {
      "directory": {
        "type": "string",
        "description": "検索するディレクトリパス",
        "default": "カレントディレクトリ"
      }
    }
  }
}
```

### list_history

フィルター付きで生成履歴を一覧表示。

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
        "description": "プロンプトテキスト内を検索"
      }
    }
  }
}
```

### get_history_by_uuid

UUIDで履歴レコードの詳細を取得。

```json
{
  "name": "get_history_by_uuid",
  "inputSchema": {
    "type": "object",
    "required": ["uuid"],
    "properties": {
      "uuid": {
        "type": "string",
        "description": "履歴レコードのUUID"
      }
    }
  }
}
```

### get_metadata_from_image

生成された画像からメタデータを抽出。

```json
{
  "name": "get_metadata_from_image",
  "inputSchema": {
    "type": "object",
    "required": ["image_path"],
    "properties": {
      "image_path": {
        "type": "string",
        "description": "画像ファイルのパス"
      }
    }
  }
}
```

### start_generation_job

非同期バックグラウンドジョブを開始。

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
        "description": "gpt-image-1.5のみ"
      }
    }
  }
}
```

### check_job_status

非同期ジョブのステータスを確認。

```json
{
  "name": "check_job_status",
  "inputSchema": {
    "type": "object",
    "required": ["job_id"],
    "properties": {
      "job_id": {
        "type": "string",
        "description": "start_generation_jobから返されたジョブID"
      }
    }
  }
}
```

### get_job_result

完了したジョブの結果を取得。

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

保留中/実行中のジョブをキャンセル。

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

フィルター付きで非同期ジョブを一覧表示。

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

## 型定義

### TypeScript型

```typescript
// 画像パラメータ
type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
type ImageFormat = 'png' | 'jpeg' | 'webp';
type ModerationLevel = 'auto' | 'low';
type ImageModel = 'gpt-image-1' | 'gpt-image-1.5';
type InputFidelity = 'low' | 'high';

// ジョブステータス
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// バッチ結果ステータス
type BatchJobStatus = 'completed' | 'failed' | 'cancelled';
```

### パラメータインターフェース

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
  input_fidelity?: InputFidelity;  // gpt-image-1.5のみ
}

interface TransformImageParams extends GenerateImageParams {
  reference_image_base64?: string;
  reference_image_path?: string;
  input_fidelity?: InputFidelity;  // gpt-image-1.5のみ
}
```

### バッチインターフェース

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
  jobs: BatchJobConfig[];          // 1-100アイテム
  output_dir?: string;
  max_concurrent?: number;         // 1-10、デフォルト: 2
  timeout?: number;                // 1000-3600000、デフォルト: 600000
  retry_policy?: RetryPolicy;
}

interface RetryPolicy {
  max_retries?: number;            // 0-5、デフォルト: 2
  retry_delay_ms?: number;         // 100-60000、デフォルト: 5000
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

## 終了コード

### バッチCLI

| コード | 説明 |
|------|-------------|
| `0` | 成功（全ジョブ完了） |
| `1` | 設定/引数エラー |
| `1` | 一部ジョブ失敗（部分的成功） |
| `1` | APIキー未設定 |
| `1` | JSON設定無効 |

### MCPサーバー

| コード | 説明 |
|------|-------------|
| `0` | 正常シャットダウン |
| `1` | `OPENAI_API_KEY`未設定 |

---

## 関連ドキュメント

- [バッチ処理ガイド](BATCH_PROCESSING.ja.md) - バッチ処理の詳細ガイド
- [環境変数](ENVIRONMENT_VARIABLES.md) - 環境変数の完全リファレンス
- [履歴](advanced/history.md) - 履歴データベースの詳細
- [メタデータ](advanced/metadata.md) - 画像メタデータ形式
