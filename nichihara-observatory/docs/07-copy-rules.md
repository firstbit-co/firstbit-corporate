# 07. 表記ルールとトップの確定稿

サイトの文言は、このルールに合わせる。`npm run build` のあとに `npm run check:copy` を実行すると、ルールに合わない表現と、トップが確定稿からずれていないかを検査できる(`scripts/check-copy.mjs`)。

## 来館の基本情報(施設確認済み)

| 項目 | 内容 | データ |
| --- | --- | --- |
| 休館 | 毎週火曜・水曜。元日も休館 | `CLOSED` |
| 開館時間 | 13:30–22:00(昼 13:30–17:00、夜 19:00–22:00、夏季の夜は 20:00 開始) | `HOURS` |
| 料金 | 大人 500円。夜の学生 400円、科学館の学生 200円 | `FEES` |
| 予約 | 受け付けていない。当日、天文資料館(ポランの広場)で受付 | `RECEPTION` |

値はすべて `src/data/facility.ts` にある。ページに直書きしない。

## 書き方のルール

- 休館は「毎週火曜・水曜(元日も)」。**金曜の休館は書かない。** 祝日の振替も書かない。
- 見出しは「**開館時間**」「**料金**」を使う。
- **開館時間は変わることがある。料金は変わらない。** 「料金は変わることがあります」とは書かない。
- **予約は受け付けていない。** 「要予約」「先着順」「定員」は使わない(イベントの記事の形式からも外してある)。
- **電話での確認はすすめない。** 予定は Google カレンダーと利用案内で案内する。
- 「**隣の**」は使わない(宙辺 -SORABE- などは「同じ一帯にあります」「宿泊施設があります」)。
- マスコット「にちはらん」の説明は `/nichiharan/` にまとめ、**トップでは小さく置くだけ**にする。
- 文は短く、です・ます調で。言い切れないことは書かない。

## トップの確定稿

- 確定稿: [`docs/copy/home-main.html`](copy/home-main.html)(トップの `<main>` の中身)
- 実装: `src/pages/index.astro`。時間・料金などは `facility.ts` から差し込むが、出力は確定稿と同じになる。
- 文言を意図して変えるときは、`index.astro`(または `facility.ts`)と確定稿の**両方**を直す。片方だけ直すと `check:copy` が失敗する。

## 画像

| ファイル | 内容 | 状態 |
| --- | --- | --- |
| `public/images/dome-night.jpg` | 夜空の下でスリットを開けたドームの写真 | **仮画像(イラスト)**。写真が届いたら上書きする。元は `docs/images/dome-night-placeholder.mjs` |
| `public/images/nichiharan-scope.jpg` | にちはらん(望遠鏡) | `docs/mascot/nichiharan/telescope.svg` から作成 |
| `public/images/nichiharan-wave.jpg` | にちはらん(ごあいさつ) | `docs/mascot/nichiharan/wave.svg` から作成 |
| `public/images/nichiharan/*.svg` | `/nichiharan/` のポーズ一覧 | `docs/mascot/nichiharan/` のコピー |
