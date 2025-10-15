# 新機能ガイド (v1.0.3+)

このガイドでは、v1.0.3以降で追加された新機能について説明します。

---

## 📚 履歴管理システム

### `list_history` - 履歴一覧表示

生成・編集履歴をSQLiteデータベースから検索・表示します。

**パラメータ:**
- `limit`: 表示件数（1-100、デフォルト: 20）
- `offset`: スキップ件数（ページネーション用）
- `tool_name`: ツールでフィルター（`generate_image`, `edit_image`, `transform_image`）
- `query`: プロンプト内のテキスト検索

**使用例:**
```
最近生成した画像の履歴を10件表示してください
```

```
"sunset"というキーワードで履歴を検索してください
```

**レスポンス例:**
```
Found 3 history record(s):

📝 8796265a-8dc8-48f4-9b40-fe241985379b
   Tool: generate_image
   Created: 2025-10-16 00:30:15
   Prompt: beautiful sunset over the ocean
   Size: 1024x1024 | Quality: high | Format: png
   Output: generated_image.png

📝 b7912655-0d8e-4ecc-be58-cbc2c4746932
   Tool: edit_image
   Created: 2025-10-16 00:25:10
   Prompt: change the sky to purple
   Images: 1 image
   Output: edited_image.png

📊 Total: 3 record(s)
```

---

### `get_history_by_uuid` - 履歴詳細取得

特定の履歴レコードの詳細情報を取得します。

**パラメータ:**
- `uuid` (必須): 履歴レコードのUUID

**使用例:**
```
この履歴IDの詳細を教えてください: 8796265a-8dc8-48f4-9b40-fe241985379b
```

**レスポンス例:**
```
📝 History Record: 8796265a-8dc8-48f4-9b40-fe241985379b

🛠️  Tool: generate_image
📅 Created: 2025-10-16 00:30:15

💬 Prompt:
beautiful sunset over the ocean with palm trees

⚙️  Parameters:
   size: "1024x1024"
   quality: "high"
   output_format: "png"
   sample_count: 1

🎨 Image Settings:
   Size: 1024x1024
   Quality: high
   Format: png

📁 Output Files:
   1. generated_image.png
```

**データベース:**
- 場所: `~/.openai-gpt-image/history.db`
- エンジン: SQLite with WAL mode
- インデックス: created_at, tool_name, uuid

---

## ⚡ 非同期ジョブシステム

バックグラウンドで画像生成を実行し、他の作業を並行して行えます。

### `start_generation_job` - ジョブ開始

非同期画像生成ジョブを開始します。

**パラメータ:**
- `tool_name` (必須): `generate_image`, `edit_image`, `transform_image`
- `prompt` (必須): 生成プロンプト
- その他: 各ツールのパラメータ（size, quality, output_format, 等）

**使用例:**
```
バックグラウンドで高品質な宇宙飛行士の画像を5枚生成してください
```

**レスポンス:**
```
✅ Job started successfully!

🆔 Job ID: b7912655-0d8e-4ecc-be58-cbc2c4746932
🛠️  Tool: generate_image
💬 Prompt: astronaut floating in space

Use check_job_status to monitor progress and get_job_result to retrieve results when completed.
```

---

### `check_job_status` - 状態確認

ジョブの現在の状態と進捗を確認します。

**パラメータ:**
- `job_id` (必須): ジョブID

**使用例:**
```
このジョブの状態を確認してください: b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**レスポンス例:**
```
📊 Job Status

🆔 Job ID: b7912655-0d8e-4ecc-be58-cbc2c4746932
🔄 Status: RUNNING
📈 Progress: 50%
🛠️  Tool: generate_image
📅 Created: 2025-10-16 00:30:00
🔄 Updated: 2025-10-16 00:30:15

💡 Job is currently running. Check back in a moment.
```

**ジョブステータス:**
- `pending` ⏳: 待機中
- `running` 🔄: 実行中
- `completed` ✅: 完了
- `failed` ❌: 失敗
- `cancelled` 🚫: キャンセル済み

---

### `get_job_result` - 結果取得

完了したジョブの結果を取得します。

**パラメータ:**
- `job_id` (必須): ジョブID

**使用例:**
```
このジョブの結果を取得してください: b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**レスポンス例:**
```
✅ Job Result

🆔 Job ID: b7912655-0d8e-4ecc-be58-cbc2c4746932
🛠️  Tool: generate_image
📅 Completed: 2025-10-16 00:30:45
💬 Prompt: astronaut floating in space

📁 Output Files (5):
  1. astronaut_1.png
  2. astronaut_2.png
  3. astronaut_3.png
  4. astronaut_4.png
  5. astronaut_5.png

📝 History ID: 8796265a-8dc8-48f4-9b40-fe241985379b
💡 Use get_history_by_uuid to see detailed generation info.
```

---

### `cancel_job` - ジョブキャンセル

実行中または待機中のジョブをキャンセルします。

**パラメータ:**
- `job_id` (必須): キャンセルするジョブID

**使用例:**
```
このジョブをキャンセルしてください: b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**レスポンス:**
```
✅ Job cancelled successfully: b7912655-0d8e-4ecc-be58-cbc2c4746932
```

**注意:**
- 完了済み、失敗済み、既にキャンセル済みのジョブはキャンセルできません

---

### `list_jobs` - ジョブ一覧

非同期ジョブの一覧を表示します。

**パラメータ:**
- `status`: ステータスでフィルター（`pending`, `running`, `completed`, `failed`, `cancelled`）
- `tool_name`: ツールでフィルター
- `limit`: 表示件数（1-100、デフォルト: 20）
- `offset`: スキップ件数

**使用例:**
```
実行中のジョブを表示してください
```

```
完了したジョブを5件表示してください
```

**レスポンス例:**
```
Found 2 job(s):

