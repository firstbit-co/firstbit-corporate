# AGENTS.md — 日原天文台 公式サイト

AI エージェント(Cursor / Claude Code など)向けのプロジェクト規約。

## プロジェクト概要

島根県津和野町の日原天文台(1985年開設・日本初の公開天文台)の公式サイトのリニューアル。
Astro 7 の静的サイト。背景と方針は `docs/` を参照(まず `docs/05-cursor-handoff.md`)。

## コマンド

- `npm run dev` — 開発サーバー(未確認情報に「要確認」バッジが出る)
- `npm test` — `tests/` のユニットテスト(node --test)
- `npm run check` — 型チェック
- `npm run build` — 本番ビルド
- `npm run check:copy` — 表記ルールとトップの確定稿の検査(ビルドのあとに実行)

変更後は `npm test && npm run check && npm run build && npm run check:copy` が通ることを確認する。

## 絶対に守ること

1. **事実を捏造しない。** 料金・時間・住所・望遠鏡の仕様・沿革などを推測で書かない。不明なら「確認中」と書くか、`<!-- TODO(取材): ... -->` を残す。
2. **施設情報は `src/data/facility.ts` に集約する。** ページに料金や時間を直書きしない。未確認の値は `verified: false` にして、表示には `<Verify fact={...} />` を使う。
3. **公開前は検索エンジンに載せない。** `PUBLIC_ALLOW_INDEX` を勝手に true にしない。
4. **サンプル記事(タイトルに【サンプル】)を本物の情報のように書き換えない。** 実データに置き換えるときはサンプル表記ごと消す。
5. **表記ルール(`docs/07-copy-rules.md`)を守る。** 休館は毎週火曜・水曜と元日(金曜の休館は書かない)。見出しは「開館時間」「料金」。開館時間は変わることがあり、料金は変わらない。予約は受け付けていない。電話での確認はすすめない。「隣の」は使わない。
6. **トップの本文は確定稿(`docs/copy/home-main.html`)どおり。** 変えるときは確定稿も一緒に直す。

## コーディング規約

- 日本語がメイン。英語ページは `/en/` 配下、`lang="en"` を付ける。
- 色・余白・フォントは `src/styles/global.css` の CSS 変数を使う(直書きしない)。赤色ナイトモード(`[data-theme="red"]`)でも読めることを確認する。
- JavaScript は必要最小限。ページ内の `<script>` は Astro がバンドルする。外部 CDN は使わない。
- アクセシビリティ: 見出し階層を守る、画像に alt、タップ領域 44px 以上、キーボード操作可能、コントラスト AA。
- 日付は JST(`Asia/Tokyo`)で扱う。日付ロジックは `src/lib/calendar.ts` に寄せ、テストを書く。
- `src/lib/*.ts` はブラウザと Node テストの両方から読むため、型注釈以外の TS 固有構文(enum, namespace, パラメータプロパティ)を使わない。
- コメントは日本語で、「なぜ」を書く。

## コンテンツの追加

- イベント: `src/content/events/YYYY-MM-slug.md`(スキーマは `src/content.config.ts`)
- お知らせ: `src/content/news/YYYY-MM-slug.md`(トップには出ない。`/news/` に並ぶ)
- 予定: 施設の Google カレンダー(トップに埋め込み。URL は `facility.ts` の `CALENDAR_URL`)
- 臨時の休館・開館: `src/data/calendar-overrides.json`(`TonightPanel` を使うときだけ)
