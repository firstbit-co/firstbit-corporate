# 英検リスニング教材 毎朝6時メール配信

毎朝6時に、その日の世界のニュースと日本のニュースを英検レベルの英文リスニング
教材に書き直して、メールで届けるための一式です。届いた英文をそのまま ChatGPT に
貼り付けて音声で読ませ、聞き取り練習に使います。

既定は **英検準1級のみ・1通**（3パート構成、合計約10分）。
2級・3級も欲しくなったら設定を1行変えるだけで増やせます。

| ファイル | 中身 |
|---|---|
| `PROMPT.md` | **手動運用版のプロンプト。** ChatGPT / Claude にそのまま貼って使う |
| `PROMPT_AUTOMATION.md` | 自動運用版のプロンプト（JSON出力）。GASが使う内容と同じ |
| `gas/Code.gs` | Google Apps Script 本体（ニュース取得 → 教材生成 → Gmail送信） |
| `gas/appsscript.json` | GASのマニフェスト（タイムゾーン = Asia/Tokyo、Gmail送信スコープ） |

---

## 配信方法は2通り

### 方法A. Claude の Routine（スケジュール実行）

Claude 側に「毎朝6時に教材を作ってメールする」予定を登録する方法です。
**APIキーも Apps Script も不要**で、いちばん手間がかかりません。

このリポジトリの作業時点で、次の設定で登録済みです。

- 実行時刻: 毎日 21:00 UTC（= 日本時間 翌朝6:00）
- 宛先: 会話で指定したアドレスに1通
- レベル: 英検準1級のみ

注意点:

- Routine を**新しいセッションで起動する方式にすると Gmail が使えません**。
  起動されたセッションにコネクタ（`mcp__Gmail__*`）が引き継がれないためです。
  Gmail を持っているセッションに紐づける方式（persistent session）にしてください。
- 自分で作り直す場合は、claude.ai の Routines 画面から作ると
  Gmail コネクタを明示的に付けられます。プロンプトは `PROMPT.md` の
  「ここからコピー」の中身を流用できます。
- ニュースはウェブ検索で集めます。検索が実ニュースを返さない日は内容が弱くなります。
  Reuters / AP / BBC / FT / NHK は検索エージェントがアクセスできないため、
  CNBC や Al Jazeera などが情報源になります。

### 方法B. Google Apps Script（独立運用）

Claude 側の都合に左右されない方法です。ニュースを **RSS から直接取る**ので、
ウェブ検索の当たり外れに影響されません。Anthropic の APIキーが必要です。

#### 手順1. Apps Script プロジェクトを作る

1. [script.google.com](https://script.google.com/) で新規プロジェクトを作成
2. `gas/Code.gs` の中身を丸ごと貼り付け
3. 歯車アイコン →「プロジェクトの設定」→「`appsscript.json` マニフェストファイルを
   エディタで表示する」にチェック → `gas/appsscript.json` の中身に差し替え
4. 同じ「プロジェクトの設定」の下部 **スクリプト プロパティ**に次の2つを追加

   | プロパティ | 値 |
   |---|---|
   | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) で発行したAPIキー |
   | `MAIL_TO` | 教材を受け取るメールアドレス |

   APIキーはこのリポジトリには絶対に書かないでください。スクリプトプロパティ経由でのみ読み込みます。

#### 手順2. 動作確認

1. 関数 **`checkFeeds`** を実行（初回は権限の承認が出ます）
   - 実行ログに各RSSの取得件数と見出しが出ます
   - 0件のフィードがあれば `CONFIG.WORLD_FEEDS` / `CONFIG.JAPAN_FEEDS` を差し替え
2. 関数 **`dryRun`** を実行 → メールを送らずに本文をログで確認
3. 問題なければ **`dailyRun`** を実行 → 実際にメールが届くか確認

#### 手順3. 毎朝6時のトリガーを登録

関数 **`installTrigger`** を1回だけ実行します。
以後、毎朝6時台（Asia/Tokyo）に `dailyRun` が自動実行されます。
止めたいときは `removeTriggers` を実行してください。

---

## まず試す（自動化なし・5分）

自動化の前に、教材の中身が好みに合うか確認したいときは手動版が速いです。

