# OpenAI GPT-Image-1 MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenAI の gpt-image-1 API を使用して画像を生成・編集できる MCP（Model Context Protocol）対応サーバーです。Claude Desktop や Claude Code などの MCP クライアントと連携することで、チャット内から自然言語で高品質な画像生成と編集が行えます。

---

## 🌟 主な機能

### 画像生成・編集
- 🎨 **高品質な画像生成**：gpt-image-1による最先端のテキストから画像生成
- 📝 **優れたテキストレンダリング**：画像内のテキストを正確に描画
- ✂️ **精密な画像編集**：インペインティングによる部分編集
- 🔄 **画像変換**：既存画像のスタイル変換・再解釈
- 🎲 **複数画像一括生成**：1回のリクエストで最大10枚まで生成可能（sample_count対応）

### カスタマイズ
- 📐 **柔軟なサイズ設定**：正方形、縦長、横長など多様なサイズに対応
- 🎚️ **品質レベル調整**：low、medium、high から選択可能
- 🖼️ **多様な出力形式**：PNG、JPEG、WebP に対応
- 🛡️ **コンテンツフィルタリング**：安全性フィルターによる適切な画像生成

### データ管理
- 💰 **コスト管理機能**：トークン使用量とコスト推定を自動計算
- 📚 **履歴管理システム**：SQLiteベースの世代履歴記録と検索
- 🏷️ **メタデータ埋め込み**：PNG/JPEG画像に生成情報を自動埋め込み
- 📁 **画像管理**：生成済み画像の一覧表示

### 非同期処理
- ⚡ **非同期ジョブシステム**：バックグラウンドでの画像生成
- 📊 **ジョブ監視**：進捗状況のリアルタイム追跡
- 🎯 **複数ジョブ管理**：同時に複数のジョブを実行・管理

### その他
- 🔧 **デバッグモード**：詳細ログによるトラブルシュート支援
- 🌐 **クロスプラットフォーム**：Windows/macOS/Linux対応

---

## 📋 前提条件

- **Node.js** v18 以上
- **OpenAI API キー**（組織認証済み）
- **MCP 対応クライアント**（例：Claude Desktop、Claude Code）

> ⚠️ **重要**: gpt-image-1 を使用するには、OpenAI 組織の認証（Organization Verification）が必要です。

---

## 🚀 セットアップ手順

### 1. OpenAI API キーの取得と組織認証

#### 手順概要

1. [OpenAI Platform](https://platform.openai.com/) へアクセス
2. アカウントにログインまたは新規登録
3. **組織認証**を完了
   - [Settings > Organization > General](https://platform.openai.com/settings/organization/general) へアクセス
   - 「Verify Organization」をクリック
   - 本人確認書類のアップロード（政府発行ID）
   - 顔認証による本人確認
   - 認証完了まで最大15分
4. API Keys ページで新しいシークレットキーを作成
5. キーを安全に保管

> 🔐 **注意**: API キーは厳重に保管してください。公開リポジトリへのコミットは絶対に避けてください。

---

### 2. プロジェクトのセットアップ

```bash
npm install -g openai-gpt-image-mcp-server

# パッケージがインストールされ、使用準備完了
```

---

### 3. API キーの設定

#### 環境変数として設定

```bash
# Linux/macOS
export OPENAI_API_KEY="sk-proj-..."

# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-proj-..."

# Windows (コマンドプロンプト)
set OPENAI_API_KEY=sk-proj-...
```

#### または .env ファイルに保存

```bash
# プロジェクト直下に .env ファイルを作成
echo "OPENAI_API_KEY=sk-proj-..." > .env

# アクセス制限（UNIX環境推奨）
chmod 600 .env
```

---

## ⚙️ Claude Desktop の設定

### 基本設定

Claude Desktop の設定ファイル（`claude_desktop_config.json`）に以下を追加：

**macOS/Linux の場合:**
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

**Windows の場合:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server.cmd",
      "env": {
        "OPENAI_API_KEY": "sk-proj-your-api-key-here"
      }
    }
  }
}
```

### 設定ファイルの場所

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Claude Desktop の再起動

設定ファイルを保存後、Claude Desktop を**完全に再起動**してください（タスクトレイからも終了推奨）。

---

## 💻 Claude Code での使用方法

[Claude Code](https://claude.ai/code) でも同様にMCPサーバーとして使用できます。

### 設定方法

**Windows の場合:**
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

**macOS/Linux の場合:**
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

---

## 💬 使用方法の例（チャット内での自然言語）

### 基本的な画像生成

```
美しい夕日の風景を生成してください
```

### サイズ指定

```
1536x1024 のワイド画面で、山の風景を生成
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

