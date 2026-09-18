/**
 * vault のノートから index.html を組み立てるレンダラ。
 *
 * templates/index.html がレイアウト、vault/10-company/ の `site:` 付きノートが内容。
 * テンプレートの記法は2種類だけ:
 *   {{path}}          … 1行の差し込み（属性値の中でも使える）
 *   <!--@name-->      … 複数行のブロック（段落・カード・表など）
 *
 * サイトのクラス名や SVG アイコンはこのファイルが持つ。文章・住所・社名などの
 * 「内容」は必ず vault 側に置くこと。
 */

/* ------------------------------------------------------------ Markdown 解析 */

/** 本文を `## 見出し` で分割する。見出しの前の部分は '' キーに入る。 */
export function splitSections(body) {
  const sections = new Map();
  let current = '';
  let buffer = [];
  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      sections.set(current, buffer.join('\n'));
      current = heading[1];
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  sections.set(current, buffer.join('\n'));
  return sections;
}

/** `### 見出し` ごとに { title, body } に分ける。 */
function splitSubsections(text) {
  const items = [];
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      current = { title: heading[1], lines: [] };
      items.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return items.map(({ title, lines }) => ({ title, body: lines.join('\n') }));
}

/** 空行区切りの段落。箇条書き・表・引用の行は段落として扱わない。 */
function paragraphs(text) {
  return (text ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !/^([-*+]\s|\||>)/.test(block))
    .map((block) => block.replace(/\s*\n\s*/g, ''));
}

/** `- [ラベル](URL)` の箇条書きを取り出す。 */
function linkList(text) {
  return [...(text ?? '').matchAll(/^[-*+]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/gm)].map((m) => ({
    label: m[1],
    href: m[2],
  }));
}

/** Markdown の表を行の配列にする（ヘッダ行と区切り行は落とす）。 */
function tableRows(text) {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)))
    .slice(1);
}

/* ------------------------------------------------------------------ 変換部品 */

