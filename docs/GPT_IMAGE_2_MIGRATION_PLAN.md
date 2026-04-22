# GPT-Image-2 対応 実装計画書（次セッション引き継ぎ）

**作成日**: 2026-04-22
**対象バージョン**: openai-gpt-image-mcp-server v1.2.4 → v1.3.0 (予定)
**前提**: NanoCanvas PWA (v2.9.2) で同等の対応を完了済み。本書はそこで得た知見を当MCPサーバに移植するための設計書。

---

## 1. ゴール

現行の `gpt-image-1` / `gpt-image-1.5` に加え、**`gpt-image-2`** をMCPツールから選択可能にする。対象ツール:

- `generate_image`
- `edit_image`
- `transform_image`
- `submit_batch_job` / バッチCLI (間接的に全対応)

---

## 2. gpt-image-2 仕様サマリー（2026-04時点・OpenAI公式）

| 項目 | 値 |
|---|---|
| エンドポイント | `POST /v1/images/generations` / `POST /v1/images/edits`（既存と同じ） |
| 最大プロンプト長 | 32,000文字（1.5と同じ） |
| 最大入力画像 | <50MB / 枚 |
| サイズ制約（**柔軟**） | 各辺16px刻み / 最大辺3840px / アスペクト比≤3:1 / 総画素数 655,360〜8,294,400 |
| 代表プリセット | `auto`, `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `2048x1152`, `1152x2048`, (実験的) `3840x2160`, `2160x3840` |
| 品質 | `auto` / `low` / `medium` / `high` |
| 出力フォーマット | `png` / `jpeg` / `webp` |
| ストリーミング | 対応（`partial_images` 0-3） |
| レート制限 (Tier1/2/3/4/5 IPM) | 5 / 20 / 50 / 150 / 250 |

### 料金（USD / 枚）

| 解像度 | low | medium | high |
|---|---|---|---|
| 1024×1024 | $0.006 | $0.053 | $0.211 |
| 1536×1024 / 1024×1536 | $0.005 | $0.041 | $0.165 |
| 3840×2160 / 2160×3840 (実験的) | ~$0.02 | ~$0.15 | ~$0.41 |

> **注意**: 2560×1440 を超えるサイズは OpenAI 公式で "experimental" 扱い。画質・安定性は保証されない。

---

## 3. gpt-image-1 / 1.5 との致命的な差分

| 機能 | gpt-image-2 | 1.5 | 1 | 実装影響 |
|---|---|---|---|---|
| `input_fidelity` パラメータ | ❌ **送るとAPIエラー** | ✅ | ❌ | モデル別ガード必須 |
| `background: transparent` | ❌ **非対応** | ✅ | ✅ | モデル別ガード必須 |
| 参照画像のfidelity | 常にhigh（自動） | 設定可 | 固定low | — |
| サイズプリセット | **柔軟**（16px刻み） | 3種固定 | 3種固定 | `validateImageSize()` の大幅拡張が必要 |
| サイズ上限 | 3840px / 8.29M px | 1536px | 1536px | 既存バリデータでは弾かれる |

### 最重要ポイント

1. **`input_fidelity` を `gpt-image-2` で送信すると 400 エラー**。`edit.ts` と `transform.ts` で条件分岐必須
2. **`transparent_background` も同様**。`generate.ts` でのガード必須
3. **`validateImageSize()` はハードコード3種のみ**。gpt-image-2 対応なら関数シグネチャを `(size, model)` に変更する必要あり

---

## 4. 実装ポイント（ファイル別チェックリスト）

### 4-1. `src/types/tools.ts`

```typescript
// 変更前
export type ImageModel = 'gpt-image-1' | 'gpt-image-1.5';
export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

// 変更後
export type ImageModel = 'gpt-image-1' | 'gpt-image-1.5' | 'gpt-image-2';

// ImageSize は後方互換のため union は残しつつ、string も許容する形へ
export type ImageSizePreset =
  | '1024x1024'
  | '1024x1536'
  | '1536x1024'
  | '2048x2048'
  | '2048x1152'
  | '1152x2048'
  | '3840x2160'  // experimental
  | '2160x3840'  // experimental
  | 'auto';
export type ImageSize = ImageSizePreset | (string & {}); // カスタムも許容
```

**モデル能力表**を追加（新規ファイル `src/types/models.ts` 推奨）:

```typescript
export interface ModelCapabilities {
  supportsInputFidelity: boolean;
  supportsTransparentBg: boolean;
  supportedSizePresets: ImageSizePreset[];
  sizeConstraints?: {
    edgeStep: number;
    maxEdge: number;
    ratioMax: number;
    pxMin: number;
    pxMax: number;
  };
  maxPromptLength: number;
  experimentalSizes?: string[];
}