---

## 🛠️ 利用可能な MCP ツール

### 1. `generate_image` - テキストから画像生成

テキストプロンプトから新しい画像を生成します。

**主なパラメータ:**
- `prompt` (必須): 画像生成プロンプト
- `output_path`: 保存ファイル名（デフォルト: `generated_image.png`）
- `size`: 画像サイズ（`1024x1024`, `1024x1536`, `1536x1024`, `auto`）
- `quality`: 品質（`low`, `medium`, `high`, `auto`）
- `output_format`: 出力形式（`png`, `jpeg`, `webp`）
- `transparent_background`: 透過背景（`true`/`false`、PNG形式のみ）
- `moderation`: コンテンツフィルタリング（`auto`, `low`）
- `return_base64`: Base64形式で返却（`true`/`false`）

**使用例:**
```
高品質で、1536x1024の横長サイズで富士山の風景を生成してください
```

---

### 2. `edit_image` - 画像編集（インペインティング）

既存画像の一部を編集・修正します。マスク画像で編集範囲を指定します。

**主なパラメータ:**
- `prompt` (必須): 編集内容の説明
- `reference_image_base64` / `reference_image_path`: 元画像（どちらか必須）
- `mask_image_base64` / `mask_image_path`: マスク画像（透明部分=編集対象）
- `output_path`: 保存ファイル名（デフォルト: `edited_image.png`）
- `size`: 画像サイズ
- `quality`: 品質
- `moderation`: コンテンツフィルタリング
- `return_base64`: Base64形式で返却

**マスク画像の仕様:**
- PNG形式推奨
- 透明（アルファ値0）の部分が編集対象
- 不透明部分は保持される

**使用例:**
```
この人物写真で、マスクで指定した服の部分を別のデザインに変更してください
```

---

### 3. `transform_image` - 画像変換

既存画像をベースに、新しいスタイルや内容の画像を生成します。

**主なパラメータ:**
- `prompt` (必須): 変換指示
- `reference_image_base64` / `reference_image_path`: 参照画像（どちらか必須）
- `output_path`: 保存ファイル名（デフォルト: `transformed_image.png`）
- `size`: 画像サイズ
- `quality`: 品質
- `moderation`: コンテンツフィルタリング
- `return_base64`: Base64形式で返却

**使用例:**
```
この風景写真を水彩画風に変換してください
```

---

### 4. `list_generated_images` - 画像一覧表示

ディレクトリ内の画像ファイルを一覧表示します。

**パラメータ:**
- `directory`: 検索対象フォルダ（省略時はカレントディレクトリ）

**使用例:**
```
生成した画像の一覧を表示してください
```

---

## 💰 コスト管理機能

### トークン使用量とコストの自動計算

全ての画像生成・編集操作で、以下の情報が自動的に返却されます：

- **入力トークン数**: プロンプトの処理に使用されたトークン
- **出力トークン数**: 画像生成に使用されたトークン
- **推定コスト**: USD建てのコスト推定
- **コスト内訳**: テキスト処理と画像生成の個別コスト
- **パラメータ情報**: 使用した品質、サイズ、形式

### レスポンス例

