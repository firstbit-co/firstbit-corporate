#!/usr/bin/env node
/**
 * Obsidian vault (vault/) からサイトの公開ノートと索引を生成するビルドスクリプト。
 *
 *   node scripts/build.mjs          生成物をディスクに書き出す
 *   node scripts/build.mjs --check  生成物が最新かどうかだけ確認する（差分があれば exit 1）
 *
 * 生成されるもの:
 *   vault/INDEX.md        vault 全ノートの索引（Claude / 人間が最初に読む地図）
 *   notes/index.html      publish: true のノート一覧ページ
 *   notes/<slug>.html     publish: true のノート本文ページ
 *   sitemap.xml           トップページ + 公開ノート
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { renderIndexHtml } from './site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VAULT_DIR = path.join(ROOT, 'vault');
const TEMPLATE_FILE = path.join(ROOT, 'templates', 'index.html');
const NOTES_DIR = path.join(ROOT, 'notes');
const SITE_URL = 'https://firstbit-co.github.io/firstbit-corporate/';
const SITE_NAME = '株式会社Firstbit';

/** vault 内でノートとして扱わないディレクトリ。 */
const SKIP_DIRS = new Set(['.obsidian', '.trash', '90-templates', '99-private']);
/** vault 直下の生成ファイル。索引の対象にしない。 */
const GENERATED_IN_VAULT = new Set(['INDEX.md']);

const CHECK_ONLY = process.argv.includes('--check');
const warnings = [];

/* ------------------------------------------------------------------ 収集 */

function walk(dir, base = dir) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      files.push(...walk(full, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const rel = path.relative(base, full);
      if (GENERATED_IN_VAULT.has(rel)) continue;
      files.push(full);
    }
  }
  return files.sort((a, b) => a.localeCompare(b, 'ja'));
}

function normalizeTags(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,\s]+/);
  return [...new Set(list.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean))];
}

/** そのファイルを最後に変更したコミットの日付。git が使えなければ null。 */
function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * 日付は frontmatter を最優先し、無ければコミット日、それも取れなければ mtime。
 * CI ではチェックアウト時に mtime がビルド時刻になるため、コミット日を先に見る。
 */
