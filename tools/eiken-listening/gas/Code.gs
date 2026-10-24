/**
 * 英検リスニング教材 毎朝6時メール配信
 *
 * 流れ:
 *   1. RSSから直近のニュース記事を集める（世界 / 日本）
 *   2. Claude API に渡し、英検レベル別のリスニング用スクリプトをJSONで生成させる
 *   3. Gmailで自分宛てに送る（レベルごとに1通）
 *
 * セットアップ手順は ../README.md を参照。
 */

// ============================================================
// 設定
// ============================================================

var CONFIG = {
  // 配信するレベル。増やしたいときは配列に足す。
  //   'pre1'   = 英検準1級
  //   'grade2' = 英検2級
  //   'grade3' = 英検3級
  // 例: ['pre1', 'grade2', 'grade3'] にすると毎朝3通届く
  LEVELS: ['pre1'],

  // 日本語のまとめ（要約・和訳・設問解答）をメール末尾に付けるか
  INCLUDE_JAPANESE_SUMMARY: true,

  // ニュースのRSS。必要に応じて差し替えてください。
  WORLD_FEEDS: [
    'https://feeds.bbci.co.uk/news/world/rss.xml'
  ],
  JAPAN_FEEDS: [
    'https://www.nhk.or.jp/rss/news/cat0.xml',
    'https://www.japantimes.co.jp/feed/'
  ],

  // 各フィードから拾う記事数と、対象とする新しさ（時間）
  ITEMS_PER_FEED: 8,
  MAX_AGE_HOURS: 48,

  // Claude API
  MODEL: 'claude-sonnet-5',
  MAX_TOKENS: 16000
};

var LEVEL_ORDER = ['pre1', 'grade2', 'grade3'];

var LEVEL_SPECS = {
  pre1: {
    label: '英検準1級',
    wpm: 150,
    spec: [
      'pre1（英検準1級 / CEFR B2）',
      '  語彙  : 準1級頻出の抽象語・アカデミック語をパートあたり5〜8語',
      '  文長  : 平均18〜25語',
      '  文法  : 分詞構文、関係副詞、仮定法、無生物主語を自然に使う',
      '  総語数: 1300〜1500語（3パート合計）',
      '  速度  : 150 wpm'
    ].join('\n')
  },
  grade2: {
    label: '英検2級',
    wpm: 130,
    spec: [
      'grade2（英検2級 / CEFR B1）',
      '  語彙  : 高校標準レベル。専門語は使うならその場で平易に言い換える',
      '  文長  : 平均12〜18語',
      '  文法  : 現在完了、受動態、関係代名詞、不定詞、接続詞による複文まで',
      '  総語数: 900〜1100語（3パート合計）',
      '  速度  : 130 wpm'
    ].join('\n')
  },
  grade3: {
    label: '英検3級',
    wpm: 110,
    spec: [
      'grade3（英検3級 / CEFR A2）',
      '  語彙  : 中学卒業レベル。難語は必ず平易な語に置き換える',
      '  文長  : 平均8〜12語。1文に情報は1つだけ',
      '  文法  : 中学英語の範囲＋現在完了。分詞構文・関係副詞は使わない',
      '  総語数: 500〜650語（3パート合計）',
      '  速度  : 110 wpm'
    ].join('\n')
  }
};

// ============================================================
// エントリポイント
// ============================================================

/**
 * 毎朝6時に実行される本体。installTrigger() で登録する。
 */
function dailyRun() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var articles = collectArticles_();
  if (articles.world.length === 0 && articles.japan.length === 0) {
    throw new Error('RSSから記事を1本も取得できませんでした。CONFIGのフィードURLを確認してください。');
  }

  var material = generateMaterial_(today, articles);
  var mails = buildMails_(today, material);
  if (mails.length === 0) {
    throw new Error('送信できるメールがありません。CONFIG.LEVELS とAPIの応答を確認してください。');
  }

  mails.forEach(function (mail) { sendMail_(mail); });
  Logger.log('配信完了: ' + today + ' / ' + mails.length + '通');
}

/**
 * 設定を確認するための手動実行用。メールは送らずログに出すだけ。
 */
function dryRun() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var articles = collectArticles_();
  Logger.log('世界のニュース: ' + articles.world.length + '本 / 日本のニュース: ' + articles.japan.length + '本');
  var material = generateMaterial_(today, articles);
  buildMails_(today, material).forEach(function (mail) {
    Logger.log('=== 件名: ' + mail.subject + ' (' + mail.body.length + ' chars) ===\n' + mail.body);
  });
}

