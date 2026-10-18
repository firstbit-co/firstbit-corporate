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

変更後は `npm test && npm run check && npm run build` が通ることを確認する。

## 絶対に守ること

1. **事実を捏造しない。** 料金・時間・住所・望遠鏡の仕様・沿革などを推測で書かない。不明なら「確認中」と書くか、`<!-- TODO(取材): ... -->` を残す。
2. **施設情報は `src/data/facility.ts` に集約する。** ページに料金や時間を直書きしない。未確認の値は `verified: false` にして、表示には `<Verify fact={...} />` を使う。
3. **公開前は検索エンジンに載せない。** `PUBLIC_ALLOW_INDEX` を勝手に true にしない。
4. **サンプル記事(タイトルに【サンプル】)を本物の情報のように書き換えない。** 実データに置き換えるときはサンプル表記ごと消す。

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
- お知らせ: `src/content/news/YYYY-MM-slug.md`。トップに帯で出すなら `important: true`
- 当日の開催可否: `src/data/tonight.json`
- 祝日などの例外日: `src/data/calendar-overrides.json`