export const MODEL_CAPABILITIES: Record<ImageModel, ModelCapabilities> = {
  'gpt-image-1':   { supportsInputFidelity: false, supportsTransparentBg: true, supportedSizePresets: ['1024x1024','1024x1536','1536x1024','auto'], maxPromptLength: 32000 },
  'gpt-image-1.5': { supportsInputFidelity: true,  supportsTransparentBg: true, supportedSizePresets: ['1024x1024','1024x1536','1536x1024','auto'], maxPromptLength: 32000 },
  'gpt-image-2':   {
    supportsInputFidelity: false, // 送信NG
    supportsTransparentBg: false, // 非対応
    supportedSizePresets: ['auto','1024x1024','1536x1024','1024x1536','2048x2048','2048x1152','1152x2048','3840x2160','2160x3840'],
    sizeConstraints: { edgeStep: 16, maxEdge: 3840, ratioMax: 3, pxMin: 655360, pxMax: 8294400 },
    experimentalSizes: ['3840x2160','2160x3840'],
    maxPromptLength: 32000
  }
};
```

### 4-2. `src/utils/image.ts`

```typescript
// validateImageSize() を モデル引数で拡張
export function validateImageSize(size: string, model: ImageModel = 'gpt-image-1'): boolean {
  if (size === 'auto') return true;
  const caps = MODEL_CAPABILITIES[model];
  if (caps.supportedSizePresets.includes(size as ImageSizePreset)) return true;

  // gpt-image-2 のカスタムサイズ検証
  if (!caps.sizeConstraints) return false;
  const m = /^(\d+)x(\d+)$/.exec(size);
  if (!m) return false;
  const [w, h] = [parseInt(m[1],10), parseInt(m[2],10)];
  const c = caps.sizeConstraints;
  if (w % c.edgeStep !== 0 || h % c.edgeStep !== 0) return false;
  if (w > c.maxEdge || h > c.maxEdge) return false;
  if (Math.max(w,h) / Math.min(w,h) > c.ratioMax) return false;
  const px = w * h;
  if (px < c.pxMin || px > c.pxMax) return false;
  return true;
}
```

### 4-3. `src/utils/cost.ts`

```typescript
// gpt-image-2 の料金テーブル追加
const IMAGE_COST_GPT_IMAGE_2: Record<string, Record<string, number>> = {
  low: {
    '1024x1024': 0.006,
    '1024x1536': 0.005,
    '1536x1024': 0.005,
    '3840x2160': 0.02,   // experimental 概算
    '2160x3840': 0.02,
  },
  medium: {
    '1024x1024': 0.053,
    '1024x1536': 0.041,
    '1536x1024': 0.041,
    '3840x2160': 0.15,
    '2160x3840': 0.15,
  },
  high: {
    '1024x1024': 0.211,
    '1024x1536': 0.165,
    '1536x1024': 0.165,
    '3840x2160': 0.41,
    '2160x3840': 0.41,
  },
};

// calculateCost で model='gpt-image-2' の分岐追加
const pricingTable =
  model === 'gpt-image-2'   ? IMAGE_COST_GPT_IMAGE_2 :
  model === 'gpt-image-1.5' ? IMAGE_COST_GPT_IMAGE_1_5 :
                              IMAGE_COST_GPT_IMAGE_1;

// 未登録サイズ時のフォールバック
const imageGenerationCost = pricingTable[quality]?.[size]
  || pricingTable[quality]?.['1024x1024']
  || 0.05;
