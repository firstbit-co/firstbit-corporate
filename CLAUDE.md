# firstbit-corporate

株式会社Firstbit のコーポレートサイト(静的サイト / GitHub Pages)。

- 公開 URL: https://firstbit-co.github.io/firstbit-corporate/
- 本体は `index.html` 1ファイル(Tailwind CSS を CDN から読み込み、ビルド工程なし)

## コンテキストの読み方(トークン節約のルール)

**作業を始めるとき、最初に `docs/context/INDEX.md` を読むこと。**
そこにセクションごとの行番号と NotebookLM 要約へのリンクがある。

1. **`index.html` を丸ごと読まない**(約25,000トークン)。
   `docs/context/INDEX.md` のセクションマップで行範囲を調べ、
   `sed -n '207,220p' index.html` のように必要な範囲だけを開く。
2. **PDF を読まない**。内容は NotebookLM 要約
   (`docs/notebooklm/summaries/`)で確認する。
3. サイトの内容・方針についての質問は、まず要約で答えられないか確認する。
   要約で足りるならファイルは開かない。
4. 要約が「🔴 要更新」の場合は、その要約を根拠にしない。
   ユーザーに NotebookLM での再要約を促す(手順: `docs/notebooklm/README.md`)。

## `index.html` を編集したあと

```bash
python3 tools/nblm.py index    # セクションマップと鮮度を更新
```

行番号がずれるので、編集後は必ず実行してからコミットする。
`index.html` の内容を実質的に変えた場合は、NotebookLM 要約も古くなる
(`python3 tools/nblm.py check` で検出できる)。

## ツール

| コマンド | 用途 |
| --- | --- |
| `python3 tools/nblm.py export` | NotebookLM 投入用テキストを書き出す |
| `python3 tools/nblm.py index` | `docs/context/INDEX.md` を再生成する |
| `python3 tools/nblm.py check` | 古い要約があれば非ゼロ終了する |

依存パッケージなし(Python 標準ライブラリのみ)。

## 注意

- `index.html` は日本語コンテンツ。既存のクラス名・見出し構造・トーンに合わせる。
- SEO 関連(`title`/`meta`/`sitemap.xml`/社名の表記ゆれ)は過去に何度も調整されている。
  変更するときは既存の意図を壊さないこと。
