# 05. Cursor への引き継ぎ手順

## 1. 独立したリポジトリに切り出す

このフォルダは `firstbit-corporate` リポジトリ内に作成している。
コーポレートサイトと混ざらないよう、**専用リポジトリに切り出してから** Cursor で開くのを推奨。

```bash
# A. 履歴ごと切り出す(firstbit-corporate のルートで実行)
git subtree split --prefix=nichihara-observatory -b nichihara-export
mkdir ../nichihara-observatory && cd ../nichihara-observatory
git init -b main && git pull ../firstbit-corporate nichihara-export
git remote add origin git@github.com:<org>/nichihara-observatory.git
git push -u origin main

# B. 履歴不要ならフォルダをコピーするだけでもよい
cp -r nichihara-observatory ~/work/ && cd ~/work/nichihara-observatory && git init -b main
```

## 2. Cursor で開いて動かす

```bash
nvm use            # Node 22.22 以上(.nvmrc)
npm install
npm run dev        # http://localhost:4321 — 未確認情報に「要確認」バッジが出る
npm test           # 月齢・開館日ロジックのテスト
npm run check      # 型チェック
npm run build      # 本番ビルド(dist/)
```

Cursor は `AGENTS.md` と `.cursor/rules/` を自動で読み込む。プロジェクトのルール(事実を捏造しない、施設情報は facility.ts に集約、など)はそこに書いてある。

## 3. 作業の順番と Cursor への指示例

各タスクは Cursor のチャット(Agent モード)にそのまま貼れる形にしてある。

### Step 1. 旧サイトの全ページ調査(最優先)

> `http://www.sun-net.jp/~polaris/top.htm` から辿れる全ページの URL・タイトル・主な内容を一覧にして、`docs/04-content-inventory.md` の「旧サイトから移すもの」の表に追記して。新サイトでの移行先ページも提案して。あわせて HTTPS 対応の有無、スマホ表示、最終更新日も `docs/01-current-site-analysis.md` の「推定」項目に結果を書き込んで。

※Cursor の Web 検索/ブラウザ機能、または `curl` で取得。取得した HTML は `research/legacy-site/` に保存しておくと後で参照しやすい(リポジトリには含めない場合は `.gitignore` に追加)。

### Step 2. 施設ヒアリング結果の反映

> `docs/04-content-inventory.md` の確認結果をもとに `src/data/facility.ts` を更新して。確認済みの項目は `verified: true` に。確認できなかった項目は `verified: false` のままにして note に理由を書いて。

### Step 3. 写真の組み込み

> `public/images/` に置いた写真を使って、トップのヒーローと施設紹介の望遠鏡・科学館セクションに画像を入れて。Astro の `<Image>`(`astro:assets`)で WebP 化し、alt テキストは内容がわかる日本語で。写真がない部分は今の星空背景(`Starfield.astro`)のままでよい。

※画像を `astro:assets` で最適化する場合は `src/assets/` に置く。

### Step 4. お知らせ・イベントを実データに

> `src/content/` の【サンプル】記事を削除し、施設から受け取った今年度のイベント予定で events を作成して。書式はサンプルと `src/content.config.ts` のスキーマに従って。

### Step 5. 公開準備

> 公開チェックリスト(README の「公開前チェックリスト」)を上から順に確認し、未完了の項目を洗い出して対応して。

### Step 6 以降(Phase 2)

`docs/03-roadmap.md` の Phase 2 から順に。最初は「今夜の開催可否をスタッフがスマホから更新できる仕組み」がおすすめ。

> `src/data/tonight.json` をスタッフがスマホから更新できるようにしたい。Keystatic(Git ベース CMS)を導入し、tonight と events/news を編集できる管理画面を作って。ホスティングは Cloudflare Pages の想定。

## 4. 現在の実装の要点

| ファイル | 役割 |
| --- | --- |
| `src/data/facility.ts` | 施設情報の唯一の置き場。`Fact<T>`(value + verified + note) |
| `src/components/Verify.astro` | 未確認情報に dev 時のみ「要確認」バッジ |
| `src/components/TonightPanel.astro` | 今日の開館状況・今夜の観望会・月齢(閲覧時にブラウザで判定) |
| `src/lib/calendar.ts` | 定休日+例外日(`calendar-overrides.json`)で開館判定。JST |
| `src/lib/moon.ts` | 月齢の簡易計算(誤差〜1日。「目安」と表記) |
| `src/lib/content.ts` | events/news の取得。公開ビルドに【サンプル】が残ると失敗 |
| `src/content.config.ts` | events/news の Markdown スキーマ |
| `src/styles/global.css` | デザイントークン(CSS 変数)。`[data-theme="red"]` が赤色ナイトモード |
| `src/layouts/BaseLayout.astro` | SEO・OGP・構造化データ・noindex 制御 |

## 5. 既知の未完了・注意点

- OGP 画像なし(`public/og.png` を作ったら BaseLayout の TODO を解消)
- お問い合わせフォームの送信先未定(`PUBLIC_FORM_ENDPOINT`)
- 英語ページは最小限。料金・時間の一部を直書きしているので、Phase 3 で facility.ts から引くように
- 「これからのイベント」はビルド時点で判定するため、毎日の再ビルド(GitHub Actions cron 等)が必要
- 祝日の振替休館は自動判定していない(`calendar-overrides.json` に手入力)
- プライバシーポリシーはひな形。運営者の正式文面に差し替える
- 各ページの `<!-- TODO(取材): ... -->` コメントは施設に確認する事項