```
画像を生成しました: generated_image.png

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
| 1024x1536 | medium | $0.06-0.08 |
| 1536x1024 | medium | $0.06-0.08 |

> ⚠️ **注意**: 推定コストは目安です。正確な料金は [OpenAI 公式料金ページ](https://openai.com/api/pricing/) をご確認ください。

---

## 🎨 gpt-image-1 の特徴と強み

### 1. 優れたテキストレンダリング
画像内のテキストを高精度で描画できます。ロゴ、看板、ポスターなどの制作に最適です。

### 2. 多様なスタイル対応
フォトリアリスティック、アニメ風、水彩画風、油絵風など、幅広いスタイルの画像を生成できます。

### 3. 精密な編集機能
インペインティングにより、画像の特定部分だけを自然に編集できます。

### 4. 世界知識の活用
実在の場所、物、概念についての知識を活用した画像生成が可能です。

### 5. 高い指示理解能力
複雑で詳細なプロンプトでも正確に理解し、意図通りの画像を生成します。

---

## 🔄 他の画像生成サービスとの比較

### OpenAI gpt-image-1 を選ぶべき場合

- ✅ 画像内のテキストレンダリング品質が重要
- ✅ 複雑な指示の正確な理解が必要
- ✅ 精密な画像編集（インペインティング）を行いたい
- ✅ OpenAI エコシステムとの統合
- ✅ シンプルなパラメータで高品質な結果が欲しい

### Vertex AI Imagen を選ぶべき場合（比較参考）

- AI自動マスク生成が必要
- セマンティック分割による編集
- 画像のアップスケーリング
- Google Cloud エコシステムとの統合

---

## 🐞 トラブルシューティング

### よくある問題と解決策

| 症状 | 原因 | 解決策 |
|------|------|-------|
| サーバーが起動しない | Node.js バージョン、パス設定 | Node.js v18以上を確認、パスを確認 |
| 認証エラー | API キーが無効 | `OPENAI_API_KEY` を確認、組織認証を確認 |
| "organization must be verified" | 組織未認証 | [OpenAI Platform](https://platform.openai.com/settings/organization/general) で組織認証を完了 |
| 画像生成失敗 | プロンプトまたはフィルター | プロンプトを具体的に、`moderation: "low"` を試す |
| 画像編集が期待通りでない | マスク画像の問題 | マスク画像が透過PNG形式か確認、透明部分を確認 |
| Base64 表示されない | ファイルサイズ制限 | ファイルサイズを確認、`return_base64: false` を試す |
| コストが高い | 高品質・大サイズ | `quality: "low"` または `size: "1024x1024"` を試す |

### デバッグモード

詳細なログを出力するには、環境変数 `DEBUG=1` を設定：

```bash
DEBUG=1 openai-gpt-image-mcp-server
```

---

## 🔧 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API キー（sk-proj-... 形式） |
| `OPENAI_ORGANIZATION` | ❌ | OpenAI 組織ID（複数組織に所属の場合） |
| `OPENAI_IMAGE_OUTPUT_DIR` | ❌ | 画像の保存先ディレクトリ（デフォルト: `~/Downloads/openai-images`） |
| `OPENAI_IMAGE_INPUT_DIR` | ❌ | 入力画像の読み込み元ディレクトリ（デフォルト: 出力ディレクトリと同じ） |
| `OPENAI_IMAGE_THUMBNAIL` | ❌ | サムネイル生成を有効化（`true` / `false`、デフォルト: `false`） |
| `OPENAI_IMAGE_THUMBNAIL_SIZE` | ❌ | サムネイルサイズ（ピクセル、デフォルト: `128`、範囲: 1-512） |
| `OPENAI_IMAGE_THUMBNAIL_QUALITY` | ❌ | サムネイル品質（JPEG品質、デフォルト: `60`、範囲: 1-100） |
| `OPENAI_IMAGE_EMBED_METADATA` | ❌ | メタデータ埋め込みの有効化（`true` / `false` / `0`、デフォルト: `true`） |
| `OPENAI_IMAGE_METADATA_LEVEL` | ❌ | メタデータ詳細度（`minimal` / `standard` / `full`、デフォルト: `standard`） |
| `HISTORY_DB_PATH` | ❌ | 履歴データベースの保存場所（デフォルト: `{OPENAI_IMAGE_OUTPUT_DIR}/data/openai-gpt-image.db`） |
| `DEBUG` | ❌ | "1" を指定するとデバッグログ有効 |

### 画像出力パスについて

画像の保存先は以下の優先順位で決定されます：

1. **絶対パス指定**: `output_path` に絶対パスを指定した場合
   - **セキュリティ**: ベースディレクトリ内に制限されます
   - 例: `/Users/username/Downloads/openai-images/myimage.png` ✅
   - 例: `/tmp/myimage.png` ❌（ベースディレクトリ外）

2. **相対パス指定**: `output_path` に相対パスを指定した場合
   - ベースディレクトリからの相対パスとして解決されます
   - ベースディレクトリ: `OPENAI_IMAGE_OUTPUT_DIR` 環境変数（未指定時は `~/Downloads/openai-images`）
   - 例: `myimage.png` → `~/Downloads/openai-images/myimage.png`
   - 例: `subfolder/myimage.png` → `~/Downloads/openai-images/subfolder/myimage.png`

3. **セキュリティ保護**: パストラバーサル攻撃を防止
   - `../` を使ったベースディレクトリ外へのアクセスは拒否されます
   - 例: `../other/myimage.png` ❌（エラー）
   - システムファイル（`/etc/*`, `C:\Windows\*` など）への書き込みを防止

4. **自動ディレクトリ作成**: 指定したパスの親ディレクトリが存在しない場合は自動的に作成されます

**設定例:**
```bash
# カスタムディレクトリを設定
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/ai-generated"

# これで相対パス "myimage.png" は ~/Pictures/ai-generated/myimage.png に保存されます
```

### 入力画像パスについて（edit_image、transform_image）

入力画像（参照画像・マスク画像）の読み込み元も同様に管理されます：

1. **デフォルトディレクトリ**:
   - `OPENAI_IMAGE_INPUT_DIR` 環境変数で指定（未指定時は出力ディレクトリと同じ）
   - デフォルト: `~/Downloads/openai-images`

2. **相対パス指定**:
   - 例: `photo.png` → `~/Downloads/openai-images/photo.png`
   - 例: `source/photo.png` → `~/Downloads/openai-images/source/photo.png`

3. **絶対パス指定**:
   - ベースディレクトリ内に制限されます
   - 例: `~/Downloads/openai-images/photo.png` ✅
   - 例: `/tmp/photo.png` ❌（ベースディレクトリ外）

4. **セキュリティ保護**:
   - パストラバーサル攻撃を防止
   - 他ユーザーのファイルやシステムファイルへのアクセスを防止

**設定例:**
```bash
# 入力画像と出力画像で異なるディレクトリを使用
export OPENAI_IMAGE_INPUT_DIR="$HOME/Pictures/source-images"
export OPENAI_IMAGE_OUTPUT_DIR="$HOME/Pictures/generated-images"
```

---

## 🔒 セキュリティ上の注意点

### API キーの管理

- ✅ API キーは `.gitignore` に追加し、公開リポジトリにコミットしない
- ✅ 環境変数または `.env` ファイルで管理
- ✅ 定期的にキーをローテーション
- ✅ 不要になったキーは即座に削除

### アクセス制限

- ファイルのアクセス権限を適切に設定：
  ```bash
  chmod 600 .env
  chmod 600 config/openai-key.json
  ```

### ファイルアクセスのサンドボックス化

すべてのファイル操作（読み込み・書き込み）は設定されたベースディレクトリ内に制限されます：

**保護される重要ファイル・ディレクトリ:**

- **Unix/Linux/macOS**:
  - `/etc/*` - システム設定ファイル
  - `/var/*` - システムログ・データ
  - `/home/other_user/*` - 他ユーザーのファイル
  - `/root/*` - rootユーザーディレクトリ

- **Windows**:
  - `C:\Windows\*` - Windowsシステムファイル
  - `C:\Program Files\*` - インストール済みプログラム
  - `C:\Users\OtherUser\*` - 他ユーザーのファイル

**セキュリティ機能:**
- ✅ パストラバーサル攻撃の防止（`../` の制限）
- ✅ システムファイルへの意図しないアクセスの防止
- ✅ 他ユーザーデータの保護
- ✅ 明確に定義されたディレクトリ内でのみ動作

**ベースディレクトリの変更が必要な場合:**
```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "env": {
        "OPENAI_IMAGE_OUTPUT_DIR": "/path/to/your/output/folder",
        "OPENAI_IMAGE_INPUT_DIR": "/path/to/your/input/folder"
      }
    }
  }
}
```

### 組織設定

- API キーには適切な権限のみを付与
- 使用量上限を設定して予期しない高額請求を防止
- [OpenAI Dashboard](https://platform.openai.com/usage) で定期的に使用状況を確認

---

## 💰 料金について

### OpenAI gpt-image-1 の料金体系

gpt-image-1 は**トークンベースの従量課金制**です。

- 最新の価格は以下を参照：
  [OpenAI API Pricing](https://openai.com/api/pricing/)

### 料金に影響する要素

1. **画像サイズ**: 大きいサイズほど多くのトークンを消費
2. **品質レベル**: `high` > `medium` > `low` の順にコストが高い
3. **画像数**: 生成する画像の枚数に比例
4. **編集の複雑さ**: 編集操作も追加コストがかかる

### コスト最適化のヒント

- 🎯 **プロトタイプは低品質で**: 初期検討は `quality: "low"` で
- 📐 **必要最小限のサイズ**: 用途に合った最小サイズを選択
- 🔄 **プロンプトを洗練**: 一発で望む結果を得られるようプロンプトを工夫
- 📊 **コスト監視**: このMCPの自動コスト計算機能を活用

### 無料枠について

- OpenAI は新規ユーザーに**無料クレジット**を提供（金額・期間は変動）
- 詳細は [OpenAI Platform](https://platform.openai.com/) で確認

> ⚠️ **重要**: 実際の料金やリージョンごとの価格変動は必ず公式サイトでご確認ください。

---

## 📖 コマンドラインオプション

```bash
openai-gpt-image-mcp-server --help     # ヘルプ表示
openai-gpt-image-mcp-server --version  # バージョン表示
```

---

## 🚀 実装状況と今後の予定

### ✅ Phase 1 - 完了
- ✅ 基本的な画像生成
- ✅ 画像編集（インペインティング）
- ✅ 画像変換
- ✅ コスト管理機能
- ✅ 複数画像一括生成（sample_count: 1-10）
- ✅ 型定義の統一
- ✅ エラーハンドリングの統一

### ✅ Phase 2 - 完了
- ✅ SQLite履歴データベース
- ✅ 自動履歴記録機能
- ✅ 履歴検索・一覧表示（list_history）
- ✅ 履歴詳細取得（get_history_by_uuid）
- ✅ UUID ベースの履歴追跡

### ✅ Phase 3 - 完了
- ✅ PNG/JPEG メタデータ埋め込み
- ✅ 生成情報の自動埋め込み
- ✅ プロンプト・パラメータ保存

### ✅ Phase 4 - 完了
- ✅ 非同期ジョブシステム
- ✅ バックグラウンド実行
- ✅ ジョブ状態管理（pending/running/completed/failed/cancelled）
- ✅ 進捗追跡（0-100%）
- ✅ ジョブ管理ツール（start/check/get/cancel/list）

### 🔮 今後の拡張アイデア
- バリエーション生成機能
- セッション全体のコストサマリー
- プロンプト最適化ヘルパー
- コスト上限アラート
- 月次レポート生成
- CSV/JSON エクスポート
- カスタムスタイルプリセット

---

## 🤝 フィードバックと貢献

このプロジェクトは継続的に改善されています。

- 🐛 バグ報告
- 💡 機能リクエスト
- 📝 ドキュメント改善
- 🔧 プルリクエスト

すべての貢献を歓迎します！

---

## 📄 ライセンス

MIT License

---

## 🙏 謝辞

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API](https://platform.openai.com/)
- [Claude Desktop](https://claude.ai/download)

---

## 📞 サポート

質問や問題がある場合は、以下をご確認ください：

1. このドキュメントのトラブルシューティングセクション
2. [OpenAI API Documentation](https://platform.openai.com/docs)
3. [MCP Documentation](https://modelcontextprotocol.io/docs)

---

**🎨 Happy Image Generating with OpenAI gpt-image-1! 🚀**
