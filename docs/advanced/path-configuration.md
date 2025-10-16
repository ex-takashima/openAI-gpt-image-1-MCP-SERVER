# パス設定とチルダ展開

## 概要

このMCPサーバーは、ユーザーフレンドリーなパス設定を実現するために、チルダ（`~`）展開機能をサポートしています。これにより、環境変数でホームディレクトリベースのパスを簡潔に記述できます。

## チルダ展開とは

チルダ展開は、UNIXシェルで一般的な機能で、`~` をユーザーのホームディレクトリに展開する機能です：

```bash
# macOS/Linux
~/Pictures/ai-images
↓
/Users/username/Pictures/ai-images

# Windows
~/Pictures/ai-images
↓
C:\Users\username\Pictures\ai-images
```

## サポート対象の環境変数

チルダ展開は以下の環境変数でサポートされています：

| 環境変数 | 説明 | 例 |
|---------|------|-----|
| `OPENAI_IMAGE_OUTPUT_DIR` | 生成画像の出力ディレクトリ | `~/Pictures/ai-images` |
| `OPENAI_IMAGE_INPUT_DIR` | 編集元画像の入力ディレクトリ | `~/Pictures/source-images` |
| `HISTORY_DB_PATH` | 履歴データベースのパス | `~/.openai-gpt-image/history.db` |

## 実装詳細

### expandTilde() 関数

チルダ展開は `src/utils/path.ts` の `expandTilde()` 関数で実装されています：

```typescript
import * as os from 'os';
import * as path from 'path';

/**
 * Expand tilde (~) to home directory
 * @param filePath - Path that may contain tilde
 * @returns Expanded absolute path
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}
```

### 処理フロー

```
1. 環境変数を読み取り
   例: OPENAI_IMAGE_OUTPUT_DIR="~/Pictures/ai-images"
   ↓
2. expandTilde() で展開
   "~/Pictures/ai-images"
   ↓
3. os.homedir() でホームディレクトリを取得
   macOS: /Users/username
   Windows: C:\Users\username
   Linux: /home/username
   ↓
4. path.join() で結合
   /Users/username/Pictures/ai-images
   ↓
5. 絶対パスとして使用
```

### 適用箇所

#### getDefaultOutputDirectory()

```typescript
export function getDefaultOutputDirectory(): string {
  const envPath = process.env.OPENAI_IMAGE_OUTPUT_DIR;

  if (envPath) {
    // チルダ展開を適用
    return expandTilde(envPath);
  }

  // デフォルト値もチルダ展開済み
  return path.join(os.homedir(), 'Downloads', 'openai-images');
}
```

#### getDefaultInputDirectory()

```typescript
export function getDefaultInputDirectory(): string {
  const envPath = process.env.OPENAI_IMAGE_INPUT_DIR;

  if (envPath) {
    // チルダ展開を適用
    return expandTilde(envPath);
  }

  // 入力ディレクトリが未設定の場合は出力ディレクトリを使用
  return getDefaultOutputDirectory();
}
```

#### getHistoryDbPath()

```typescript
export function getHistoryDbPath(): string {
  const envPath = process.env.HISTORY_DB_PATH;

  if (envPath) {
    // チルダ展開を適用
    return expandTilde(envPath);
  }

  // デフォルト: ~/.openai-gpt-image/history.db
  return path.join(os.homedir(), '.openai-gpt-image', 'history.db');
}
```

## 設定例

### Claude Desktop 設定

#### macOS/Linux

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server",
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_OUTPUT_DIR": "~/Pictures/ai-images",
        "OPENAI_IMAGE_INPUT_DIR": "~/Pictures/source-images",
        "HISTORY_DB_PATH": "~/.config/openai-gpt-image/history.db"
      }
    }
  }
}
```

#### Windows

```json
{
  "mcpServers": {
    "openai-gpt-image": {
      "command": "openai-gpt-image-mcp-server.cmd",
      "env": {
        "OPENAI_API_KEY": "sk-proj-...",
        "OPENAI_IMAGE_OUTPUT_DIR": "~/Pictures/ai-images",
        "OPENAI_IMAGE_INPUT_DIR": "~/Pictures/source-images",
        "HISTORY_DB_PATH": "~/.openai-gpt-image/history.db"
      }
    }
  }
}
```

**注意**: Windows でもチルダ (`~`) を使用できます。内部で `C:\Users\username` に展開されます。

### .env ファイル

```bash
# チルダを使った簡潔な記述
OPENAI_IMAGE_OUTPUT_DIR=~/Pictures/ai-images
OPENAI_IMAGE_INPUT_DIR=~/Pictures/source-images
HISTORY_DB_PATH=~/.openai-gpt-image/history.db

