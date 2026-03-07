[English](README.md) | [日本語](README.ja.md)

# ReformBox – Universal Lightbox（日本語）

WordPress の Lightbox を画像以外にも拡張するプラグインです。画像・動画・テキスト・グループなど、**あらゆるブロックコンテンツ**をライトボックス（モーダル）で表示できます。ブロックエディタの標準 UI から設定するだけで、コード不要です。

> **ステータス:** v0.1.0 - 初期実装

## ReformBox とは？

従来の Lightbox プラグインは「画像を拡大表示」するだけでした。ReformBox は Lightbox を **汎用コンテンツコンテナ**として再定義し、Gutenberg ブロックの内容をそのままモーダル表示できるようにします。

### 使用例

- **画像拡大** - サムネイルクリックでフルサイズ画像を表示
- **動画プレイヤー** - ページ遷移なしに動画をオーバーレイ再生
- **詳細ポップアップ** - 説明文、FAQ、追加情報をモーダルで表示
- **CTA モーダル** - お問い合わせフォームやメッセージを表示
- **コンテンツプレビュー** - テキスト + 画像 + ボタンなどのグループコンテンツをモーダル化
- **ギャラリー** - *(将来予定)* 前/次のナビゲーション付き複数コンテンツ表示

## 機能一覧

| 機能 | 状態 |
|---|---|
| 画像ブロック -> ライトボックス（WordPress コア） | ✅ |
| 動画ブロック -> ライトボックス | ✅ |
| グループブロック -> ライトボックスコンテナ | ✅ |
| カバーブロック -> ライトボックスコンテナ | ✅ |
| ボタン / 段落 / 見出し / 画像 / 動画 -> トリガー | ✅ |
| Fade / Zoom / Slide アニメーション | ✅ |
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
| **コンテナ** | グループ, カバー | ライトボックス内に表示されるコンテンツ |
| **セルフライトボックス** | 画像（Core）, 動画（ReformBox） | クリックで自身をライトボックス表示 |
| **トリガー** | ボタン, 段落, 見出し, 画像, 動画 | クリックで紐付けたライトボックスを開く |

### 使い方

1. **コンテナを作成** - グループブロックを追加し、サイドバーで「ReformBox」を有効化します。内部に任意のコンテンツを配置すると、**ReformBox ID** が自動生成されます。
2. **トリガーを作成** - ボタンなどのトリガーブロックを追加し、**ライトボックスターゲット ID** にコンテナの ReformBox ID を入力します。
3. **完了** - 訪問者がトリガーをクリックすると、コンテナ内容がモーダルオーバーレイで表示されます。

動画ブロックの場合は ReformBox パネルの「クリックでライトボックス表示」を ON にし、必要に応じてアニメーションやオーバーレイクリック時の挙動も設定できます。
画像ブロックの場合は ReformBox パネルから WordPress コア Lightbox（「Enable Core Image Lightbox」）を有効化します。

### 設定項目

| 設定 | 対象 | オプション |
|---|---|---|
| ReformBox を有効化 | コンテナ, 動画（セルフライトボックス） | ON / OFF |
| Core 画像 Lightbox を有効化 | 画像 | ON / OFF |
| ReformBox ID | コンテナ, 動画（セルフライトボックス） | 自動生成またはカスタム |
| ライトボックスターゲット ID | トリガー | 対象ライトボックスの ID |
| アニメーション | コンテナ, 動画（セルフライトボックス） | Fade, Zoom, Slide |
| オーバーレイクリックで閉じる | コンテナ, 動画（セルフライトボックス） | ON / OFF |

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

### プロジェクト構成

```text
reformbox/
├── reformbox.php              # プラグインブートストラップ
├── includes/
│   └── class-reformbox.php    # コアクラス（アセット管理 + render_block フィルタ）
├── src/
│   ├── editor/
│   │   ├── index.js           # ブロックエディタ拡張（フィルタ + UI）
│   │   └── editor.scss        # エディタ専用スタイル
│   ├── view.js                # フロントエンドライトボックス（バニラ JS）
│   └── style.scss             # フロントエンドスタイル
├── build/                     # コンパイル済みアセット（git-ignored）
├── package.json
└── webpack.config.js
```

### アーキテクチャ

- **カスタムブロック不使用** - WordPress JS フィルタ（`blocks.registerBlockType`, `editor.BlockEdit`, `editor.BlockListBlock`）でコアブロックを拡張
- **画像ライトボックスは Core 優先** - `core/image` のセルフライトボックスは WordPress コア Lightbox に委譲
- **カスタムオーバーレイも Core に寄せる** - `wp-lightbox-overlay`, `close-button`, `wp-lightbox-container` など、使える箇所ではコア Lightbox のクラス規約に合わせる
- **サーバーサイドレンダリング** - PHP `render_block_core/{name}` フィルタでフロントエンドにライトボックス HTML を注入
- **非破壊的設計** - `save()` を変更しないため、プラグインの有効/無効に関わらずブロックは常に有効
- **遅延ロード** - ライトボックス対応ブロックがページに存在する場合のみ CSS/JS をエンキュー
- **動画は開くまで先読みしない** - セルフライトボックスの動画は、オーバーレイを開くまで eager preload / autoplay を抑制
- **軽量フロントエンド** - WordPress 依存なしのバニラ JS（ミニファイ後 約2.3 KB）

### CSS カスタマイズ

テーマで以下のクラスをオーバーライドできます。

```css
.reformbox-overlay { }          /* フルスクリーン背景 */
.reformbox-container { }        /* モーダルボックス */
.reformbox-content { }          /* 内部コンテンツラッパー */
.reformbox-close { }            /* 閉じるボタン */
.reformbox-overlay--media { }   /* 画像/動画バリアント */
```

## ライセンス

GPL-2.0-or-later