/** 本文テキスト用。サイト側は & を実体参照で書いているので合わせる。 */
const text = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 属性値・メタタグ用。既存サイトに合わせて & はそのまま、" だけ逃がす。 */
const attr = (value) => String(value ?? '').replace(/"/g, '&quot;').replace(/©/g, '&copy;');

/** Google マップ埋め込みの q= パラメータ（既存サイトは空白を + で書いている）。 */
const mapQuery = (query) => encodeURIComponent(query).replace(/%20/g, '+');

const officeAddress = (office) => `${office.region}${office.locality}${office.street}`;

/* ---------------------------------------------------------------- アイコン */

/** 事業カードのアイコン。ノートの並び順で割り当てる。 */
const SERVICE_ICONS = [
  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
];

const EXTERNAL_LINK_ICON = `<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
</svg>`;

const INSTAGRAM_ICON = `<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M7.624 2.564A6.38 6.38 0 005.5 2.975 4.474 4.474 0 002.948 5.537a6.427 6.427 0 00-.4 2.124C2.5 8.592 2.5 8.892 2.5 11.267s.015 2.673.06 3.606a6.394 6.394 0 00.411 2.122 4.471 4.471 0 002.563 2.553 6.421 6.421 0 002.124.4c.931.041 1.231.05 3.605.046s2.674-.015 3.607-.059a6.4 6.4 0 002.121-.411 4.47 4.47 0 002.553-2.563 6.4 6.4 0 00.4-2.123c.041-.934.05-1.232.046-3.607s-.015-2.673-.059-3.606a6.389 6.389 0 00-.411-2.122 4.294 4.294 0 00-1.012-1.547 4.269 4.269 0 00-1.551-1.006 6.4 6.4 0 00-2.124-.4C13.9 2.51 13.605 2.5 11.23 2.5s-2.673.015-3.606.06m.1 15.813a4.854 4.854 0 01-1.625-.3 2.724 2.724 0 01-1.007-.652 2.694 2.694 0 01-.656-1 4.844 4.844 0 01-.3-1.624c-.043-.922-.052-1.2-.058-3.534s0-2.612.044-3.534a4.841 4.841 0 01.3-1.624A2.9 2.9 0 016.075 4.444a4.844 4.844 0 011.623-.3c.922-.044 1.2-.052 3.534-.058s2.612 0 3.535.044a4.837 4.837 0 011.624.3 2.9 2.9 0 011.664 1.657 4.819 4.819 0 01.3 1.623c.044.922.054 1.2.058 3.534s0 2.612-.044 3.534a4.86 4.86 0 01-.3 1.625 2.9 2.9 0 01-1.657 1.663 4.845 4.845 0 01-1.623.3c-.922.043-1.2.052-3.535.058s-2.611 0-3.534-.044m7.131-11.8A1.05 1.05 0 1115.9 5.524a1.05 1.05 0 01-1.048 1.051m-8.1 4.684a4.491 4.491 0 104.483-4.5 4.491 4.491 0 00-4.483 4.5m1.576 0a2.916 2.916 0 112.922 2.91 2.916 2.916 0 01-2.922-2.91"/>
</svg>`;

/* -------------------------------------------------------- ノート → サイトデータ */

export function collectSiteData(notes) {
  const bySite = new Map();
  for (const note of notes) {
    const key = note.data?.site;
    if (!key) continue;
    if (bySite.has(key)) {
      throw new Error(`site: ${key} のノートが重複しています（${bySite.get(key).relPath} と ${note.relPath}）`);
    }
    bySite.set(key, note);
  }

  const required = ['meta', 'company', 'hero', 'origin', 'philosophy', 'services', 'message'];
  const missing = required.filter((key) => !bySite.has(key));
  if (missing.length > 0) {
    throw new Error(`index.html に必要なノートがありません: site: ${missing.join(', ')}`);
  }

  const get = (key) => bySite.get(key);
  const metaNote = get('meta');
  const companyNote = get('company');
  const heroNote = get('hero');
  const philosophySections = splitSections(get('philosophy').body);
  const servicesSections = splitSections(get('services').body);

  const values = tableRows(philosophySections.get('大切にしている価値観')).map(([title, body]) => ({ title, body }));
  if (values.length === 0) throw new Error('理念ノートに「大切にしている価値観」の表がありません。');

  const services = splitSubsections(servicesSections.get('事業') ?? '').map((item) => ({
    title: item.title,
    body: paragraphs(item.body)[0] ?? '',
    links: linkList(item.body),
  }));
  if (services.length === 0) throw new Error('事業内容ノートの「## 事業」に `### 見出し` がありません。');
  if (services.length > SERVICE_ICONS.length) {
    throw new Error(`事業カードは最大 ${SERVICE_ICONS.length} 件です（scripts/site.mjs の SERVICE_ICONS にアイコンを足してください）。`);
  }

  const offices = companyNote.data.offices ?? [];
  if (offices.length === 0) throw new Error('会社概要ノートに offices がありません。');

  return {
    meta: metaNote.data,
    company: companyNote.data,
    offices,
    hero: { ...heroNote.data, lead: paragraphs(splitSections(heroNote.body).get('本文'))[0] ?? '' },
    origin: paragraphs(splitSections(get('origin').body).get('本文')),
    philosophy: {
      statement: get('philosophy').data.philosophy_statement,
      paragraphs: paragraphs(philosophySections.get('理念')),
    },
    vision: {
      statement: get('philosophy').data.vision_statement,
      paragraphs: paragraphs(philosophySections.get('ビジョン')),
    },
    values,
    services: { intro: paragraphs(servicesSections.get('概要'))[0] ?? '', items: services },
    message: {
      paragraphs: paragraphs(splitSections(get('message').body).get('本文')),
      role: get('message').data.signature_role,
      name: get('message').data.signature_name,
    },
  };
}

/* ------------------------------------------------------------ ブロックの描画 */

const prose = (items) => items.map((p) => `<p>${text(p)}</p>`);

function renderValues(values) {
  return values.flatMap(({ title, body }) => [
    '<article class="rounded-sm border border-slate-200 bg-white p-5 transition hover:border-slate-300">',
    `  <h4 class="mb-2 text-sm font-medium text-navy-900">${text(title)}</h4>`,
    `  <p class="prose-body text-[0.8125rem]">${text(body)}</p>`,
    '</article>',
  ]);
}

function renderServiceLinks(links) {
  const lines = ['<div class="mt-4 flex flex-wrap gap-2">'];
  for (const { label, href } of links) {
    const icon = href.includes('instagram.com') ? INSTAGRAM_ICON : EXTERNAL_LINK_ICON;
    lines.push(
      `  <a href="${attr(href)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-xs font-medium tracking-wide text-navy-900 transition hover:border-navy-900 hover:bg-slate-50">`,
      ...icon.split('\n').map((line) => `    ${line}`),
      `    ${text(label)}`,
      '  </a>',
    );
  }
  lines.push('</div>');
  return lines;
}

function renderServices(items) {
  const cards = items.map((service, index) => {
    const delay = index === 0 ? '' : ` fade-in-delay-${index}`;
    const lines = [
      `<article class="fade-in${delay} service-card group rounded-sm p-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">`,
      '  <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-sm bg-navy-900 text-white">',
      '    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">',
      `      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${SERVICE_ICONS[index]}"/>`,
      '    </svg>',
      '  </div>',
      `  <h3 class="mb-3 text-base font-medium text-navy-900">${text(service.title)}</h3>`,
      `  <p class="prose-body">${text(service.body)}</p>`,
    ];
    if (service.links.length > 0) lines.push(...renderServiceLinks(service.links).map((line) => `  ${line}`));
    lines.push('</article>');
    return lines;
  });
  return cards.flatMap((lines, index) => (index === 0 ? lines : ['', ...lines]));
}

function renderCompanyTable(company, offices) {
  const th = 'bg-slate-50 px-5 py-3.5 text-left text-xs font-medium tracking-wide text-slate-500';
  const row = (heading, body, { last = false, thExtra = '', thWidth = '' } = {}) => [
    last ? '<tr>' : '<tr class="border-b border-slate-100">',
    `  <th class="${thWidth}${th}${thExtra}">${text(heading)}</th>`,
    ...body,
    '</tr>',
  ];

  const addressBlock = [
    '  <td class="px-5 py-3.5 font-light text-slate-700">',
    '    <div class="space-y-3 leading-normal">',
    ...offices.flatMap((office) => [
      '      <div>',
      `        <p class="text-xs font-medium text-navy-900">${text(office.name)}</p>`,
      `        <p class="text-sm text-slate-700">〒${text(office.postal_code)}<br>${text(officeAddress(office))}</p>`,
      '      </div>',
    ]),
    '    </div>',
    '  </td>',
  ];

  return [
    ...row('会社名', [
      `  <td class="px-5 py-3.5 font-light text-slate-700">${text(company.company_name)}<br><span class="text-xs text-slate-500">${text(company.name_variants_line)}<br>${text(company.legal_name_en)}</span></td>`,
    ], { thWidth: 'w-36 shrink-0 ', thExtra: ' md:w-40' }),
    ...row('代表取締役', [`  <td class="px-5 py-3.5 font-light text-slate-700">${text(company.representative)}</td>`]),
    ...row('所在地', addressBlock, { thExtra: ' align-top' }),
    ...row('事業内容', [
      '  <td class="px-5 py-3.5 font-light leading-normal text-slate-700">',
      `    ${text(company.business_summary)}`,
      '  </td>',
    ], { thExtra: ' align-top' }),
    ...row('連絡先', [
      '  <td class="px-5 py-3.5 font-light text-slate-700">',
      `    <a href="mailto:${attr(company.email)}" class="text-navy-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-navy-900">${text(company.email)}</a>`,
      '  </td>',
    ]),
    ...row('セキュリティへの取り組み', [
      '  <td class="px-5 py-3.5">',
      '    <span class="inline-flex items-center gap-2 rounded-sm border border-navy-900/10 bg-navy-900/5 px-3 py-2 text-xs font-medium text-navy-900">',
      '      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">',
      '        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
      '      </svg>',
      `      ${text(company.security_label)}`,
      '    </span>',
      '  </td>',
    ], { last: true, thExtra: ' align-top' }),
  ];
}

function renderOffices(offices) {
  const cards = offices.map((office) => {
    const address = `〒${text(office.postal_code)}<br>${text(officeAddress(office))}`;
    if (!office.map_query) {
      return [
        '<article class="rounded-sm border border-slate-200 bg-white p-5 lg:col-span-3">',
        `  <p class="mb-1 text-xs font-medium text-navy-900">${text(office.name)}</p>`,
        `  <p class="text-xs leading-normal text-slate-600">${address}</p>`,
        '</article>',
      ];
    }
    return [
      '<article class="overflow-hidden rounded-sm border border-slate-200 bg-white">',
      '  <div class="p-5">',
      `    <p class="mb-1 text-xs font-medium text-navy-900">${text(office.name)}</p>`,
      `    <p class="text-xs leading-normal text-slate-600">${address}</p>`,
      '  </div>',
      '  <iframe',
      `    title="${attr(office.name)}所在地マップ"`,
      `    src="https://maps.google.com/maps?q=${mapQuery(office.map_query)}&amp;z=16&amp;output=embed"`,
      '    class="h-48 w-full border-0 border-t border-slate-100"',
      '    loading="lazy"',
      '    referrerpolicy="no-referrer-when-downgrade"',
      '    allowfullscreen',
      '  ></iframe>',
      '</article>',
    ];
  });
  return cards.flatMap((lines, index) => (index === 0 ? lines : ['', ...lines]));
}

function renderFooterOffices(offices) {
  return offices.map(
    (office) =>
      `<span class="block"><span class="text-slate-400">${text(office.name.replace(/オフィス$/, ''))}</span> 〒${text(office.postal_code)}<br>${text(officeAddress(office))}</span>`,
  );
}

function renderJsonLd(site) {
  const { company, meta, offices } = site;
  const hq = offices[0];
  const list = (values) => values.map((value) => JSON.stringify(value)).join(', ');
  return [
    '{',
    '  "@context": "https://schema.org",',
    '  "@graph": [',
    '    {',
    '      "@type": "Organization",',
    `      "@id": "${meta.url}#organization",`,
    `      "name": ${JSON.stringify(company.company_name)},`,
    `      "alternateName": [${list(company.alternate_names)}],`,
    `      "legalName": ${JSON.stringify(company.company_name)},`,
    `      "url": "${meta.url}",`,
    `      "email": ${JSON.stringify(company.email)},`,
    '      "address": {',
    '        "@type": "PostalAddress",',
    `        "postalCode": ${JSON.stringify(hq.postal_code)},`,
    `        "addressRegion": ${JSON.stringify(hq.region)},`,
    `        "addressLocality": ${JSON.stringify(hq.locality)},`,
    `        "streetAddress": ${JSON.stringify(hq.street)},`,
    '        "addressCountry": "JP"',
    '      },',
    `      "areaServed": ${JSON.stringify(company.area_served)}`,
    '    },',
    '    {',
    '      "@type": "WebSite",',
    `      "@id": "${meta.url}#website",`,
    `      "name": ${JSON.stringify(company.company_name)},`,
    `      "alternateName": [${list(company.alternate_names_short)}],`,
    `      "url": "${meta.url}",`,
    '      "inLanguage": "ja",',
    `      "publisher": { "@id": "${meta.url}#organization" }`,
    '    }',
    '  ]',
    '}',
  ];
}

/* ------------------------------------------------------------ テンプレート適用 */

function inlineValues(site) {
  return {
    'meta.page_title': site.meta.page_title,
    'meta.description': site.meta.description,
    'meta.keywords': site.meta.keywords,
    'meta.url': site.meta.url,
    'meta.og_title': site.meta.og_title,
    'meta.og_description': site.meta.og_description,
    'meta.twitter_title': site.meta.twitter_title,
    'meta.twitter_description': site.meta.twitter_description,
    'meta.contact_lead': site.meta.contact_lead,
    'meta.copyright': site.meta.copyright,
    'meta.pdf_href': site.meta.pdf_href,
    'meta.pdf_label': site.meta.pdf_label,
    'company.name': site.company.company_name,
    'company.brand': site.company.brand,
    'company.footer_names': site.company.footer_names,
    'company.email': site.company.email,
    'hero.eyebrow': site.hero.eyebrow,
    'hero.lede': site.hero.lede,
    'hero.headline': site.hero.headline,
    'hero.lead': site.hero.lead,
    'philosophy.statement': site.philosophy.statement,
    'vision.statement': site.vision.statement,
    'services.intro': site.services.intro,
    'message.signature_role': site.message.role,
    'message.signature_name': site.message.name,
  };
}

function blocks(site) {
  return {
    jsonld: renderJsonLd(site),
    origin: prose(site.origin),
    'philosophy-body': prose(site.philosophy.paragraphs),
    'vision-body': prose(site.vision.paragraphs),
    values: renderValues(site.values),
    services: renderServices(site.services.items),
    message: prose(site.message.paragraphs),
    'company-table': renderCompanyTable(site.company, site.offices),
    offices: renderOffices(site.offices),
    'footer-offices': renderFooterOffices(site.offices),
  };
}

/** templates/index.html に vault の内容を流し込んで index.html を作る。 */
export function renderIndexHtml(template, notes) {
  const site = collectSiteData(notes);
  const inline = inlineValues(site);
  const blockLines = blocks(site);

  let html = template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    if (!(key in inline)) throw new Error(`テンプレートの {{${key}}} に対応する値がありません。`);
    const value = inline[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`{{${key}}} の値が vault のノートで空です。`);
    }
    return attr(value);
  });

  html = html.replace(/([ \t]*)<!--@([a-z-]+)-->/g, (match, indent, name) => {
    const lines = blockLines[name];
    if (!lines) throw new Error(`テンプレートの <!--@${name}--> に対応する描画処理がありません。`);
    return lines.map((line) => (line === '' ? '' : indent + line)).join('\n') + '\n';
  });

  return html;
}
