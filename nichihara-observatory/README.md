# 日原天文台 公式サイト リニューアル

島根県津和野町・**日原天文台**(1985年開設、日本初の公開天文台)のホームページを作り直すためのスターターキット。
現行サイトの分析、要件定義、ロードマップ、そのまま動く Astro のコードをまとめてあり、Cursor に引き継いで開発を続けられるようにしてある。

> **Cursor で開いたら最初に [`docs/05-cursor-handoff.md`](docs/05-cursor-handoff.md) を読んでください。**

## クイックスタート

```bash
nvm use        # Node 22.22 以上
npm install
npm run dev    # http://localhost:4321
```

開発サーバーでは、施設にまだ確認が取れていない情報の横に紫色の **「要確認」** バッジが出る(本番ビルドでは出ない)。

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm test` | ユニットテスト(月齢・開館日判定) |
| `npm run check` | 型チェック |
| `npm run build` | 本番ビルド → `dist/` |
| `npm run preview` | ビルド結果の確認 |

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [`docs/01-current-site-analysis.md`](docs/01-current-site-analysis.md) | 現行サイトの分析(課題・強み・他施設事例・出典) |
| [`docs/02-requirements.md`](docs/02-requirements.md) | 新サイトの要件定義(目的・ペルソナ・サイトマップ・機能/非機能要件) |
| [`docs/03-roadmap.md`](docs/03-roadmap.md) | バージョンアップ計画(Phase 0〜3、KPI) |
| [`docs/04-content-inventory.md`](docs/04-content-inventory.md) | 施設への確認リスト(ヒアリングシート) |
| [`docs/05-cursor-handoff.md`](docs/05-cursor-handoff.md) | Cursor への引き継ぎ手順・指示文の例 |
| [`docs/06-mascot.md`](docs/06-mascot.md) | ゆるキャラ案(最新案「にちはらん」ほか。ラフ画は `docs/mascot/`) |
| [`docs/07-copy-rules.md`](docs/07-copy-rules.md) | 表記ルールとトップの確定稿(`npm run check:copy` で検査) |
| [`AGENTS.md`](AGENTS.md) | AI エージェント向けのプロジェクト規約 |

## 実装済みの機能

- **トップ(確定稿)**: 来館の要点(休館・開館時間・料金・予約)、天文台の紹介、来館の流れ、Google カレンダーの予定、宿泊施設
- **表記ルールの自動検査**: `npm run check:copy`(`docs/07-copy-rules.md`)
- **赤色ナイトモード**: 観望中にスマホを見ても目の暗順応を妨げにくい配色
- **施設情報の一元管理**: `src/data/facility.ts`(料金・時間・住所などをここだけで管理)
- **Markdown でイベント・お知らせ追加**: `src/content/`
- **重要なお知らせの帯表示**(道路通行止めなど)
- **SEO**: 構造化データ(TouristAttraction / Event)、sitemap、canonical、OGP
- **公開前の安全装置**: 既定で noindex。公開ビルドに【サンプル】記事が残っているとビルド失敗
- スマホ対応・キーボード操作・スキップリンク・reduced-motion 対応

## ディレクトリ構成

```
├── AGENTS.md / .cursor/rules/   AI エージェント向け規約
├── docs/                        分析・要件・ロードマップ・引き継ぎ
├── public/                      favicon, robots.txt(公開前は Disallow)
├── src/
│   ├── components/              Header, Footer, Verify, ComingSoon, TonightPanel(今はトップ未使用), Starfield
│   ├── content/                 events/, news/(Markdown)
│   ├── content.config.ts        記事のスキーマ
│   ├── data/                    facility.ts, tonight.json, calendar-overrides.json
│   ├── layouts/BaseLayout.astro
│   ├── lib/                     calendar.ts, moon.ts, content.ts
│   ├── pages/                   各ページ
│   └── styles/global.css        デザイントークン
└── tests/                       ユニットテスト
```

## 日々の更新(スタッフ向け)

| やりたいこと | 編集するファイル |
| --- | --- |
| 予定を知らせる | 施設の Google カレンダーを更新(トップに埋め込み) |
| 臨時休館・祝日開館を登録 | `src/data/calendar-overrides.json` |
| イベントを追加 | `src/content/events/` に Markdown を追加 |
| お知らせを追加 | `src/content/news/` に Markdown を追加 |
| 料金・時間を変更 | `src/data/facility.ts` |

※Phase 2 で CMS(管理画面)を入れ、ファイルを直接触らなくてよくする予定(`docs/03-roadmap.md`)。

## 公開前チェックリスト

- [ ] `docs/04-content-inventory.md` の要確認項目がすべて確認済み(`npm run dev` で「要確認」バッジが0個)
- [ ] 【サンプル】記事をすべて削除・差し替え
- [ ] トップの背景 `public/images/dome-night.jpg`(今は仮画像のイラスト)を本物の写真に差し替え
- [ ] 写真・学習資料・友の会のページ(今は「準備中」)の中身
- [ ] `npm run check:copy` が通る
- [ ] 写真・OGP 画像(`public/og.png`)・ロゴ
- [ ] プライバシーポリシーを正式文面に
- [ ] お問い合わせ手段の確定(メール公開 or `PUBLIC_FORM_ENDPOINT`)
- [ ] 独自ドメイン取得、`SITE_URL` と `src/data/facility.ts` の `SITE.url` を設定
- [ ] `PUBLIC_ALLOW_INDEX=true`、`public/robots.txt` を公開用に差し替え
- [ ] 旧サイト(sun-net.jp)に新サイトへの案内を設置
- [ ] Search Console 登録、観光サイト各所へ URL・情報の修正依頼
