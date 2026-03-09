[English](../README.md) | [日本語](README.ja.md)

# ReformBox – Universal Lightbox（日本語）

WordPress の Lightbox を画像以外にも拡張するプラグインです。現在は **グループ・段落・ポスター画像付き動画** ブロックを直接ライトボックス化でき、**画像** は WordPress コア Lightbox に委譲します。ブロックエディタの標準 UI から設定するだけで、コード不要です。

> **ステータス:** v0.3.1 - ドキュメントと挙動説明の更新

## ReformBox とは？

従来の Lightbox プラグインは「画像を拡大表示」するだけでした。ReformBox は Lightbox を **対応ブロック向けの汎用コンテンツコンテナ**として再定義し、Gutenberg ブロックの内容をモーダル表示できるようにします。

### 使用例

- **画像拡大（Core 連携）** - 画像リンクのクリックで WordPress コア Lightbox を表示（ReformBox はサイドバーの Core Lightbox トグル連携を提供）
- **動画プレイヤー（ポスター必須）** - ポスター画像（カバー画像）をクリックして、Lightbox オーバーレイ内で動画を再生
- **詳細ポップアップ** - 説明文、FAQ、追加情報をモーダルで表示
- **CTA モーダル** - お問い合わせフォームやメッセージを表示
- **コンテンツプレビュー** - テキスト + 画像 + ボタンなどのグループコンテンツをモーダル化
- **ギャラリー** - *(将来予定)* 前/次のナビゲーション付き複数コンテンツ表示

## 機能一覧

| 機能 | 状態 |
|---|---|
| 画像ブロック -> ライトボックス（WordPress コア） | ✅ |
| 動画ブロック -> ライトボックス（ポスター画像必須） | ✅ |
| グループブロック -> ライトボックスコンテナ | ✅ |
| グループ分割モード（表示用/モーダル用スロット） | ✅ |
| 段落ブロック -> セルフライトボックス | ✅ |
| Zoom アニメーション（コア準拠） | ✅ |
| ESC キーで閉じる | ✅ |
| オーバーレイクリックで閉じる（任意） | ✅ |
| フォーカストラップ & キーボード操作 | ✅ |
| ARIA ダイアログ属性 | ✅ |
| アセット遅延ロード | ✅ |
| RTL 対応 | ✅ |
| ギャラリーナビゲーション（前/次） | 🔜 予定 |
| 埋め込みブロック対応 | 🔜 予定 |
| カスタムアニメーションフック | 🔜 予定 |

## 仕組み

ReformBox は対応ブロックのサイドバーに **「ReformBox」パネル**を追加します。カスタムブロックの学習は不要です。既存のコアブロックをそのまま拡張します。

### ブロックの役割

| 役割 | 対応ブロック | 説明 |
|---|---|---|
| **コンテナ** | グループ | `same`（本文とモーダルで同じ内容）と `split`（子 Group を表示用/モーダル用に分離）の両方に対応 |
| **セルフライトボックス** | 段落, ポスター画像付き動画 | クリックで自身をライトボックス表示（動画はポスター画像をトリガーとして使用） |
| **Core 画像連携** | 画像（`core/image`） | ReformBox パネルのトグルで Core Lightbox 設定（`lightbox.enabled`）を切り替え。表示/クリック挙動は WordPress コアが担当 |

### 使い方

1. **対象ブロックを配置** - グループ/段落/画像、またはポスター画像付きの動画ブロックを追加します。
2. **ReformBox を有効化** - サイドバーの ReformBox パネルで有効化します（画像は Core Lightbox トグルを切り替え）。
3. **完了** - 訪問者がブロックをクリックすると、同内容がモーダルオーバーレイで表示されます。

動画ブロックの場合は、先にブロック設定でポスター画像を設定してから、ReformBox パネルの「クリックでライトボックス表示」を ON にします。ポスター画像が未設定の場合、このトグルは有効化できません。
画像ブロックの場合は ReformBox パネルの「Enable Core Image Lightbox」で WordPress コア Lightbox を ON/OFF します。ReformBox が画像オーバーレイを独自実装するのではなく、画像リンクのクリック挙動と表示はコア実装をそのまま利用します。
グループブロックでは `表示モード` を選べます。`same` は従来どおり同内容表示、`split` は子 Group の `スロット種別` で表示用/モーダル用を分離します。
`split` モードでモーダル用スロットが未設定の場合は、空モーダルを避けるため表示用コンテンツへフォールバックします。
親のグループで ReformBox が有効な場合、内側ブロックの ReformBox 設定は親に継承され、子ブロック側の設定UIは無効化されます。

### 設定項目

| 設定 | 対象 | オプション |
|---|---|---|
| ReformBox を有効化 | グループ, 段落, ポスター画像付き動画 | ON / OFF |
| Core 画像 Lightbox を有効化 | 画像 | ON / OFF（`core/image` の `lightbox.enabled` を連携して切替） |
| 表示モード | グループ（ReformBox 有効時） | Same / Split |
| スロット種別 | split 親配下の子 Group | None / Preview / Modal |
| オーバーレイクリックで閉じる | グループ, 段落, ポスター画像付き動画 | ON / OFF |