# 絶対パスでも可能（チルダ展開は不要）
# OPENAI_IMAGE_OUTPUT_DIR=/Users/username/Pictures/ai-images
```

## クロスプラットフォーム対応

### Node.js の os.homedir()

`os.homedir()` は Node.js の標準モジュールで、プラットフォームに応じて適切なホームディレクトリを返します：

| プラットフォーム | os.homedir() の戻り値 |
|----------------|---------------------|
| **macOS** | `/Users/username` |
| **Windows** | `C:\Users\username` |
| **Linux** | `/home/username` |

### パス区切り文字の自動処理

`path.join()` を使用することで、プラットフォームごとのパス区切り文字が自動的に処理されます：

```typescript
// macOS/Linux: /Users/username/Pictures/ai-images
// Windows: C:\Users\username\Pictures\ai-images
path.join(os.homedir(), 'Pictures', 'ai-images')
```

## セキュリティ考慮事項

### チルダ展開の安全性

1. **ホームディレクトリのみサポート**
   - `~username` 形式（他のユーザーのホームディレクトリ）は非サポート
   - `~` のみを `os.homedir()` で置換
   - セキュリティリスクを最小化

```typescript
// サポート
"~/Pictures"  // ✅ 自分のホームディレクトリ

// 非サポート（そのまま扱われる）
"~otheruser/Pictures"  // ❌ 展開されない
```

2. **パストラバーサル防止**
   - チルダ展開後もパスサニタイゼーションが適用される
   - ベースディレクトリ外へのアクセスは拒否される

```typescript
// セキュリティチェック（expandTilde 後）
const expandedPath = expandTilde("~/Pictures/ai-images");
const resolvedPath = path.resolve(expandedPath, userProvidedPath);

if (!resolvedPath.startsWith(expandedPath)) {
  throw new Error('Security error: Access denied');
}
```

3. **環境変数のサニタイゼーション**
   - 環境変数から読み取った値も検証される
   - 不正なパスは拒否される

## v1.0.4 で追加

この機能は v1.0.4 で追加されました。

### 追加の背景

v1.0.3 以前では、ユーザーが `OPENAI_IMAGE_OUTPUT_DIR=~/Pictures/ai-images` のように設定すると、以下のエラーが発生していました：

```
Error: Security error: Access denied
```

これは、チルダが展開されず、ベースディレクトリの検証で失敗していたためです。

### 解決方法

v1.0.4 では：
1. `expandTilde()` 関数を実装
2. 全てのパス設定読み取り時に自動適用
3. UNIXシェルと同様の動作を実現

## トラブルシューティング

### "Security error: Access denied" エラー

**症状**:
```
Error: Security error: Access denied
```

**原因**:
- チルダが正しく展開されていない可能性

**解決方法**:
1. v1.0.4 以降を使用していることを確認
2. 環境変数の設定を確認
   ```bash
   # 正しい
   OPENAI_IMAGE_OUTPUT_DIR=~/Pictures/ai-images

   # 間違い（引用符内でチルダが展開されない場合がある）
   OPENAI_IMAGE_OUTPUT_DIR="~/Pictures/ai-images"  # シェルによる
   ```
3. DEBUG モードで確認
   ```bash
   DEBUG=1 openai-gpt-image-mcp-server
   ```

### ホームディレクトリが正しく検出されない

**症状**:
- 意図しないディレクトリに画像が保存される

**確認方法**:
```javascript
// Node.js で確認
console.log(require('os').homedir());
```

**対処方法**:
- 環境変数 `HOME` (macOS/Linux) または `USERPROFILE` (Windows) が正しく設定されているか確認
- 絶対パスを使用する（チルダを使わない）

## ベストプラクティス

1. **ポータビリティのためにチルダを使用**
   ```bash
   # 推奨: 複数のマシンで設定を共有できる
   OPENAI_IMAGE_OUTPUT_DIR=~/Pictures/ai-images

   # 非推奨: マシン固有のパス
   OPENAI_IMAGE_OUTPUT_DIR=/Users/specific_user/Pictures/ai-images
   ```

2. **ドットディレクトリの活用**
   ```bash
   # Unix の慣習に従う
   HISTORY_DB_PATH=~/.openai-gpt-image/history.db

   # macOS Application Support の使用
   HISTORY_DB_PATH=~/Library/Application Support/OpenAI-GPT-Image/history.db
   ```

3. **Windows でも ~ を使う**
   ```json
   {
     "env": {
       "OPENAI_IMAGE_OUTPUT_DIR": "~/Pictures/ai-images"
     }
   }
   ```
   Windows でも動作し、`C:\Users\username\Pictures\ai-images` に展開されます。

4. **絶対パスとの併用**
   ```bash
   # 必要に応じて絶対パスも使用可能
   OPENAI_IMAGE_OUTPUT_DIR=/mnt/shared/ai-images
   ```

## まとめ

チルダ展開機能により：

- **簡潔な設定**: `~/Pictures/ai-images` で済む
- **ポータビリティ**: ユーザー名をハードコードする必要なし
- **クロスプラットフォーム**: macOS、Windows、Linux で同じ設定が動作
- **UNIXフレンドリー**: シェルと同様の動作

この機能は v1.0.4 以降で利用可能で、後方互換性があります（絶対パスも引き続き使用可能）。
