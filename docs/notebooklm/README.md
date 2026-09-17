# NotebookLM 連携の運用手順

目的: **NotebookLM に重い元データを読ませ、その要約だけを Claude Code に読ませて
トークン消費を減らす。**

前提として NotebookLM に公開 API はありません(2026年9月時点)。
そのため「NotebookLM から自動取得」はできず、要約の貼り付けだけは手作業になります。
それ以外(素材の書き出し・鮮度チェック・索引生成)はすべて `tools/nblm.py` が行います。

```
元データ (index.html / PDF)
   │  ① python3 tools/nblm.py export
   ▼
docs/notebooklm/sources/     ← NotebookLM にアップロードする素材
   │  ② NotebookLM で読み込み・要約(ブラウザ操作)
   ▼
docs/notebooklm/summaries/   ← 要約を貼り付ける場所
   │  ③ python3 tools/nblm.py index
   ▼
docs/context/INDEX.md        ← Claude Code が最初に読む索引
```

## ① 素材を書き出す

```bash
python3 tools/nblm.py export
```

`index.html` から HTML タグ・CSS・JS を除いた本文テキストが
`docs/notebooklm/sources/index.html.txt` に出ます(44KB → 約10KB)。

PDF は変換不要です。`リスキリング宣言.pdf` はそのまま NotebookLM に上げられます。

## ② NotebookLM で要約する

1. https://notebooklm.google.com で新しいノートブックを作る
2. 「ソースを追加」から以下をアップロード
   - `docs/notebooklm/sources/index.html.txt`
   - `リスキリング宣言.pdf`
   - (公開サイトを直接読ませる場合は URL ソースで
     `https://firstbit-co.github.io/firstbit-corporate/`)
3. チャット欄に下のプロンプトを貼って要約を作らせる

<details>
<summary>要約プロンプト(コピーして使う)</summary>

```
あなたはこの資料を、別のAIコーディングエージェントに渡すための要約を作ります。
以下の条件で Markdown を出力してください。

- 3000文字以内
- 見出しは ## と ### のみ
- 事実だけを書き、推測や感想は書かない
- 固有名詞(会社名・サービス名・数値・日付・連絡先)は省略せず原文どおりに残す
- 「このセクションには〜が書かれています」ではなく、内容そのものを書く
- 最後に「## 未収録の情報」として、要約で落とした種類の情報を箇条書きで挙げる
```

</details>

## ③ 要約をリポジトリに保存する

1. `docs/notebooklm/summaries/_TEMPLATE.md` をコピーして
   `docs/notebooklm/summaries/<わかりやすい名前>.md` を作る
2. NotebookLM の出力を本文に貼る
3. 冒頭の frontmatter を埋める。`source_sha` は次のコマンドで取れる値を入れる

```bash
# 例: index.html を出典にする場合
python3 -c "import hashlib,pathlib;print(hashlib.sha256(pathlib.Path('index.html').read_bytes()).hexdigest())"
```

4. 索引を再生成してコミットする

```bash
python3 tools/nblm.py index
git add docs tools && git commit -m "Update NotebookLM summaries"
```

## 鮮度チェック

元ファイルを編集すると `source_sha` がずれ、要約が古くなります。

```bash
python3 tools/nblm.py check   # 古い要約があれば一覧表示して非ゼロ終了
```

`docs/context/INDEX.md` の「鮮度」列にも 🔴 要更新 と出ます。
その場合は ①〜③ をやり直してください。

## どれくらい節約になるか

| 読み方 | 概算トークン |
| --- | --- |
| `index.html` 全文 | 約 25,000 |
| 書き出しテキスト全文 | 約 2,500 |
| NotebookLM 要約 | 約 800〜1,500 |
| `docs/context/INDEX.md` のみ | 約 1,000 |

日常の質問は索引+要約(約2,000トークン)で足り、
実際にコードを編集するときだけ `sed -n` でその行範囲を開けば済みます。
