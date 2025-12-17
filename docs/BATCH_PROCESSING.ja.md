# バッチ画像生成ガイド

[English](BATCH_PROCESSING.md) | 日本語

このドキュメントでは、OpenAI GPT-Image-1 MCP Serverのバッチ画像生成機能について説明します。

## 目次

1. [概要](#概要)
2. [CLIを使用したバッチ処理](#cliを使用したバッチ処理)
3. [バッチ設定のJSON形式](#バッチ設定のjson形式)
4. [バッチ処理結果のJSON形式](#バッチ処理結果のjson形式)
5. [環境変数](#環境変数)
6. [GitHub Actionsとの統合](#github-actionsとの統合)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

バッチ画像生成機能を使用すると、複数の画像を一度に生成できます。この機能は以下の2つの方法で利用できます：

- **CLI（コマンドライン）**: ローカル環境またはCI/CD環境から直接実行
- **GitHub Actions**: Issueコメントをトリガーとして自動実行

### 特徴

- ✅ **非同期ジョブ管理**: JobManagerを使用した効率的な並列処理
- ✅ **同時実行数制御**: リソース使用量を制限可能
- ✅ **詳細な結果レポート**: テキストまたはJSON形式で出力
- ✅ **エラーハンドリング**: 個別のジョブが失敗しても継続実行
- ✅ **タイムアウト制御**: 長時間実行の防止
- ✅ **リトライポリシー**: 失敗したジョブの自動リトライ
- ✅ **コスト見積もり**: 実行前のコスト試算

---

## CLIを使用したバッチ処理

### インストール

```bash
npm install -g openai-gpt-image-mcp-server
```

または、リポジトリをクローンしてローカルビルド：

```bash
git clone https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER.git
cd openAI-gpt-image-1-MCP-SERVER
npm install
npm run build
```

### 基本的な使用方法

```bash
openai-gpt-image-batch <batch-config.json> [OPTIONS]
```

#### オプション

| オプション | 説明 | デフォルト |
|----------|------|-----------|
| `--output-dir <path>` | 出力ディレクトリ | `OPENAI_IMAGE_OUTPUT_DIR`または`~/Downloads/openai-images` |
| `--format <text\|json>` | 結果の出力形式 | `text` |
| `--timeout <ms>` | タイムアウト（ミリ秒） | `600000`（10分） |
| `--max-concurrent <n>` | 最大同時実行数 | `2` |
| `--estimate-only` | コスト見積もりのみ実行 | - |
| `--help`, `-h` | ヘルプメッセージを表示 | - |
| `--version`, `-v` | バージョン情報を表示 | - |

### 使用例

#### 1. 基本的な実行

```bash
# batch-config.jsonを使用して画像を生成
openai-gpt-image-batch batch-config.json
```

#### 2. カスタム出力ディレクトリ

```bash
# ./my-imagesディレクトリに保存
openai-gpt-image-batch batch-config.json --output-dir ./my-images
```

#### 3. JSON形式で結果を取得

```bash
# 結果をJSON形式でファイルに保存
openai-gpt-image-batch batch-config.json --format json > result.json
```

#### 4. タイムアウトの設定

```bash
# 20分のタイムアウトを設定
openai-gpt-image-batch batch-config.json --timeout 1200000
```

#### 5. コスト見積もりのみ

```bash
# 画像を生成せずにコストを見積もる
openai-gpt-image-batch batch-config.json --estimate-only
```

### サンプル設定を使用する

```bash
# シンプルなバッチ（3画像）
openai-gpt-image-batch examples/batch-simple.json

# 詳細設定付きバッチ
openai-gpt-image-batch examples/batch-detailed.json

# マルチバリアント生成
openai-gpt-image-batch examples/batch-multi-variant.json

# 大規模バッチ（10画像以上）
openai-gpt-image-batch examples/batch-large-scale.json
```

---

## バッチ設定のJSON形式

### 基本構造

```json
{
  "jobs": [
    {
      "prompt": "画像生成プロンプト",
      "output_path": "ファイル名.png",
      "size": "1024x1024",
      "quality": "high",
      "output_format": "png",
      "transparent_background": false,
      "moderation": "auto",
      "sample_count": 1
    }
  ],
  "output_dir": "./output",
  "max_concurrent": 2,
  "timeout": 600000,
  "retry_policy": {
    "max_retries": 2,
    "retry_delay_ms": 5000,
    "retry_on_errors": ["rate_limit", "timeout"]
  }
}
```

### フィールド説明

#### `jobs` (必須)

画像生成ジョブの配列。各ジョブは以下のフィールドを持ちます：

| フィールド | 型 | 必須 | 説明 | デフォルト |
|-----------|---|------|------|-----------|
| `prompt` | string | ✅ | 画像生成プロンプト | - |
| `output_path` | string | ❌ | 出力ファイルパス（ファイル名のみ） | 自動生成 |
| `size` | string | ❌ | 画像サイズ: `1024x1024`, `1024x1536`, `1536x1024`, `auto` | `auto` |
| `quality` | string | ❌ | 品質レベル: `low`, `medium`, `high`, `auto` | `auto` |
| `output_format` | string | ❌ | 出力形式: `png`, `jpeg`, `webp` | `png` |
| `transparent_background` | boolean | ❌ | 透明背景を有効化（PNG のみ） | `false` |
| `moderation` | string | ❌ | コンテンツフィルタリング: `auto`, `low`, `medium`, `high` | `auto` |
| `sample_count` | number | ❌ | 生成する画像数（1-10） | 1 |

#### `output_dir` (任意)

出力ディレクトリのパス。CLIの`--output-dir`オプションで上書き可能。

#### `max_concurrent` (任意)

最大同時実行ジョブ数。環境変数`OPENAI_BATCH_MAX_CONCURRENT`またはCLIの`--max-concurrent`オプションで上書き可能。

**範囲**: 1-10
**デフォルト**: 2

#### `timeout` (任意)

タイムアウト時間（ミリ秒）。CLIの`--timeout`オプションで上書き可能。

**範囲**: 1000-3600000（1秒から1時間）
**デフォルト**: 600000（10分）

#### `retry_policy` (任意)

失敗したジョブのリトライ設定。

| フィールド | 型 | 説明 | デフォルト |
|-----------|---|-------------|---------|
| `max_retries` | number | 最大リトライ回数（0-5） | 2 |
| `retry_delay_ms` | number | リトライ間隔（ミリ秒、100-60000） | 5000 |
| `retry_on_errors` | string[] | リトライを実行するエラーパターン | `["rate_limit", "timeout"]` |

### サンプル設定

#### 1. シンプルな設定

```json
{
  "jobs": [
    {
      "prompt": "海に沈む美しい夕日"
    },
    {
      "prompt": "未来的な都市のスカイライン"
    }
  ]
}
```

#### 2. 詳細設定

```json
{
  "jobs": [
    {
      "prompt": "笑顔の人物のフォトリアリスティックなポートレート",
      "output_path": "portrait.png",
      "size": "1024x1536",
      "quality": "high",
      "output_format": "png"
    },
    {
      "prompt": "幾何学的な形状を使ったミニマリストの抽象アート",
      "output_path": "abstract.png",
      "size": "1024x1024",
      "quality": "medium",
      "output_format": "png"
    }
  ],
  "output_dir": "./generated-images",
  "max_concurrent": 3,
  "timeout": 900000
}
```

#### 3. マルチバリアント生成

```json
{
  "jobs": [
    {
      "prompt": "モダンなミニマリストのリビングルームインテリア",
      "output_path": "living_room.png",
      "sample_count": 5,
      "quality": "high"
    }
  ],
  "max_concurrent": 2,
  "retry_policy": {
    "max_retries": 3,
    "retry_delay_ms": 5000
  }
}
```

---

## バッチ処理結果のJSON形式

バッチ処理を`--format json`オプションで実行すると、結果がJSON形式で出力されます。

### 基本構造

```json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "cancelled": 0,
  "results": [
    {
      "job_id": "abc123",
      "prompt": "海に沈む美しい夕日",
      "status": "completed",
      "output_path": "/path/to/sunset.png",
      "output_paths": ["/path/to/sunset.png"],
      "duration_ms": 15230,
      "history_uuid": "8796265a-8dc8-48f4-9b40-fe241985379b"
    },
    {
      "job_id": "def456",
      "prompt": "無効なプロンプト",
      "status": "failed",
      "error": "コンテンツポリシー違反",
      "duration_ms": 3120
    }
  ],
  "started_at": "2025-10-28T10:00:00.000Z",
  "finished_at": "2025-10-28T10:00:45.320Z",
  "total_duration_ms": 45320,
  "total_cost": 0.42
}
```

### フィールド説明

#### トップレベル

| フィールド | 型 | 説明 |
|-----------|---|------|
| `total` | number | 総ジョブ数 |
| `succeeded` | number | 成功したジョブ数 |
| `failed` | number | 失敗したジョブ数 |
| `cancelled` | number | キャンセルされたジョブ数 |
| `results` | array | 個別ジョブの結果配列 |
| `started_at` | string | バッチ処理開始時刻（ISO 8601形式） |
| `finished_at` | string | バッチ処理終了時刻（ISO 8601形式） |
| `total_duration_ms` | number | 総実行時間（ミリ秒） |
| `total_cost` | number | 総推定コスト（USD） |

#### `results` 配列の各要素

| フィールド | 型 | 説明 | 存在条件 |
|-----------|---|------|---------|
| `job_id` | string | ジョブの一意識別子 | 常に存在 |
| `prompt` | string | 画像生成に使用したプロンプト | 常に存在 |
| `status` | string | ジョブステータス: `completed`, `failed`, `cancelled` | 常に存在 |
| `output_path` | string | 生成された画像ファイルのパス | `status: "completed"` の場合のみ |
| `output_paths` | string[] | 生成されたすべての画像ファイルのパス | `status: "completed"` の場合のみ |
| `error` | string | エラーメッセージ | `status: "failed"` または `cancelled` |
| `duration_ms` | number | ジョブの実行時間（ミリ秒） | 完了または失敗した場合 |
| `history_uuid` | string | 履歴レコードのUUID | `status: "completed"` の場合のみ |

### ステータスの種類

| ステータス | 説明 |
|----------|------|
| `completed` | ジョブが正常に完了し、画像が生成された |
| `failed` | ジョブが失敗した（APIエラー、安全性フィルター等） |
| `cancelled` | タイムアウトなどによりジョブがキャンセルされた |

### JSON出力の取得方法

```bash
# 結果をJSONファイルに保存
openai-gpt-image-batch batch-config.json --format json > result.json

# 標準出力にJSON表示
openai-gpt-image-batch batch-config.json --format json

# jqでパースして成功したジョブのみ表示
openai-gpt-image-batch batch-config.json --format json | jq '.results[] | select(.status == "completed")'

# 失敗したジョブのエラーメッセージを抽出
openai-gpt-image-batch batch-config.json --format json | jq '.results[] | select(.status == "failed") | {prompt, error}'
```

---

## 環境変数

バッチ処理では以下の環境変数が使用されます：

### 認証（必須）

| 変数名 | 説明 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI APIキー（必須） |

### 任意

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `OPENAI_IMAGE_OUTPUT_DIR` | デフォルト出力ディレクトリ | `~/Downloads/openai-images` |
| `OPENAI_BATCH_MAX_CONCURRENT` | デフォルト最大同時実行数 | `2` |
| `OPENAI_BATCH_TIMEOUT` | デフォルトタイムアウト（ミリ秒） | `600000` |
| `OPENAI_ORGANIZATION` | OpenAI組織ID | - |
| `HISTORY_DB_PATH` | データベースの場所 | `~/.openai-gpt-image/history.db` |
| `DEBUG` | デバッグログ有効化 | - |

### 環境変数の設定例

#### Bash/Zsh

```bash
export OPENAI_API_KEY="sk-proj-..."
export OPENAI_IMAGE_OUTPUT_DIR="./output"
export OPENAI_BATCH_MAX_CONCURRENT="3"
```

#### `.env` ファイル

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_IMAGE_OUTPUT_DIR=./output
OPENAI_BATCH_MAX_CONCURRENT=3
OPENAI_BATCH_TIMEOUT=900000
```

---

## GitHub Actionsとの統合

GitHub Actionsを使用して、Issueコメントからバッチ画像生成をトリガーできます。

### セットアップ

#### 1. リポジトリシークレットの設定

Settings > Secrets and variables > Actions で以下のシークレットを設定：

| シークレット名 | 説明 | 必須 |
|--------------|------|------|
| `OPENAI_API_KEY` | OpenAI APIキー | ✅ |

#### 2. ワークフローファイルの作成

`.github/workflows/batch-image-generation.yml`を作成：

```yaml
name: Batch Image Generation

on:
  issue_comment:
    types: [created]

permissions:
  issues: write
  contents: read

jobs:
  batch-generate:
    if: contains(github.event.comment.body, '/batch')
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Extract batch config
        id: config
        uses: actions/github-script@v7
        with:
          script: |
            const comment = context.payload.comment.body;
            const jsonMatch = comment.match(/```json\n([\s\S]+?)\n```/);
            if (!jsonMatch) {
              throw new Error('コメントにJSON設定が見つかりません');
            }
            const fs = require('fs');
            fs.writeFileSync('batch-config.json', jsonMatch[1]);
            return 'success';

      - name: Run batch generation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npm run batch batch-config.json --format json > result.json

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: generated-images-${{ github.run_id }}
          path: |
            ~/Downloads/openai-images/**/*.png
            ~/Downloads/openai-images/**/*.jpg
            ~/Downloads/openai-images/**/*.webp
          retention-days: 7

      - name: Comment results
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const result = JSON.parse(fs.readFileSync('result.json', 'utf8'));

            let comment = `## ✅ バッチ画像生成が完了しました\n\n`;
            comment += `**サマリー:**\n`;
            comment += `- 総ジョブ数: ${result.total}\n`;
            comment += `- 成功: ${result.succeeded}\n`;
            comment += `- 失敗: ${result.failed}\n`;
            comment += `- 実行時間: ${(result.total_duration_ms / 1000).toFixed(2)}秒\n`;

            if (result.total_cost) {
              comment += `- 総コスト: $${result.total_cost.toFixed(4)}\n`;
            }

            comment += `\n`;

            if (result.succeeded > 0) {
              comment += `### ✅ 生成に成功した画像\n\n`;
              result.results
                .filter(r => r.status === 'completed')
                .forEach((r, i) => {
                  const filename = r.output_path ? r.output_path.split('/').pop() : 'unknown';
                  comment += `${i + 1}. \`${filename}\`: ${r.prompt.substring(0, 60)}\n`;
                });
            }

            if (result.failed > 0) {
              comment += `\n### ❌ 失敗したジョブ\n\n`;
              result.results
                .filter(r => r.status === 'failed')
                .forEach((r, i) => {
                  comment += `${i + 1}. ${r.prompt.substring(0, 60)}: ${r.error}\n`;
                });
            }

            comment += `\n📦 生成された画像は[ワークフローのアーティファクト](${context.payload.repository.html_url}/actions/runs/${context.runId})からダウンロードできます。`;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### 使用方法

#### 1. Issueを作成

任意のタイトルと説明でIssueを作成します。

#### 2. バッチ設定をコメント

`/batch`トリガーとJSON設定をコメントに投稿：

````markdown
/batch

```json
{
  "jobs": [
    {
      "prompt": "海に沈む美しい夕日",
      "output_path": "sunset.png"
    },
    {
      "prompt": "夜の未来的な都市のスカイライン",
      "output_path": "city.png"
    }
  ]
}
```
````

#### 3. ワークフローの実行

コメント投稿後、GitHub Actionsワークフローが自動的に開始されます。

#### 4. 結果の確認

- ワークフロー完了後、結果がIssueコメントとして自動投稿されます
- 生成された画像は、GitHub Actionsのアーティファクトからダウンロード可能（保持期間: 7日間）

---

## トラブルシューティング

### 1. 認証エラー

**エラー**: `Error: OPENAI_API_KEY environment variable is required`

**解決策**:
- `OPENAI_API_KEY`環境変数が設定されていることを確認
- APIキーが有効であることを確認
- 必要に応じてOpenAI組織認証を完了
- GitHub Actionsの場合、シークレット名が正しいことを確認

### 2. タイムアウトエラー

**エラー**: `Timeout reached. Cancelling remaining jobs...`

**解決策**:
- `--timeout`オプションで時間を延長
- `max_concurrent`を増やして並列度を上げる
- ジョブ数を減らす
- 複数のバッチに分割することを検討

### 3. ジョブ失敗

**エラー**: `Some jobs failed`

**解決策**:
- JSON出力を確認して失敗理由を特定
- プロンプトがコンテンツポリシーに違反していないか確認
- OpenAI APIのクォータを確認
- エラーメッセージから具体的な問題を特定

### 4. 設定エラー

**エラー**: `Configuration Error: jobs must be an array`

**解決策**:
- JSON構文が正しいか確認（トレーリングカンマ、クォート等）
- オンラインのJSON validatorで検証
- `jobs`配列が存在し、空でないことを確認
- すべての必須フィールドが存在することを確認

### 5. レート制限

**エラー**: レート制限エラーでジョブが失敗

**解決策**:
- `max_concurrent`の値を減らす
- `retry_on_errors`に`rate_limit`を含むリトライポリシーを有効化
- OpenAIサポートに連絡してレート制限の増加を依頼
- バッチ間に遅延を追加

### 6. メモリ不足

**エラー**: メモリエラーでプロセスがクラッシュ

**解決策**:
- `max_concurrent`の値を減らす
- より小さなバッチで画像を処理
- ジョブごとの`sample_count`を減らす
- より低い品質設定を使用

---

## ベストプラクティス

### 1. 小さく始める

大規模化する前に、小さなバッチ（3-5画像）でテスト設定を行う。

### 2. コストを監視

実行前に`--estimate-only`を使用してコストを確認：

```bash
openai-gpt-image-batch batch-config.json --estimate-only
```

### 3. 適切な同時実行数を使用

推奨設定：
- 個人プロジェクト: `max_concurrent: 2`
- 小規模チーム: `max_concurrent: 3-5`
- 大規模: レート制限を慎重に監視

### 4. リトライポリシーを有効化

本番環境では、常にリトライポリシーを有効化：

```json
{
  "retry_policy": {
    "max_retries": 2,
    "retry_delay_ms": 5000,
    "retry_on_errors": ["rate_limit", "timeout", "server_error"]
  }
}
```

### 5. 出力を整理

わかりやすい出力パスを使用し、プロジェクトごとに整理：

```json
{
  "jobs": [
    {
      "prompt": "ロゴデザイン",
      "output_path": "project-a/logo_v1.png"
    }
  ],
  "output_dir": "./client-assets"
}
```

---

## まとめ

バッチ処理機能により以下が可能になります：
- 1回の実行で複数の画像生成
- CI/CDのためのGitHub Actions統合
- チームコラボレーションの改善
- 大規模画像生成のユースケースへの対応

**次のステップ:**

1. サンプル設定ファイルを試す
2. GitHub Actionsワークフローを設定
3. CI/CDパイプラインに統合

**サポート:**

問題が発生した場合は、GitHubでIssueを作成してください：
https://github.com/ex-takashima/openAI-gpt-image-1-MCP-SERVER/issues

---

**Happy Batch Generating! 🎨**
