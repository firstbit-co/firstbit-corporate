# firstbit-corporate

株式会社Firstbit のコーポレートサイト（GitHub Pages）と、その知識を貯める Obsidian vault。

## 最初に読むもの

会社・事業・方針に関する質問や、サイト文言の追加・修正を依頼されたときは、
**まず `vault/INDEX.md` を読む**こと。vault 全ノートのタイトル・タグ・要約・パスが
一覧になっているので、そこから必要なノート（`vault/**/*.md`）だけを開く。

会社に関する事実（社名の由来、理念、事業内容、拠点、代表者の経歴など）は
`vault/10-company/` のノートを正とする。推測で書かない。

## ディレクトリ

| パス | 内容 |
| --- | --- |
| `index.html` | サイト本体（1ページ完結、Tailwind CDN + 素の JS） |
| `vault/` | Obsidian vault。ここが知識の保管場所 |
| `vault/INDEX.md` | **自動生成**。vault の索引 |
| `notes/` | **自動生成**。`publish: true` のノートから作られる公開ページ |
| `sitemap.xml` | **自動生成** |
| `scripts/build.mjs` | vault → 索引・公開ノート・sitemap のビルド |
| `docs/obsidian-setup.md` | Obsidian 側の設定手順 |
| `リスキリング宣言.pdf` | サイトからリンクしている PDF |

## 作業ルール

- `vault/INDEX.md`、`notes/*.html`、`sitemap.xml` を手で編集しない。
  vault のノートを直してから `npm run build` を実行する。
- vault のノートを追加・変更したら `npm run build` を実行し、生成物も一緒にコミットする
  （`main` への push なら GitHub Actions が自動で生成し直す）。
- 生成物が最新かどうかは `npm run check` で確認できる。
- 新しく分かった会社の事実は、回答の中だけで終わらせず `vault/` のノートに追記する。
  次のセッションが読めるようにするのがこの vault の目的。
- `vault/99-private/` は `.gitignore` 済みのローカル専用フォルダ。存在しても読まない・コミットしない。

## このリポジトリは public

GitHub 上で誰でも読める。`publish: false` は「サイトに出さない」だけで「非公開」ではない。
顧客名・金額・個人情報などを vault にコミットしないこと。