## 動作要件

- WordPress 6.4 以上
- PHP 7.4 以上
- ブロックエディタ（Gutenberg）

## インストール

1. このリポジトリを `wp-content/plugins/reformbox/` にダウンロードまたは clone
2. `npm install && npm run build` を実行
3. WP 管理画面 -> プラグイン -> **ReformBox - Universal Lightbox** を有効化

## 開発

```bash
# 依存関係インストール
npm install

# 開発ビルド（ウォッチモード）
npm run start

# プロダクションビルド
npm run build

# 配布用プラグイン ZIP を作成（reformbox.zip）
npm run release:zip
```

### 配布用 ZIP の作成

リリース前は次の手順を実行します。

```bash
npm install
npm run lint:js
npm run lint:css
npm run release:zip
```

プロジェクトルートに `reformbox.zip` が生成され、**WP 管理画面 -> プラグイン -> プラグインを追加 -> プラグインのアップロード** からそのままインストールできます。

この ZIP にはコンパイル済みアセットだけでなく、生成元を確認できる `src/`, `package.json`, `webpack.config.js` も含めています。WordPress.org 審査でソースを追える状態を維持するためです。

### WordPress.org リリース

公式ディレクトリ向けにリリースする場合は、次を実行します。

```bash
npm install
npm run lint:js
npm run lint:css
npm run build
npm run release:zip
```

その後に以下を確認します。

1. **Plugin Check** プラグインの `Plugin Repo` ルールセットを通す
2. `Tested up to` を更新する前に、最新の安定版 WordPress で動作確認する
3. ビルド済み `build/` を含めて WordPress.org SVN の `trunk/` へ配置する
4. 初回 SVN 反映前に、割り当てられたプラグインディレクトリの slug が `reformbox` であり、Text Domain と一致していることを確認する
5. 同じ内容を `tags/<version>/` にも配置し、`readme.txt` の `Stable tag` と同期する

### プロジェクト構成

```text
reformbox/
├── reformbox.php              # プラグインブートストラップ
├── includes/
│   └── class-reformbox.php    # コアクラス（アセット管理 + render_block フィルタ）
├── src/
│   ├── editor/
│   │   ├── index.js           # ブロックエディタ拡張（フィルタ + UI）
│   │   └── editor.css         # エディタ専用スタイル
│   ├── view.js                # フロントエンドライトボックス（バニラ JS）
│   └── style.css              # フロントエンドスタイル
├── build/                     # コンパイル済みアセット（git-ignored）
├── package.json
└── webpack.config.js
```

### アーキテクチャ

- **カスタムブロック不使用** - WordPress JS フィルタ（`blocks.registerBlockType`, `editor.BlockEdit`, `editor.BlockListBlock`）でコアブロックを拡張
- **画像ライトボックスは Core 優先** - `core/image` のセルフライトボックスは WordPress コア Lightbox に委譲
- **カスタムオーバーレイも Core に寄せる** - `wp-lightbox-overlay`, `close-button`, `wp-lightbox-container` など、使える箇所ではコア Lightbox のクラス規約に合わせる
- **サーバーサイドレンダリング** - PHP `render_block_core/{name}` フィルタでフロントエンドにライトボックス HTML を注入
- **Group 分割レンダリング** - `split` 時は子 `core/group` を表示用/モーダル用に振り分け、モーダル未設定時は安全にフォールバック
- **非破壊的設計** - `save()` を変更しないため、プラグインの有効/無効に関わらずブロックは常に有効
- **遅延ロード** - ライトボックス対応ブロックがページに存在する場合のみ CSS/JS をエンキュー
- **動画は開くまで先読みしない** - セルフライトボックスの動画は、オーバーレイを開くまで eager preload / autoplay を抑制
- **軽量フロントエンド** - WordPress 依存なしのバニラ JS（ミニファイ後 約2.3 KB）

### Core レイアウト追従リファレンス

今後、WordPress コアの Lightbox レイアウトに追従する際の参照先は以下です。

- `CORE_LIGHTBOX_LAYOUT_REFERENCE.md`
- `GROUP_SPLIT_LIGHTBOX_DESIGN.ja.md`（表示用/モーダル用の分離設計）

### CSS カスタマイズ

テーマで以下のクラスをオーバーライドできます。

```css
.reformbox-overlay { }          /* フルスクリーン背景 */
.reformbox-lightbox-container { }/* モーダルボックス */
.reformbox-content { }          /* 内部コンテンツラッパー */
.reformbox-close { }            /* 閉じるボタン */
.reformbox-overlay--media { }   /* 画像/動画バリアント */
```

## ライセンス

GPL-2.0-or-later
