# Group Split Lightbox 設計メモ（推奨案）

このドキュメントは、`core/group` を使って「通常表示用」と「モーダル表示用」を分離する実装方針をまとめたものです。

## 結論

- **専用ラッパーブロックは追加しない**
- 既存の `core/group` 拡張で、親子グループに役割を持たせる
- 既存コンテンツ互換を保つため、デフォルトは現行動作（同内容を表示 + モーダル）を維持する

## 採用理由

- 非破壊設計（`save()` を壊さない）と現行アーキテクチャ方針に一致
- 学習コストが低い（新規ブロックを覚える必要がない）
- 将来、`core/cover` など他ブロックへ展開しやすい

## エディタ UX の必須要件

以下は実装時の必須要件とする。

- **Lightbox 用グループで、表示用とモーダル用がパッと見で判別できること**
- ブロック未選択時でも判別できること
- 色だけに依存せず、ラベル（バッジ）でも区別すること

推奨 UI:

- 表示用スロット: `表示用` バッジ + 青系の枠
- モーダル用スロット: `モーダル用` バッジ + オレンジ系の枠
- 親グループ（split モード）: `分割モード` のガイド表示

## 属性設計（提案）

### 親 `core/group`（Lightbox コンテナ）

- `reformboxEnabled: boolean`
- `reformboxMode: 'same' | 'split'`（default: `'same'`）
- `reformboxId: string`
- `reformboxOverlayClose: boolean`

### 子 `core/group`（親が split の場合のみ有効）

- `reformboxSlot: 'none' | 'preview' | 'modal'`（default: `'none'`）

## 表示ルール（提案）

### `reformboxMode = 'same'`

- 現行どおり
- 本文表示した内容をそのままモーダルにも出す

### `reformboxMode = 'split'`

- `preview` スロット: ページ本文に表示
- `modal` スロット: モーダル内に表示
- `none` スロット: 互換性のため `preview` 扱い

フェイルセーフ:

- `modal` が 1 つもない場合は、編集画面で警告表示
- フロントでは `preview` をモーダルへフォールバック表示（空モーダル回避）

## 実装ポイント

### Editor (`src/editor/index.js`, `src/editor/editor.css`)

- 親 Group の Inspector に `表示モード` を追加
  - `same`: 現在と同じ
  - `split`: 表示用 / モーダル用を分離
- 子 Group の Inspector に `スロット種別` を追加
  - 表示用 / モーダル用
- `editor.BlockListBlock` でクラス付与
  - `reformbox-slot-preview`
  - `reformbox-slot-modal`
  - `reformbox-mode-split`
- CSS でバッジと枠を表示（未選択でも視認可）

### Frontend (`includes/class-reformbox.php`)

- `render_block_core/group` で `reformboxMode` を判定
- `split` の場合は、スロット別に出力 HTML を組み立て
  - preview 用 HTML
  - modal 用 HTML（overlay 内）
- 既存のアクセシビリティ要件（ESC, focus trap, ARIA）を維持

### スタイル/JS

- 既存の `src/style.css` / `src/view.js` を流用
- 必要なら split モード専用の editor 視覚補助だけ追加

## 受け入れ条件（Done 定義）

- 編集画面で「表示用」と「モーダル用」が即座に判別できる
- split モードで preview と modal が意図どおり分離表示される
- same モードおよび既存投稿の表示が変わらない
- `core/image` は引き続き WordPress core Lightbox 委譲
- キーボード操作/ARIA/focus trap が回帰しない

## 段階導入（推奨）

1. 属性追加 + Editor 視覚化（フロント動作は据え置き）
2. フロント split レンダリング実装
3. README / readme.txt 同期、回帰テスト、リリース

