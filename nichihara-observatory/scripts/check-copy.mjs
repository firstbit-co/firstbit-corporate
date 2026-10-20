/**
 * 表記ルールの検査(npm run build のあとに npm run check:copy)。ルールは docs/07-copy-rules.md。
 *
 * 1. dist/ の全ページの本文に、使わない表現が入っていないか調べる
 * 2. トップの <main> が確定稿 docs/copy/home-main.html と同じか調べる(空白の違いは無視)
 *
 * 確定稿を意図して変えたときは、docs/copy/home-main.html も同じように直す。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const APPROVED_HOME = 'docs/copy/home-main.html';

const RULES = [
  { pattern: /隣の|隣接/, why: '「隣の」は使わない' },
  { pattern: /日本初|日本で最初|すばるの試作|世界に2台/, why: '「日本初」「すばるの試作機」「世界に2台」は使わない(天文台について原稿の編集メモ)' },
  { pattern: /金曜[^。]{0,10}休/, why: '金曜の休館は書かない(休館は毎週火曜・水曜と元日)' },
  { pattern: /祝日の場合は翌/, why: '休館は毎週火曜・水曜。祝日の振替は書かない' },
  { pattern: /電話[^。]{0,12}(確認|お問い合わせください|お問い合わせを)/, why: '電話での確認はすすめない' },
  { pattern: /料金[^。]{0,10}(変わることがあります|変わる場合|変更になる)/, why: '料金は変わらない' },
  { pattern: /要予約|予約制|予約が必要|先着順|予約を受け付けて(い)?ます|ご予約ください/, why: '予約は受け付けていない' },
];

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

/** 画面に出る文字だけにする(script/style とタグを除く) */
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');

/** 比較用に、タグ間の空白・連続空白・属性の並び以外の差を見えるようにそろえる */
const normalize = (html) =>
  html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+>/g, '>')
    .replace(/\s*\/>/g, '>')
    .trim();

if (!existsSync(DIST)) {
  console.error('dist/ がありません。先に npm run build を実行してください。');
  process.exit(1);
}

const problems = [];
for (const file of htmlFiles(DIST)) {
  const text = visibleText(readFileSync(file, 'utf8'));
  for (const { pattern, why } of RULES) {
    const m = text.match(pattern);
    if (m) {
      const at = Math.max(0, m.index - 20);
      problems.push(`${relative(DIST, file)}: ${why} … 「${text.slice(at, m.index + m[0].length + 20).trim()}」`);
    }
  }
}

const home = readFileSync(join(DIST, 'index.html'), 'utf8').match(/<main[\s\S]*?<\/main>/)?.[0] ?? '';
const approved = readFileSync(APPROVED_HOME, 'utf8');
if (normalize(home) !== normalize(approved)) {
  const a = normalize(home);
  const b = normalize(approved);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  problems.push(
    `index.html: トップの <main> が確定稿(${APPROVED_HOME})と違います\n    ビルド: …${a.slice(Math.max(0, i - 40), i + 60)}…\n    確定稿: …${b.slice(Math.max(0, i - 40), i + 60)}…`,
  );
}

if (problems.length) {
  console.error(`表記ルールの検査で ${problems.length} 件見つかりました:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('表記ルールの検査: 問題なし');
