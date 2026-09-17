# Obsidian 連携セットアップ

このリポジトリの `vault/` フォルダを Obsidian で開き、書いたノートを push すると、
索引とサイトの公開ノートが自動生成される。

## 1. リポジトリを手元に置く

```bash
git clone https://github.com/firstbit-co/firstbit-corporate.git
cd firstbit-corporate
```

## 2. Obsidian で vault を開く

1. Obsidian を起動する
2. 「フォルダを Vault として開く」を選ぶ
3. クローンした **`firstbit-corporate/vault`** フォルダを指定する

`vault/.obsidian/` に設定を入れてあるので、テンプレート（`90-templates`）や
添付ファイルの保存先（`assets`）は最初から設定済み。新規ノートは `00-inbox` に作られる。

## 3. 自動同期（推奨）：obsidian-git プラグイン

Obsidian を閉じても手動で git を叩かずに済むようにする。

1. 設定 → コミュニティプラグイン → 制限モードをオフ
2. 「Git」（obsidian-git）を検索してインストール、有効化
3. Git プラグインの設定で以下を目安に設定する
   - Vault backup interval (minutes): `10`
   - Auto pull on startup: ON
   - Commit message: `vault: {{date}}`

> vault は**リポジトリのサブフォルダ**なので、obsidian-git はリポジトリのルートを
> 自動的に見つけて動作する。`notes/` や `index.html` の変更も同じコミットに入る点に注意。
> 分けたい場合は obsidian-git を使わず、手元で `git add vault && git commit` する。

## 4. ノートを書く

```markdown
---
title: 2026年度の経費削減メニュー
tags: [事業, コンサルティング]
updated: 2026-09-17
publish: false
---

## 要点

- ...
```

- `[[ノート名]]` でノート同士をつなぐ（索引にも関連リンクにも反映される）
- サイトに出したいノートだけ `publish: true` にして、`slug: cost-reduction-2026` のように
  半角英数の `slug` を付ける（日本語タイトルのままだと URL が読みにくくなるため）

## 5. 公開の流れ

```
Obsidian で編集 → main に push → GitHub Actions が npm run build
                → vault/INDEX.md, notes/*.html, sitemap.xml を自動コミット
                → GitHub Pages に反映
```

手元で確認したいときは：

```bash
npm install     # 初回のみ
npm run build   # 生成
npm run check   # 生成物が最新かどうかだけ確認
```

## 6. Claude に読ませる

`CLAUDE.md` に「まず `vault/INDEX.md` を読む」と書いてあるので、
Claude Code でこのリポジトリを開けば、vault のノートを前提に回答するようになる。
新しく決まったこと・調べたことは vault に書き足していけば、それがそのまま次回以降の記憶になる。

## ⚠️ 公開リポジトリであることに注意

このリポジトリは public。`publish: false` のノートもコミットすれば GitHub 上で誰でも読める。
外に出せない情報は `vault/99-private/`（`.gitignore` 済み）に置くこと。