/**
 * RSSが生きているかだけを確認する。Claude APIは呼ばない。
 */
function checkFeeds() {
  var a = collectArticles_();
  ['world', 'japan'].forEach(function (k) {
    Logger.log('[' + k + '] ' + a[k].length + '本');
    a[k].forEach(function (x) { Logger.log('  (' + x.source + ') ' + x.title); });
  });
}

/**
 * 毎朝6時（Asia/Tokyo）のトリガーを登録する。1回だけ手動実行する。
 */
function installTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('dailyRun').timeBased().atHour(6).nearMinute(0).everyDays(1).create();
  Logger.log('毎朝6時台のトリガーを登録しました。');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyRun') ScriptApp.deleteTrigger(t);
  });
}

// ============================================================
// 1. ニュース収集
// ============================================================

function collectArticles_() {
  return {
    world: fetchFeeds_(CONFIG.WORLD_FEEDS),
    japan: fetchFeeds_(CONFIG.JAPAN_FEEDS)
  };
}

function fetchFeeds_(urls) {
  var cutoff = Date.now() - CONFIG.MAX_AGE_HOURS * 3600 * 1000;
  var out = [];

  urls.forEach(function (url) {
    var xml;
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() !== 200) {
        Logger.log('フィード取得失敗 (' + res.getResponseCode() + '): ' + url);
        return;
      }
      xml = XmlService.parse(res.getContentText());
    } catch (e) {
      Logger.log('フィード解析失敗: ' + url + ' / ' + e);
      return;
    }

    var items = collectItems_(xml.getRootElement());
    var kept = 0;
    for (var i = 0; i < items.length && kept < CONFIG.ITEMS_PER_FEED; i++) {
      var item = parseItem_(items[i]);
      if (!item.title) continue;
      if (item.published && item.published < cutoff) continue;
      item.source = hostOf_(url);
      out.push(item);
      kept++;
    }
  });

  return out;
}

/** RSS 2.0 の channel/item と、Atom の entry の両方を拾う */
function collectItems_(root) {
  var ns = root.getNamespace();
  var channel = root.getChild('channel', ns) || root.getChild('channel');
  if (channel) return channel.getChildren('item', ns).concat(channel.getChildren('item'));
  var entries = root.getChildren('entry', ns);
  return entries.length ? entries : root.getChildren('item');
}

function parseItem_(el) {
  var ns = el.getNamespace();
  var text = function (name) {
    var c = el.getChild(name, ns) || el.getChild(name);
    return c ? c.getText().trim() : '';
  };
  var published = text('pubDate') || text('published') || text('updated');
  var ts = published ? Date.parse(published) : 0;
  return {
    title: stripTags_(text('title')),
    body: stripTags_(text('description') || text('summary') || text('content')).slice(0, 700),
    published: isNaN(ts) ? 0 : ts
  };
}