function toDateString(value, fallbackFile) {
  const raw = value instanceof Date ? value : value ? new Date(value) : null;
  if (raw && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  return gitDate(fallbackFile) ?? fs.statSync(fallbackFile).mtime.toISOString().slice(0, 10);
}

/**
 * トップページの lastmod。index.html は生成物なのでコミット日を見ても意味がない。
 * サイト本文になっているノート（frontmatter に site: があるもの）の最終更新日を使う。
 */
function homeLastmod(notes) {
  const dates = notes.filter((n) => n.data?.site).map((n) => n.updated);
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : TODAY;
}

function firstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function firstParagraph(body) {
  const text = body
    .replace(/^#.*$/gm, '')
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[>\-*+]\s*/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p.length > 0);
  if (!text) return '';
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > 120 ? `${oneLine.slice(0, 120)}…` : oneLine;
}

function makeSlug(data, file, relPath) {
  const explicit = data.slug ? String(data.slug).trim() : '';
  if (explicit) return explicit.replace(/[^\w-]/g, '-').replace(/-+/g, '-').toLowerCase();
  const base = path.basename(file, '.md');
  const ascii = base.toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  if (ascii.length >= 3) return ascii;
  return `note-${createHash('sha1').update(relPath).digest('hex').slice(0, 8)}`;
}

function collectNotes() {
  return walk(VAULT_DIR).map((file) => {
    const relPath = path.relative(VAULT_DIR, file).split(path.sep).join('/');
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const basename = path.basename(file, '.md');
    return {
      file,
      relPath,
      data,
      folder: path.dirname(relPath) === '.' ? '(vault直下)' : path.dirname(relPath),
      basename,
      title: (data.title && String(data.title).trim()) || firstHeading(content) || basename,
      tags: normalizeTags(data.tags),
      summary: (data.summary && String(data.summary).trim()) || firstParagraph(content),
      updated: toDateString(data.updated ?? data.date, file),
      publish: data.publish === true,
      slug: makeSlug(data, file, relPath),
      body: content.replace(/^#\s+.+$/m, '').trim(),
      links: new Set(),
    };
  });
}

/* ------------------------------------------- wikilink / Markdown レンダリング */

function buildLookup(notes) {
  const lookup = new Map();
  const add = (key, note) => {
    if (!key) return;
    const normalized = key.toLowerCase();
    if (!lookup.has(normalized)) lookup.set(normalized, note);
  };
  for (const note of notes) {
    add(note.basename, note);
    add(note.title, note);
    add(note.relPath.replace(/\.md$/, ''), note);
  }
  return lookup;
}

const WIKILINK = /(!?)\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

/** コードブロック・インラインコードの中身は変換対象から外す。 */
const CODE_SEGMENT = /(```[\s\S]*?```|`[^`\n]*`)/g;

/** [[ノート]] を、公開ノート同士ならリンクに、それ以外なら素のテキストに変換する。 */
function resolveWikilinks(note, lookup) {
  return note.body
    .split(CODE_SEGMENT)
    .map((segment, i) => (i % 2 === 1 ? segment : replaceWikilinks(note, lookup, segment)))
    .join('');
}

function replaceWikilinks(note, lookup, text) {
  return text.replace(WIKILINK, (match, embed, target, alias) => {
    const key = target.trim().toLowerCase();
    const found = lookup.get(key);
    const label = (alias || target).trim();
    if (!found) {
      warnings.push(`${note.relPath}: リンク先が見つかりません [[${target.trim()}]]`);
      return label;
    }
    note.links.add(found.relPath);
    if (embed) return label;
    if (!found.publish || !note.publish) return label;
    return `[${label}](./${found.slug}.html)`;
  });
}

marked.setOptions({ mangle: false, headerIds: true, breaks: false });

/* ------------------------------------------------------------- HTML 生成 */

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ title, description, canonicalPath, body }) {
  return `<!DOCTYPE html>
<html lang="ja" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${SITE_URL}${canonicalPath}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE_URL}${canonicalPath}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'] },
          colors: {
            navy: { 950: '#0a0f1a', 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
          },
        },
      },
    };
  </script>
  <style>
    body { font-family: 'Noto Sans JP', system-ui, sans-serif; line-height: 1.65; }

    /* ノート本文（Markdown から生成される部分）のタイポグラフィ */
    .note-body { font-size: 0.9375rem; font-weight: 300; line-height: 1.9; color: #475569; }
    .note-body > * + * { margin-top: 1.25rem; }
    .note-body h2 { margin-top: 2.75rem; font-size: 1.25rem; font-weight: 500; letter-spacing: -0.01em; color: #0f172a; }
    .note-body h3 { margin-top: 2rem; font-size: 1.0625rem; font-weight: 500; color: #0f172a; }
    .note-body h4 { margin-top: 1.75rem; font-size: 1rem; font-weight: 500; color: #0f172a; }
    .note-body a { color: #1e293b; text-decoration: underline; text-decoration-color: #cbd5e1; text-underline-offset: 4px; }
    .note-body a:hover { text-decoration-color: #64748b; }
    .note-body strong { font-weight: 600; color: #1e293b; }
    .note-body ul, .note-body ol { padding-left: 1.5rem; }
    .note-body ul { list-style: disc; }
    .note-body ol { list-style: decimal; }
    .note-body li + li { margin-top: 0.5rem; }
    .note-body blockquote { border-left: 2px solid #cbd5e1; padding: 0.25rem 0 0.25rem 1.25rem; color: #334155; font-style: normal; }
    .note-body code { background: #f1f5f9; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-size: 0.8125rem; color: #0f172a; }
    .note-body pre { overflow-x: auto; border-radius: 0.5rem; background: #0f172a; padding: 1rem 1.25rem; }
    .note-body pre code { background: transparent; padding: 0; color: #e2e8f0; font-size: 0.8125rem; line-height: 1.7; }
    .note-body hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2.5rem 0; }
    .note-body img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    .note-body table { width: 100%; border-collapse: collapse; font-size: 0.875rem; display: block; overflow-x: auto; }
    .note-body th, .note-body td { border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; text-align: left; vertical-align: top; }
    .note-body th { background: #f8fafc; font-weight: 500; color: #0f172a; white-space: nowrap; }
  </style>
</head>
<body class="bg-white text-slate-800 antialiased">

  <header class="bg-navy-950">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5 lg:px-8">
      <a href="../index.html" class="group flex flex-col leading-tight">
        <span class="text-lg font-semibold tracking-[0.12em] text-white transition group-hover:text-slate-200">Firstbit</span>
        <span class="text-[10px] font-light tracking-widest text-slate-400">${SITE_NAME}</span>
      </a>
      <nav class="flex items-center gap-6" aria-label="ノートナビゲーション">
        <a href="./index.html" class="text-xs font-medium tracking-[0.15em] text-slate-300 transition hover:text-white">NOTES</a>
        <a href="../index.html" class="text-xs font-medium tracking-[0.15em] text-slate-300 transition hover:text-white">HOME</a>
      </nav>
    </div>
  </header>

${body}

  <footer class="bg-navy-950 py-10">
    <div class="mx-auto max-w-4xl px-6 lg:px-8">
      <p class="text-base font-semibold tracking-[0.12em] text-white">Firstbit</p>
      <p class="mt-0.5 text-[10px] tracking-widest text-slate-500">${SITE_NAME}</p>
      <p class="mt-3">
        <a href="mailto:info@hiroshima-ifa.com" class="text-xs text-slate-400 transition hover:text-white">info@hiroshima-ifa.com</a>
      </p>
      <div class="mt-8 border-t border-white/10 pt-6">
        <p class="text-[11px] font-light tracking-wider text-slate-600">&copy; 2026 Firstbit Co., Ltd. ALL RIGHTS RESERVED.</p>
      </div>
    </div>
  </footer>

</body>
</html>
`;
}

function tagChips(tags) {
  if (tags.length === 0) return '';
  const chips = tags
    .map(
      (tag) =>
        `<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] tracking-wide text-slate-600">#${escapeHtml(tag)}</span>`,
    )
    .join('\n            ');
  return `<div class="mt-5 flex flex-wrap gap-2">\n            ${chips}\n          </div>`;
}

function notePage(note, related) {
  const relatedHtml =
    related.length === 0
      ? ''
      : `
        <nav class="mt-12 border-t border-slate-200 pt-6" aria-label="関連ノート">
          <p class="text-xs font-medium tracking-[0.15em] text-slate-500">RELATED</p>
          <ul class="mt-3 space-y-2">
            ${related
              .map((r) => `<li><a href="./${r.slug}.html" class="text-sm text-navy-800 underline decoration-slate-300 underline-offset-4 transition hover:decoration-navy-800">${escapeHtml(r.title)}</a></li>`)
              .join('\n            ')}
          </ul>
        </nav>`;

  const body = `  <main class="bg-white py-14 md:py-20">
    <div class="mx-auto max-w-3xl px-6 lg:px-8">
      <p class="text-xs tracking-[0.15em] text-slate-500">
        <a href="./index.html" class="transition hover:text-navy-900">NOTES</a>
        <span class="mx-2 text-slate-300">/</span>
        <time datetime="${note.updated}">${note.updated}</time>
      </p>
      <h1 class="mt-4 text-2xl font-medium leading-snug tracking-tight text-navy-900 md:text-3xl">${escapeHtml(note.title)}</h1>
      ${tagChips(note.tags)}
      <article class="note-body mt-10">
${note.html}
      </article>${relatedHtml}
      <p class="mt-12">
        <a href="./index.html" class="text-xs tracking-[0.15em] text-slate-500 transition hover:text-navy-900">&larr; NOTES 一覧へ</a>
      </p>
    </div>
  </main>
`;

  return layout({
    title: note.title,
    description: note.summary || `${SITE_NAME}のノート「${note.title}」`,
    canonicalPath: `notes/${note.slug}.html`,
    body,
  });
}

function notesIndexPage(published) {
  const items =
    published.length === 0
      ? `<p class="prose-body text-sm font-light text-slate-500">公開中のノートはまだありません。</p>`
      : `<ul class="mt-10 divide-y divide-slate-200 border-t border-slate-200">
          ${published
            .map(
              (note) => `<li class="py-6">
            <p class="text-xs tracking-[0.15em] text-slate-500"><time datetime="${note.updated}">${note.updated}</time></p>
            <h2 class="mt-2 text-lg font-medium tracking-tight text-navy-900">
              <a href="./${note.slug}.html" class="transition hover:text-navy-700">${escapeHtml(note.title)}</a>
            </h2>
            ${note.summary ? `<p class="mt-2 text-sm font-light leading-relaxed text-slate-600">${escapeHtml(note.summary)}</p>` : ''}
          </li>`,
            )
            .join('\n          ')}
        </ul>`;

  const body = `  <main class="bg-white py-14 md:py-20">
    <div class="mx-auto max-w-3xl px-6 lg:px-8">
      <p class="text-xs font-medium tracking-[0.15em] text-slate-500">NOTES</p>
      <h1 class="mt-3 text-2xl font-medium tracking-tight text-navy-900 md:text-3xl">ノート</h1>
      <p class="mt-4 text-sm font-light leading-relaxed text-slate-600">${SITE_NAME}が公開しているノートの一覧です。</p>
      ${items}
    </div>
  </main>
`;

  return layout({
    title: 'ノート',
    description: `${SITE_NAME}が公開しているノートの一覧です。`,
    canonicalPath: 'notes/index.html',
    body,
  });
}

/* ------------------------------------------------------------ INDEX.md */

function indexMarkdown(notes) {
  // ビルドのたびに差分が出ないよう、索引の日付は「最も新しいノートの日付」にする
  const updated = notes.reduce((latest, n) => (n.updated > latest ? n.updated : latest), '') || TODAY;
  const byFolder = new Map();
  for (const note of notes) {
    if (!byFolder.has(note.folder)) byFolder.set(note.folder, []);
    byFolder.get(note.folder).push(note);
  }

  const tagMap = new Map();
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(note);
    }
  }

  const lines = [
    '---',
    'generated: true',
    `updated: ${updated}`,
    '---',
    '',
    '# vault 索引',
    '',
    '> このファイルは `npm run build` で自動生成されます。直接編集しないでください。',
    `> ノート ${notes.length} 件 / うちサイト公開 ${notes.filter((n) => n.publish).length} 件。`,
    '',
  ];

  for (const folder of [...byFolder.keys()].sort((a, b) => a.localeCompare(b, 'ja'))) {
    lines.push(`## ${folder}`, '');
    for (const note of byFolder.get(folder)) {
      const meta = [`更新 ${note.updated}`];
      if (note.tags.length) meta.push(note.tags.map((t) => `#${t}`).join(' '));
      meta.push(note.publish ? `公開 /notes/${note.slug}.html` : '非公開');
      lines.push(`- **[[${note.basename}]]** — ${note.title}`);
      lines.push(`  - ${meta.join(' ・ ')}`);
      lines.push(`  - パス: \`vault/${note.relPath}\``);
      if (note.summary) lines.push(`  - ${note.summary}`);
    }
    lines.push('');
  }

  if (tagMap.size > 0) {
    lines.push('## タグ', '');
    for (const tag of [...tagMap.keys()].sort((a, b) => a.localeCompare(b, 'ja'))) {
      lines.push(`- **#${tag}**: ${tagMap.get(tag).map((n) => `[[${n.basename}]]`).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function sitemapXml(published, notes) {
  const urls = [
    `  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${homeLastmod(notes)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
  ];
  if (published.length > 0) {
    urls.push(`  <url>
    <loc>${SITE_URL}notes/</loc>
    <lastmod>${published[0].updated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }
  for (const note of published) {
    urls.push(`  <url>
    <loc>${SITE_URL}notes/${note.slug}.html</loc>
    <lastmod>${note.updated}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

/* ------------------------------------------------------------------ 本体 */

function build() {
  const notes = collectNotes();
  const lookup = buildLookup(notes);

  const slugs = new Map();
  for (const note of notes) {
    if (!note.publish) continue;
    if (slugs.has(note.slug)) {
      throw new Error(
        `slug が重複しています: "${note.slug}" (${slugs.get(note.slug)} と ${note.relPath})。frontmatter の slug を指定してください。`,
      );
    }
    slugs.set(note.slug, note.relPath);
  }

  for (const note of notes) {
    note.html = marked.parse(resolveWikilinks(note, lookup));
  }

  const published = notes
    .filter((n) => n.publish)
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'ja'));

  const byPath = new Map(notes.map((n) => [n.relPath, n]));
  const files = new Map();

  files.set('index.html', renderIndexHtml(fs.readFileSync(TEMPLATE_FILE, 'utf8'), notes));
  files.set('vault/INDEX.md', indexMarkdown(notes));
  files.set('notes/index.html', notesIndexPage(published));
  for (const note of published) {
    const related = [...note.links]
      .map((relPath) => byPath.get(relPath))
      .filter((n) => n && n.publish && n.relPath !== note.relPath);
    files.set(`notes/${note.slug}.html`, notePage(note, related));
  }
  files.set('sitemap.xml', sitemapXml(published, notes));

  return { files, notes, published };
}

function existingGeneratedNotePages() {
  if (!fs.existsSync(NOTES_DIR)) return [];
  return fs
    .readdirSync(NOTES_DIR)
    .filter((name) => name.endsWith('.html'))
    .map((name) => `notes/${name}`);
}

function main() {
  const { files, notes, published } = build();
  const stale = existingGeneratedNotePages().filter((rel) => !files.has(rel));

  if (CHECK_ONLY) {
    const drift = [];
    for (const [rel, content] of files) {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== content) drift.push(rel);
    }
    drift.push(...stale.map((rel) => `${rel} (不要)`));
    for (const warning of warnings) console.warn(`warn: ${warning}`);
    if (drift.length > 0) {
      console.error('生成物が最新ではありません:');
      for (const rel of drift) console.error(`  - ${rel}`);
      console.error('`npm run build` を実行してコミットしてください。');
      process.exit(1);
    }
    console.log(`OK: 生成物は最新です（ノート ${notes.length} 件 / 公開 ${published.length} 件）。`);
    return;
  }

  for (const [rel, content] of files) {
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  for (const rel of stale) {
    fs.rmSync(path.join(ROOT, rel));
    console.log(`削除: ${rel}`);
  }

  for (const warning of warnings) console.warn(`warn: ${warning}`);
  console.log(`ビルド完了: ノート ${notes.length} 件 / サイト公開 ${published.length} 件。`);
}

main();
