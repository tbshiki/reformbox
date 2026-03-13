# WordPress.org 提出前チェックリスト

ReformBox を WordPress.org へ初回提出または更新提出する前の実務用チェックリストです。

## 1. メタデータ

- [ ] [reformbox.php](reformbox.php) の `Version` をリリース対象に合わせる
- [ ] [reformbox.php](reformbox.php) の `Requires at least` と `Requires PHP` を実際のサポート範囲に合わせる
- [ ] [reformbox.php](reformbox.php) の `Text Domain` が `reformbox` のままであることを確認する
- [ ] [readme.txt](readme.txt) の `Stable tag` をリリース対象バージョンに合わせる
- [ ] [readme.txt](readme.txt) の `Tested up to` を最新の安定版 WordPress での動作確認後に更新する
- [ ] [readme.txt](readme.txt) の `Contributors` が WordPress.org の正しいユーザー名になっていることを確認する

補足:

- WordPress.org では `Requires at least` と `Requires PHP` は主にメイン PHP ファイルから解釈される
- WordPress.org 上の表示バージョンは `readme.txt` ではなく [reformbox.php](reformbox.php) の `Version` が基準になる
- `Stable tag` は SVN の `tags/<version>/` と一致している必要がある

## 2. コード品質

- [ ] `npm run lint:js` が通る
- [ ] `npm run lint:css` が通る
- [ ] `phpcs --standard=phpcs.xml.dist` が通る
- [ ] 最新の release ZIP に対して Plugin Check の `Plugin Repo` ルールセットが通る
- [ ] フロントエンドで致命的エラーやコンソールエラーが出ていないことを確認する

## 3. 手動動作確認

- [ ] `core/group` の `same` モードでライトボックスが開く
- [ ] `core/group` の `split` モードで Preview と Modal の振り分けが想定どおり動く
- [ ] `core/group` の `split` モードで Modal 未設定時に Preview へフォールバックする
- [ ] `core/paragraph` でクリック起動のライトボックスが動く
- [ ] `core/video` でポスター画像ありの場合のみ有効化できる
- [ ] `core/video` でポスタークリックからオーバーレイ再生できる
- [ ] `core/image` では ReformBox が Core Lightbox トグル連携のみを行い、表示挙動はコアに委譲される
- [ ] ESC キーで閉じる
- [ ] オーバーレイクリックで閉じる設定が動く
- [ ] フォーカストラップが機能する
- [ ] キーボード操作でトリガーを開ける
- [ ] プラグイン無効化後もブロックが壊れない
- [ ] RTL でレイアウト崩れがない

## 4. readme.txt

- [ ] 冒頭の 1 行説明が簡潔で、150 文字前後以内に収まっていることを確認する
- [ ] `Tags` は 1 から 5 個に収める
- [ ] 説明がセールス文ではなく、機能説明として読める内容になっている
- [ ] FAQ は実際に想定される質問だけに絞る
- [ ] Changelog は最新リリース中心に保ち、肥大化しすぎないようにする
- [ ] WordPress.org の readme validator で確認する

スクリーンショットを出す場合の追加チェック:

- [ ] [readme.txt](readme.txt) に `== Screenshots ==` セクションを追加する
- [ ] スクリーンショット 1 枚につき 1 行の説明を `1. ...` 形式で記載する
- [ ] 画像ファイル名を `screenshot-1.png`、`screenshot-2.jpg` などの小文字命名にする
- [ ] 外部 URL 参照ではなく、WordPress.org SVN のトップレベル `assets/` に配置する

## 5. WordPress.org アセット

WordPress.org の表示用画像は、プラグイン ZIP ではなく SVN のトップレベル `assets/` ディレクトリに置く必要があります。

