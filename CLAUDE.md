# firstbit-corporate

株式会社Firstbit のコーポレートサイト（GitHub Pages）。
**サイトの内容は Obsidian vault（`vault/`）を正とし、`index.html` はそこから生成される。**

## 最初に読むもの

会社・事業・方針に関する質問や、サイト文言の追加・修正を依頼されたときは、
**まず `vault/INDEX.md` を読む**こと。vault 全ノートのタイトル・タグ・要約・パスが
一覧になっているので、そこから必要なノート（`vault/**/*.md`）だけを開く。

会社に関する事実（社名の由来、理念、事業内容、拠点、代表者の経歴など）は
`vault/10-company/` のノートを正とする。推測で書かない。

## ディレクトリ

| パス | 内容 |
| --- | --- |
| `vault/` | Obsidian vault。サイトの内容と社内の知識の保管場所 |
| `vault/10-company/` | 会社の基本情報。`site:` 付きのノートが `index.html` の各セクションになる |
| `vault/INDEX.md` | **自動生成**。vault の索引 |
| `templates/index.html` | サイトのレイアウト（HTML の骨格） |
| `scripts/site.mjs` | vault のノート → `index.html` のレンダラ。クラス名と SVG アイコンはここ |
| `scripts/build.mjs` | ビルド本体。`index.html` / `vault/INDEX.md` / `notes/` / `sitemap.xml` を生成 |
| `index.html` | **自動生成**。手で編集しない |
| `notes/` | **自動生成**。`publish: true` のノートから作られる公開ページ |
| `sitemap.xml` | **自動生成** |
| `docs/obsidian-setup.md` | Obsidian 側の設定手順 |
| `リスキリング宣言.pdf` | サイトからリンクしている PDF |

## サイト本文はどのノートから来るか

ノートの frontmatter の `site:` がセクションを決める。ノートごとに読み取る場所も決まっている。

| `site:` | ノート | サイトの場所 | 読み取る場所 |
| --- | --- | --- | --- |
| `meta` | サイト設定 | `<head>`・お問い合わせ文・フッター | frontmatter のみ |
| `company` | 会社概要 | 会社概要テーブル・OFFICE LOCATIONS・フッター住所・JSON-LD | frontmatter のみ |
| `hero` | ヒーロー | ファーストビュー | frontmatter ＋ `## 本文` の段落 |
| `origin` | 社名に込めた想い | ABOUT | `## 本文` の段落 |
| `philosophy` | 理念・ビジョン | PHILOSOPHY & VISION | `## 理念` / `## ビジョン` の段落、`## 大切にしている価値観` の表 |
| `services` | 事業内容 | SERVICES | `## 概要` の段落、`## 事業` の `### 見出し` ごとにカード |
| `message` | 代表者挨拶 | MESSAGE | frontmatter ＋ `## 本文` の段落 |

指定されていない見出し（`## 関連` など）はサイトに出ない。ノートに補足を書いても安全。

## 作業ルール

- `index.html`、`vault/INDEX.md`、`notes/*.html`、`sitemap.xml` を手で編集しない。
  内容は vault のノート、レイアウトは `templates/index.html` を直してから `npm run build`。
- サイトの文言を変える依頼は、必ず vault のノートを直して再生成する。
  `index.html` を直接書き換えても次のビルドで消える。
- vault を変更したら `npm run build` を実行し、生成物も一緒にコミットする
  （`main` への push なら GitHub Actions が自動で生成し直す）。
- 生成物が最新かどうかは `npm run check` で確認できる。
- 新しく分かった会社の事実は、回答の中だけで終わらせず `vault/` のノートに追記する。
  次のセッションが読めるようにするのがこの vault の目的。
- `vault/99-private/` は `.gitignore` 済みのローカル専用フォルダ。存在しても読まない・コミットしない。

## このリポジトリは public

GitHub 上で誰でも読める。`publish: false` は「サイトに出さない」だけで「非公開」ではない。
顧客名・金額・個人情報などを vault にコミットしないこと。