1. `PROMPT.md` の「ここからコピー」〜「ここまでコピー」を丸ごとコピー
2. `{{DATE}}` を今日の日付（例 `2026-10-24`）に置換
3. ウェブ検索をオンにした ChatGPT に貼り付けて実行
4. 出てきた Part を1つずつ貼り直して、音声モードで読み上げさせる

---

## 設定できるところ（`Code.gs` 冒頭の `CONFIG`）

| キー | 既定値 | 説明 |
|---|---|---|
| `LEVELS` | `['pre1']` | 配信するレベル。`['pre1','grade2','grade3']` で毎朝3通 |
| `INCLUDE_JAPANESE_SUMMARY` | `true` | メール末尾に日本語の要約・和訳・解答を付ける |
| `WORLD_FEEDS` | BBC World | 世界のニュースのRSS（複数可） |
| `JAPAN_FEEDS` | NHK主要 / The Japan Times | 日本のニュースのRSS（複数可） |
| `ITEMS_PER_FEED` | `8` | 各フィードから拾う記事数 |
| `MAX_AGE_HOURS` | `48` | 何時間以内の記事を対象にするか |
| `MODEL` | `claude-sonnet-5` | 生成に使うモデル |
| `MAX_TOKENS` | `16000` | 3レベル分＋日本語まとめでも足りる量 |

`LEVELS` は順序を気にせず書けます。`['grade3','pre1']` と書いても
準1級 → 3級の順に正規化され、知らないIDは無視されます。

デフォルトのRSSは広く使われているURLですが、配信元の都合で変わることがあります。
`checkFeeds()` の実行ログで各フィードの取得件数を必ず一度確認してください。

---

## 届くメールの形

```
【英検準1級】リスニング教材 2026-10-24

おはようございます。2026-10-24 の英検準1級リスニング教材です。

Part 1 / Part 2 / Part 3 を1つずつ ChatGPT に貼り付けて、音声で読ませてください。
各パートの「▼ここから」〜「▲ここまで」をまるごとコピーします。

════════════ Part 1  World News ════════════
▼ここから
Read the following English text aloud at about 150 words per minute, in a calm,
neutral news-anchor voice. Read it straight through. Do not translate,
summarize, or add any comment.

Anxiety about the enormous sums being committed to artificial intelligence
unsettled financial markets this week, sending the Dow Jones Industrial
Average down by more than six hundred points in a single session. ...
▲ここまで
Word count: 413 words ／ 目安 2分45秒
```

- 「▼ここから」〜「▲ここまで」に日本語は入りません。**その範囲をコピーして
  ChatGPT に貼るだけ**で読み上げが始まります
- 数字は `two thousand three hundred` のように英単語で綴られているので、
  読み上げAIが「2,300」を誤読しません
- 記号・箇条書き・絵文字を本文に入れていないので、記号読みのノイズが入りません
- 和訳・語注・設問の解答はメール末尾の「日本語まとめ」にまとめてあります
  （聞く前にネタバレしないよう、あえて分離しています）

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `スクリプトプロパティ ... が未設定です` | 手順1-4のプロパティ名のスペルを確認 |
| `Claude API エラー 401` | APIキーが無効。console.anthropic.com で再発行 |
| `RSSから記事を1本も取得できませんでした` | `checkFeeds()` で件数を確認し、フィードURLを差し替え |
| `APIの応答をJSONとして解釈できませんでした` | ログに応答の先頭200文字が出ます。`MAX_TOKENS` 不足で途中で切れていないか確認 |
| 実行が6分で打ち切られる | Apps Scriptの実行時間上限。`CONFIG.LEVELS` を1レベルに絞ると収まります |
| メールが届かない | Gmailの送信上限（無料アカウントは1日あたりの制限あり）と迷惑メールフォルダを確認 |
| 英文に記号や日本語が混ざる | `Code.gs` の `buildUserPrompt_()` の「本文の書式ルール」を強めてください |

---

## メモ

- `PROMPT.md` と `Code.gs` の `buildUserPrompt_()` は同じ内容を持っています。
  **片方を直したらもう片方も直してください。**
- このディレクトリは企業サイトの公開対象外です（`robots.txt` で `/tools/` を除外）。