- [ ] `assets/icon-128x128.png` または `.jpg` もしくは `.gif` を用意する
- [ ] `assets/icon-256x256.png` または `.jpg` もしくは `.gif` を用意する
- [ ] SVG を使う場合は `assets/icon.svg` に加えて PNG フォールバックも用意する
- [ ] バナーを使う場合は `assets/banner-772x250.png` または `.jpg` を用意する
- [ ] Retina バナーを使う場合は `assets/banner-1544x500.png` または `.jpg` も用意する
- [ ] スクリーンショットを使う場合は `assets/screenshot-1.png`、`assets/screenshot-2.png` のように小文字で連番にする
- [ ] 日本語以外や RTL 用に出し分けたい場合のみローカライズ済みファイル名を使う
- [ ] 画像の MIME type が正しく扱われるように SVN へ適切に追加する

補足:

- バナーは Retina 版単独では表示されず、通常版とのセットが前提
- スクリーンショットは `readme.txt` の `Screenshots` セクション説明行と対応づけられる
- スクリーンショットやアイコン画像は審査必須ではないが、提出前に準備しておくと公開ページの見栄えと説明性が上がる

## 6. 配布物

- [ ] `npm run release:zip` で最新の [reformbox.zip](reformbox.zip) を生成する
- [ ] [reformbox.zip](reformbox.zip) にビルド済み `build/` が含まれていることを確認する
- [ ] 配布不要な隠しファイルや開発専用ディレクトリが ZIP に入っていないことを確認する
- [ ] ZIP の中の `readme.txt`、[reformbox.php](reformbox.php)、ビルド済みファイルのバージョンが揃っていることを確認する

ReformBox の現状:

- [reformbox.zip](reformbox.zip) には `build/`、`includes/`、`languages/`、[reformbox.php](reformbox.php)、[readme.txt](readme.txt) が含まれている
- 追加で `src/`、[package.json](package.json)、[webpack.config.js](webpack.config.js)、`docs/` も同梱している
- 現状の Plugin Check ではこの配布内容でエラーは出ていない

## 7. SVN 反映

- [ ] WordPress.org で割り当てられた正式 slug を確認する
- [ ] `trunk/` に今回の配布内容を配置する
- [ ] `assets/` を `trunk/` の外、SVN ルート直下に配置する
- [ ] `tags/<version>/` に同じリリース内容を配置する
- [ ] `trunk/readme.txt` と `tags/<version>/readme.txt` の `Stable tag` が一致していることを確認する
- [ ] 画像追加時は必要に応じて SVN の mime-type を設定する

## 8. ReformBox 向けの追加レビュー観点

- [ ] `core/image` はコア委譲であることが [readme.txt](readme.txt) と実装で一致している
- [ ] `core/video` はポスター必須であることが [readme.txt](readme.txt) と実装で一致している
- [ ] `Group split mode` の説明が [readme.txt](readme.txt) と実装で一致している
- [ ] ドキュメント更新時に [README.md](README.md)、[docs/README.ja.md](docs/README.ja.md)、[readme.txt](readme.txt) の意味差分が生まれていない

## readme.txt と配布内容の追加レビュー

### 問題なし

- [readme.txt](readme.txt) の `Stable tag`、`Tested up to`、`Requires PHP` は現状のリリース情報として自然
- `Tags` は 5 個以内に収まっている
- Core Image を独自実装していないことが説明されており、実装と整合している
- Video のポスター必須条件が明記されており、実装と整合している
- Group split mode の説明があり、空モーダル回避のフォールバックにも触れている
- 配布 ZIP は Plugin Check の `Plugin Repo` でエラーなし

### 審査コメントになりやすい注意点

- [readme.txt](readme.txt) に `Screenshots` セクションがまだないため、画像を用意する場合は説明文も同時に追加する
- `Contributors: tbshiki` が WordPress.org の実ユーザー名表記と完全一致しているかを提出前に確認する
- `Development` セクションは許容範囲だが、将来的に readme が肥大化したら簡潔化を検討する
- 配布 ZIP に `src/`、[package.json](package.json)、[webpack.config.js](webpack.config.js)、`docs/` を含める方針は現状でも通っているが、将来もし審査側から配布最小化を求められた場合は `package.json` の `files` 見直しで対応可能