```

### 4-4. `src/tools/generate.ts`

**Before** (L.126-128):
```typescript
if (transparent_background) {
  requestParams.transparent_background = true;
}
```

**After**:
```typescript
// gpt-image-2 は transparent_background 非対応
if (transparent_background) {
  if (!MODEL_CAPABILITIES[model].supportsTransparentBg) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `transparent_background is not supported by ${model}. Use gpt-image-1 or gpt-image-1.5.`
    );
  }
  requestParams.transparent_background = true;
}
```

また L.56-61 の `validateImageSize(size)` 呼び出しを `validateImageSize(size, model)` に変更。

### 4-5. `src/tools/edit.ts` / `src/tools/transform.ts`

`input_fidelity` の処理箇所を探し（`requestParams.input_fidelity = ...` の付近）、以下のガードを追加:

```typescript
if (input_fidelity) {
  const caps = MODEL_CAPABILITIES[model];
  if (!caps.supportsInputFidelity) {
    // gpt-image-2: 自動でhigh固定なので警告ログのみ（ユーザ指示を尊重しエラーにしない）
    debugLog(`[WARN] input_fidelity=${input_fidelity} ignored for ${model} (always high)`);
  } else {
    requestParams.input_fidelity = input_fidelity;
  }
}
```

**方針判断**: エラーにするか無視するか。NanoCanvas では "gpt-image-2 では送らない" で統一したが、MCP ツール利用の観点ではLLMが過去の知識で `input_fidelity` を渡してくる可能性が高いため、**警告ログ＋無視**が実用的。

### 4-6. `src/index.ts` — Tool Schema 定義

全ツール (`generate_image` / `edit_image` / `transform_image` / `execute_tool`) の schema で:

```typescript
// L.89, L.169, L.242, L.391 の model enum
enum: ['gpt-image-1', 'gpt-image-1.5', 'gpt-image-2'],
description: 'Model to use. gpt-image-2: latest, flexible sizes up to 4K (experimental). gpt-image-1.5: 4x faster, 20% cheaper. gpt-image-1: original. (default: gpt-image-1)',

// L.94, L.174 などの size enum
// 選択肢: enum を外して string + description にするか、全サイズを enum に列挙するか
// 推奨: enum を使いつつ代表プリセットのみ列挙、description で柔軟サイズを案内
enum: ['auto','1024x1024','1024x1536','1536x1024','2048x2048','2048x1152','1152x2048','3840x2160','2160x3840'],
description: 'Image size. gpt-image-2 also supports custom sizes (16px multiples, max 3840px/edge, ratio ≤3:1). 3840x2160/2160x3840 are experimental (unstable quality). (default: auto)',
```

### 4-7. `src/utils/batch-manager.ts` / `src/cli/batch.ts`

バッチ処理内で `model` を受け渡しているはず。エンドツーエンドで gpt-image-2 が通ることを verify。おそらく変更不要だが:

- [ ] バッチ設定YAML/JSONサンプルに gpt-image-2 例を追加（examples/）
- [ ] README 更新

### 4-8. `openai` npm SDK のバージョン

現在 `openai@^4.73.0`。2026-04時点で最新は 5.x 系と思われる（要確認）。`gpt-image-2` を model string として受理するかはパススルーなので 4.x でも動く可能性が高いが、**最新安定版への更新を推奨**:

```bash
npm install openai@latest
# 破壊的変更があれば src/ 側も調整
```

TypeScript型で `ImageGenerateParams.model` が string literal union の場合、SDK側に `gpt-image-2` が未追加なら `as any` キャストまたは SDK アップグレードで対応。

---

## 5. 段階的実装プラン

### Phase 1（最小構成・1時間）
1. `types/tools.ts`: `ImageModel` に `gpt-image-2` 追加
2. `MODEL_CAPABILITIES` 定数導入（新規 `types/models.ts`）
3. `utils/cost.ts`: 料金テーブル追加・`calculateCost()` 分岐
4. `tools/generate.ts`: `transparent_background` ガード
5. `tools/edit.ts` / `transform.ts`: `input_fidelity` ガード（警告のみ）
6. `index.ts`: model enum に追加・description 更新
7. ビルド確認: `npm run build`
8. 手動テスト: `gpt-image-2 / 1024x1024 / auto` で generate_image

### Phase 2（標準構成・+1時間）
9. `utils/image.ts`: `validateImageSize(size, model)` 拡張
10. サイズプリセット（2K系）を index.ts の schema enum に追加
11. examples/ に gpt-image-2 のバッチJSON追加
12. README.md / README.ja.md に gpt-image-2 節追加
13. CHANGELOG.md 更新
14. バージョンバンプ: `npm version minor` (1.2.4 → 1.3.0)

### Phase 3（フル構成・+2時間）
15. 4K（experimental）サイズ対応 + 警告メッセージ
16. カスタムサイズ（任意の 16px 刻み）対応
17. ストリーミング（`partial_images`）オプション追加 — MCPの stdio 特性上優先度低
18. バッチCLIで複数モデル混在テスト

---

## 6. 既知の落とし穴

1. **`input_fidelity` の扱い**: LLMが過去の知識で gpt-image-2 に送る可能性が高い → エラーにせず警告で吸収推奨
2. **`transparent_background=true` + `gpt-image-2`**: ユーザ意図が明確なので **エラー**にして別モデルを促すのが親切
3. **`size` enum 列挙**: カスタムサイズ対応でJSON Schemaを緩めると LLM が無茶なサイズを投げ始める → enum+説明のハイブリッドが吉
4. **`openai` SDK のモデル型**: SDKが `'gpt-image-2'` を認識しない版だと TypeScript コンパイルが通らない → SDK更新 or `as any`
5. **コスト計算のフォールバック**: 新プリセット（2048x2048等）が pricing table に無い場合 0.05 USD 固定になる現行コード → **total-pixels ベースの線形補間**で推定するのが理想
6. **PNG メタデータ埋め込み** (`utils/metadata.ts`): `buildMetadataObject()` の引数に model が入っているので `gpt-image-2` もそのまま記録される（検証不要）
7. **SQLite history テーブル**: `model` カラムが TEXT なら変更不要。スキーマ確認（`src/utils/database.ts`）
8. **Batch CLI の既存バッチ互換性**: 1.2.4 で生成したバッチ設定は model未指定ならデフォルト `gpt-image-1` のまま動く。gpt-image-2 へ切替は明示指定のみ

---

## 7. テストチェックリスト（Phase 2 完了時）

```bash
# ビルド
npm run build