function stripTags_(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function hostOf_(url) {
  var m = String(url).match(/^https?:\/\/([^\/]+)/);
  return m ? m[1] : url;
}

// ============================================================
// 2. 教材生成（Claude API）
// ============================================================

var SYSTEM_PROMPT = [
  'You are a bilingual news editor and EIKEN (実用英語技能検定) test-prep writer.',
  'You rewrite real news into listening scripts that a text-to-speech engine will',
  'read aloud to a Japanese learner. You never invent facts, never add numbers that',
  'are not in the source articles, and you drop any detail you cannot verify from',
  'the material you are given.',
  '',
  'You always reply with a single valid JSON object and nothing else. No prose',
  'before or after it, no Markdown code fences.'
].join('\n');

function generateMaterial_(today, articles) {
  var raw = callClaude_(buildUserPrompt_(today, articles));
  var parsed = parseJson_(raw);

  if (!parsed || !parsed.levels || !parsed.levels.length) {
    throw new Error('APIの応答をJSONとして解釈できませんでした。先頭200文字: ' + String(raw).slice(0, 200));
  }
  return parsed;
}

function buildUserPrompt_(today, articles) {
  var wanted = activeLevels_();

  return [
    '以下は本日（' + today + ' 日本時間）配信されたニュース記事の見出しと本文抜粋です。',
    '',
    '［世界のニュース候補］',
    formatArticles_(articles.world),
    '',
    '［日本のニュース候補］',
    formatArticles_(articles.japan),
    '',
    'この中から世界のニュース2本、日本のニュース2本を選び、リスニング用の',
    '英文スクリプトを次のレベルで作成してください。',
    '',
    '【選定基準】',
    '・分野が偏らないようにする（政治／経済／科学技術／社会・環境から散らす）',
    '・事件事故の生々しい描写、センセーショナルな話題は避ける',
    '・数値・固有名詞・日付は記事どおり正確に。裏が取れない数字は書かない',
    '・上の記事に書かれていない事実を足さない',
    '',
    '【レベル定義】',
    wanted.map(function (id) { return LEVEL_SPECS[id].spec; }).join('\n\n'),
    '',
    '【本文の書式ルール（音声読み上げにそのまま渡すため厳守）】',
    '・記号・絵文字・Markdown記法（*, #, -, > など）を使わない',
    '・箇条書きにしない。地の文の段落で書く',
    '・数字は英単語で綴る（2,300 → two thousand three hundred、15% → fifteen percent）',
    '  ただし西暦は自然な読み（1995 → nineteen ninety-five）',
    '・略語は初出時にフルスペルを先に言う（the World Health Organization, or W.H.O.）',
    '・1段落3〜5文。段落の区切りは改行2つ',
    '・対話形式にしない。ニュースキャスター1人が読む原稿として書く',
    '・日本語をbody内に混ぜない',
    '',
    '【パート構成（各レベル共通）】',
    'part1 : World News   世界のニュース2本',
    'part2 : Japan News   日本のニュース2本',
    'part3 : Focus & Drill',
    '        Part1かPart2から1本を選び、背景・影響・賛否の両論を掘り下げた解説文',
    '        （そのレベルの総語数の3割程度）',
    '        続けて Key Vocabulary 8語（英単語 / 品詞 / 英語の短い定義 / 例文1文。',
    '        すべて英語で、読み上げ可能な地の文として書く）',
    '        続けて Comprehension Questions 5問（英語の質問文のみ。選択肢は作らない）',
    '',
    '【出力】',
    '次のJSONスキーマちょうどに従って返すこと。キーの増減・順序変更をしない。',
    'levels には ' + wanted.join(', ') + ' を、この順番でちょうど' + wanted.length + '件入れる。',
    '',
    '{',
    '  "date": "' + today + '",',
    '  "levels": [',
    wanted.map(function (id) {
      return [
        '    {',
        '      "id": "' + id + '",',
        '      "label": "' + LEVEL_SPECS[id].label + '",',
        '      "wpm": ' + LEVEL_SPECS[id].wpm + ',',
        '      "parts": [',
        '        {"no": 1, "title": "World News",    "body": "...", "words": 0},',
        '        {"no": 2, "title": "Japan News",    "body": "...", "words": 0},',
        '        {"no": 3, "title": "Focus & Drill", "body": "...", "words": 0}',
        '      ]',
        '    }'
      ].join('\n');
    }).join(',\n'),
    '  ],',
    '  "japanese": {',
    '    "summaries": ["ニュース1の要約（2〜3行）", "...", "...", "..."],',
    '    "sources": ["媒体名", "..."],',
    '    "vocabulary": ["word ： 和訳 ： 英検での出題イメージ", "... 全8語"],',
    '    "answers": ["Q1: ...", "... 全5問"],',
    '    "tip": "今日のシャドーイングのコツ（1〜2行）"',
    '  }',
    '}',
    '',
    '"words" には body の実際の語数を整数で入れること。',
    '"body" は英文のみ。見出し・話者名・パート番号を body に含めない。',
    '"japanese" の中だけ日本語で書く。',
    '',
    '出力前に自己チェックすること（チェック結果は出力しない）:',
    ' 1. bodyに記号・絵文字・Markdownが残っていないか',
    ' 2. body中の算用数字がすべて英単語になっているか',
    ' 3. 各レベルの3パート合計語数が指定レンジに収まっているか',
    ' 4. grade3を含む場合、そのbodyに中学範囲外の語・文法が混ざっていないか',
    ' 5. 複数レベルを書いた場合、レベル間で事実関係に食い違いがないか',
    ' 6. JSONとして妥当か（末尾カンマなし、コメントなし、コードフェンスなし）'
  ].join('\n');
}

function formatArticles_(items) {
  if (!items.length) return '（取得できませんでした）';
  return items.map(function (a, i) {
    return (i + 1) + '. [' + a.source + '] ' + a.title + '\n   ' + a.body;
  }).join('\n');
}

function callClaude_(userPrompt) {
  var apiKey = requireProperty_('ANTHROPIC_API_KEY');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Claude API エラー ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 500));
  }

  var body = JSON.parse(res.getContentText());
  return (body.content || []).filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; }).join('');
}

