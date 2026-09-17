---
title: vault の使い方
tags: [meta]
publish: false
---

# vault の使い方

このフォルダが Obsidian の vault（金庫＝ノートの保管場所）です。
Obsidian で「フォルダを Vault として開く」を選び、**`vault/` フォルダ**を指定してください。

## フォルダの役割

| フォルダ | 用途 |
| --- | --- |
| `00-inbox/` | とりあえず書き留める場所。後で整理して他フォルダへ移す |
| `10-company/` | 会社の基本情報（理念・事業内容・会社概要など）。AI に読ませる土台 |
| `20-knowledge/` | 調べたこと・手順・ナレッジ |
| `30-log/` | 日付ごとの記録、打ち合わせメモ |
| `90-templates/` | ノートのひな形（索引・サイトの対象外） |
| `99-private/` | **Git に含めない**ローカル専用フォルダ（`.gitignore` 済み） |
| `INDEX.md` | 自動生成される索引。編集しない |

## ノートの書き方

ノート先頭の `---` で囲んだ部分（frontmatter）にメタ情報を書きます。

```markdown
---
title: ノートのタイトル
tags: [会社, 事業]
updated: 2026-09-17
publish: false
---

本文をここに書く。[[別のノート]] のように書けばノート同士をつなげられます。
```

| 項目 | 説明 |
| --- | --- |
| `title` | 省略時はファイル名、または本文の最初の見出し |
| `tags` | 任意。索引でタグ別に一覧化されます |
| `updated` | 省略時はファイルの更新日時 |
| `publish` | `true` にしたノートだけがサイト（`/notes/`）に公開されます |
| `slug` | 公開URLのファイル名。日本語タイトルのノートを公開するときは指定推奨 |

## 公開の仕組み

1. Obsidian でノートを書く
2. `main` ブランチに push する
3. GitHub Actions が `npm run build` を実行し、`vault/INDEX.md`・`notes/*.html`・`sitemap.xml` を更新してコミットする
4. GitHub Pages に反映される

`publish: true` でないノートはサイトには出ません。

## ⚠️ このリポジトリは公開（public）です

`publish: false` はあくまで**ウェブサイトに出さない**という意味で、
Git にコミットした時点で GitHub 上では誰でも読めます。

外部に見せたくない情報（顧客名、金額、個人情報、パスワードなど）は
`vault/99-private/` に置いてください。このフォルダは `.gitignore` されており、
コミットも push もされません。