🔄 b7912655-0d8e-4ecc-be58-cbc2c4746932
   Status: running (50%)
   Tool: generate_image
   Created: 2025-10-16 00:30:00
   Prompt: astronaut floating in space

✅ a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Status: completed (100%)
   Tool: edit_image
   Created: 2025-10-16 00:25:00
   Prompt: change the background to a beach scene
   Output: 1 file(s)

📊 Total: 2 job(s)
```

---

## 🎲 複数画像一括生成 (sample_count)

全ての生成・編集ツールで `sample_count` パラメータがサポートされました。

**パラメータ:**
- `sample_count`: 生成する画像の枚数（1-10、デフォルト: 1）

**使用例:**
```
猫の画像を5枚生成してください
```

**動作:**
- 複数画像は自動的に番号付きファイル名で保存されます
  - `output.png` → `output_1.png`, `output_2.png`, ..., `output_5.png`
- コストは生成枚数に比例します
- 履歴には全てのファイルパスが記録されます

**レスポンス例:**
```
5 images generated successfully:
  1. cat_1.png
  2. cat_2.png
  3. cat_3.png
  4. cat_4.png
  5. cat_5.png

📊 Usage Statistics
- Estimated cost: $0.210 (5 images)

📝 History ID: 8796265a-8dc8-48f4-9b40-fe241985379b
```

---

## 🏷️ メタデータ埋め込み

全ての生成画像に自動的にメタデータが埋め込まれます。

### PNG画像
**tEXtチャンク**を使用して以下の情報を埋め込み：
- `MCP-Tool`: 使用したツール名
- `MCP-Prompt`: 生成プロンプト
- `MCP-Model`: モデル名（gpt-image-1）
- `MCP-Created`: 生成日時
- `MCP-Size`: 画像サイズ
- `MCP-Quality`: 品質レベル
- `MCP-Format`: 出力形式
- `MCP-History-UUID`: 履歴UUID

### JPEG画像
**EXIF UserComment**フィールドにJSON形式で情報を埋め込み。

### メタデータの確認方法

**macOS/Linux:**
```bash
# PNG
exiftool generated_image.png | grep MCP

# JPEG
exiftool generated_image.jpg | grep UserComment
```

**Windows (PowerShell):**
```powershell
# exiftoolをインストール後
exiftool generated_image.png
```

**メリット:**
- 画像ファイルと生成情報が一体化
- ファイルを移動してもメタデータが保持される
- 後から生成条件を確認可能

---

## 💡 使用シナリオ例

### シナリオ1: 複数バリエーションの生成
```
sample_countを使って、「サイバーパンクな都市」の画像を10枚生成してください
```
→ 一度のリクエストで10パターンの画像を取得

### シナリオ2: 長時間ジョブのバックグラウンド実行
```
非同期ジョブで、高品質な風景画を5枚生成してください。
その間に別の作業をしたいです。
```
→ ジョブIDを取得して、他の作業を続行
→ 後で `check_job_status` で確認

### シナリオ3: 過去の生成内容の確認
```
昨日生成した画像の履歴を表示してください
```
→ `list_history` で履歴を検索
→ UUID を使って `get_history_by_uuid` で詳細確認
→ 同じパラメータで再生成可能

### シナリオ4: メタデータの活用
```
この画像ファイルの生成条件を教えてください
```
→ exiftoolで画像からメタデータを読み取り
→ プロンプト、パラメータ、UUID を確認
→ UUID で履歴から詳細情報を取得

---

## 📊 機能比較表

| 機能 | v1.0.2以前 | v1.0.3以降 |
|------|-----------|-----------|
| 複数画像生成 | ❌ | ✅ 1-10枚 |
| 履歴管理 | ❌ | ✅ SQLite |
| 履歴検索 | ❌ | ✅ テキスト検索 |
| メタデータ | ❌ | ✅ PNG/JPEG |
| 非同期ジョブ | ❌ | ✅ 完全対応 |
| ジョブ監視 | ❌ | ✅ 進捗追跡 |
| バックグラウンド実行 | ❌ | ✅ 対応 |

---

## 🔧 技術詳細

### データベーススキーマ

**historyテーブル:**
```sql
CREATE TABLE history (
  uuid TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  parameters TEXT NOT NULL,
  output_paths TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  quality TEXT,
  output_format TEXT
);
```

**jobsテーブル:**
```sql
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  parameters TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  output_paths TEXT,
  history_uuid TEXT,
  error_message TEXT,
  progress INTEGER DEFAULT 0
);
```

### インデックス
- `idx_history_created_at` on `history(created_at DESC)`
- `idx_history_tool_name` on `history(tool_name)`
- `idx_jobs_status` on `jobs(status)`
- `idx_jobs_created_at` on `jobs(created_at DESC)`
- `idx_jobs_tool_name` on `jobs(tool_name)`

---

## 📚 関連ドキュメント

- メインドキュメント: [CLAUDE.md](./CLAUDE.md)
- テストレポート: [TEST_REPORT.md](./TEST_REPORT.md)
- 実装ガイド: [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

---

**最終更新:** 2025-10-16
**バージョン:** 1.0.3+