/** コードフェンスや前後の説明文が混ざっても最初のJSONオブジェクトを取り出す */
function parseJson_(raw) {
  var s = String(raw || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(s);
  } catch (e) {
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch (e2) {
      return null;
    }
  }
}

// ============================================================
// 3. メール本文の組み立て
// ============================================================

/** レベルごとに1通。{subject, body} の配列を返す */
function buildMails_(today, material) {
  var mails = [];

  activeLevels_().forEach(function (id) {
    var level = findLevel_(material.levels, id);
    if (!level) {
      Logger.log('APIの応答にレベル ' + id + ' が含まれていませんでした。スキップします。');
      return;
    }

    var label = level.label || LEVEL_SPECS[id].label;
    var wpm = level.wpm || LEVEL_SPECS[id].wpm;
    var lines = [
      'おはようございます。' + today + ' の' + label + 'リスニング教材です。',
      '',
      'Part 1 / Part 2 / Part 3 を1つずつ ChatGPT に貼り付けて、音声で読ませてください。',
      '各パートの「▼ここから」〜「▲ここまで」をまるごとコピーします。',
      ''
    ];

    (level.parts || []).forEach(function (part) {
      var body = String(part.body || '').trim();
      if (!body) return;
      var words = part.words || countWords_(body);

      lines.push('════════════ Part ' + part.no + '  ' + (part.title || '') + ' ════════════');
      lines.push('▼ここから');
      lines.push('Read the following English text aloud at about ' + wpm + ' words per minute, in a calm, neutral news-anchor voice. Read it straight through. Do not translate, summarize, or add any comment.');
      lines.push('');
      lines.push(body);
      lines.push('▲ここまで');
      lines.push('Word count: ' + words + ' words ／ 目安 ' + formatDuration_(words, wpm));
      lines.push('');
    });

    if (CONFIG.INCLUDE_JAPANESE_SUMMARY && material.japanese) {
      lines.push('════════════ 日本語まとめ（聞き終わってから） ════════════');
      lines.push(japaneseSection_(material.japanese));
    }

    mails.push({
      subject: '【' + label + '】リスニング教材 ' + today,
      body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
    });
  });

  return mails;
}

function japaneseSection_(jp) {
  var lines = [];
  var section = function (title, arr) {
    if (!arr || !arr.length) return;
    lines.push('');
    lines.push('■ ' + title);
    arr.forEach(function (x) { lines.push('・' + x); });
  };
  section('今日のニュース', jp.summaries);
  section('出典', jp.sources);
  section('Key Vocabulary', jp.vocabulary);
  section('設問の解答', jp.answers);
  if (jp.tip) {
    lines.push('');
    lines.push('■ 今日のシャドーイングのコツ');
    lines.push(jp.tip);
  }
  return lines.join('\n').trim();
}

/** CONFIG.LEVELS を正規化する。未知のIDは捨て、LEVEL_ORDER順に並べる */
function activeLevels_() {
  var want = (CONFIG.LEVELS || []).filter(function (id) { return LEVEL_SPECS[id]; });
  var out = LEVEL_ORDER.filter(function (id) { return want.indexOf(id) >= 0; });
  return out.length ? out : ['pre1'];
}

function findLevel_(levels, id) {
  for (var i = 0; i < levels.length; i++) {
    if (levels[i] && levels[i].id === id) return levels[i];
  }
  return null;
}

function countWords_(text) {
  var m = String(text).trim().match(/\S+/g);
  return m ? m.length : 0;
}

function formatDuration_(words, wpm) {
  var sec = Math.round((words / wpm) * 60);
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return m + '分' + (s < 10 ? '0' + s : s) + '秒';
}

// ============================================================
// 4. メール送信
// ============================================================

function sendMail_(mail) {
  GmailApp.sendEmail(requireProperty_('MAIL_TO'), mail.subject, mail.body, {
    name: '英検リスニング'
  });
}

function requireProperty_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) {
    throw new Error('スクリプトプロパティ ' + key + ' が未設定です。README の手順2を確認してください。');
  }
  return v;
}