# ユニット的確認（手動）
# 1. 基本生成
echo '{"prompt":"a cat","model":"gpt-image-2","size":"1024x1024"}' | node dist/index.js

# 2. 2Kサイズ
# model=gpt-image-2, size=2048x2048

# 3. 4K experimental
# model=gpt-image-2, size=3840x2160  → 警告ログが出る & 成功

# 4. 不正: transparent_background + gpt-image-2
# → InvalidParams エラー

# 5. 不正: 1.5 では通る input_fidelity が 2 では警告で無視
# model=gpt-image-2, input_fidelity=high → debugログに警告、API成功

# 6. edit_image で参照画像
# model=gpt-image-2, reference_image_path=...

# 7. 後方互換性
# model=gpt-image-1 の既存コードが壊れていない

# 8. コスト計算
# calculateCost が 2048x2048 等の新サイズでフォールバック動作

# 9. バッチ
npm run batch -- examples/batch-gpt-image-2.json
```

---

## 8. NanoCanvas で既に実装済みのコード（参照用）

同一ロジックの JS 実装が以下にある。TypeScript 移植時の参照推奨:

- `~/projects/NanoCanvas/nanocanvas-pwa/src/app/config/constants.js`
  - `PROVIDERS.OPENAI.MODELS` — モデル能力定義の完成形
  - `estimateOpenAICost()` / `validateOpenAISize()` — 本書 §4-2, §4-3 の元ネタ
- `~/projects/NanoCanvas/nanocanvas-pwa/src/app/core/OpenAIImageClient.js`
  - `applyModelGuards()` — input_fidelity/transparent のモデル別処理
  - `editImage()` — multipart/form-data での参照画像送信（Node側は `openai` SDK の `toFile` で代替可能）

**重要**: NanoCanvas 側は `gpt-image-2` 選択時に参照画像を multipart で送るが、本 MCP サーバは **`openai` npm SDK** を使っているので `openai.images.edit({ image, mask, ... })` 呼び出しで済む。multipart 組み立ては不要。

---

## 9. 参考リンク

- [GPT Image 2 Model | OpenAI](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Image generation guide | OpenAI](https://developers.openai.com/api/docs/guides/image-generation)
- [Create image | OpenAI API Reference](https://developers.openai.com/api/reference/resources/images/methods/generate)
- [Generate images with GPT Image | Cookbook](https://cookbook.openai.com/examples/generate_images_with_gpt_image)
- [ChatGPT Images 2.0 on fal.ai](https://fal.ai/gpt-image-2)（4K 推奨フロー）

---

## 10. 次セッションの推奨初動

1. 本書を読み込む
2. `src/types/tools.ts` から Phase 1 を着手
3. `npm run build` でビルド確認しつつ進める
4. 途中で `openai` SDK の型エラーが出たら SDK 更新を検討
5. Phase 1 完了時点で git commit、動作確認後に Phase 2 へ

---

_本書は NanoCanvas PWA での gpt-image-2 対応実装 (v2.9.0〜v2.9.2) から抽出された知見を元に作成。最新の API 仕様は必ず公式ドキュメントで確認すること。_
