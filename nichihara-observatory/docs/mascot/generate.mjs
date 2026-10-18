/**
 * マクランのラフ画(SVG)を生成するスクリプト。
 * 体のパーツを共通化しているので、表情やポーズを足すときは VARIANTS に追加する。
 *
 *   node docs/mascot/generate.mjs   → docs/mascot/makuran/*.svg を出力
 *
 * 清書はイラストレーターに依頼する前提の「たたき台」。色は COLORS で一括変更できる。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'makuran');

const COLORS = {
  line: '#2b3550',
  body: '#f4f6fb',
  shade: '#cfd8e8',
  slit: '#141c38',
  star: '#ffd45c',
  starDeep: '#f5b942',
  pillow: '#ffe9a8',
  cheek: '#ffb3c1',
  mouth: '#e8505b',
  cloud: '#9aa6c2',
  rain: '#5aa9ef',
  paper: '#ffffff',
};

/** 五芒星のパス。cx, cy 中心、r 外径 */
function star(cx, cy, r, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}Z`;
}

const C = COLORS;
/** 線の共通属性。太さを変えるときは sw(3) のように呼ぶ(属性の重複は SVG として不正になる) */
const sw = (w = 4) => `stroke="${C.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const stroke = sw();

const parts = {
  defs: `<defs><linearGradient id="dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${C.shade}"/></linearGradient></defs>`,
  feet: (lift = 0) =>
    `<g ${stroke}><ellipse cx="92" cy="${232 - lift}" rx="20" ry="11" fill="${C.shade}"/><ellipse cx="148" cy="232" rx="20" ry="11" fill="${C.shade}"/></g>`,
  body: `<g ${stroke}><rect x="48" y="112" width="144" height="112" rx="22" fill="${C.body}"/><path d="M44 120 A76 76 0 0 1 196 120 Z" fill="url(#dome)"/></g>`,
  slitOpen: `<rect x="109" y="46" width="22" height="74" rx="11" fill="${C.slit}" ${stroke}/><path d="${star(120, 70, 9)}" fill="${C.star}"/><circle cx="114" cy="98" r="2" fill="#fff"/><circle cx="125" cy="108" r="1.6" fill="#fff"/>`,
  slitClosed: `<line x1="120" y1="48" x2="120" y2="118" stroke="${C.line}" stroke-width="3" opacity=".5"/>`,
  cheeks: `<circle cx="74" cy="170" r="9" fill="${C.cheek}" opacity=".8"/><circle cx="166" cy="170" r="9" fill="${C.cheek}" opacity=".8"/>`,
  eyes: {
    open: `<ellipse cx="94" cy="150" rx="11" ry="13" fill="${C.line}"/><ellipse cx="146" cy="150" rx="11" ry="13" fill="${C.line}"/><circle cx="98" cy="145" r="4" fill="#fff"/><circle cx="150" cy="145" r="4" fill="#fff"/><circle cx="91" cy="155" r="1.8" fill="#fff"/><circle cx="143" cy="155" r="1.8" fill="#fff"/>`,
    sleep: `<g fill="none" ${stroke}><path d="M82 152 q12 9 24 0"/><path d="M134 152 q12 9 24 0"/></g>`,
    happy: `<g fill="none" ${sw(5)}><path d="M82 156 q12 -14 24 0"/><path d="M134 156 q12 -14 24 0"/></g>`,
    sad: `<ellipse cx="94" cy="154" rx="9" ry="10" fill="${C.line}"/><ellipse cx="146" cy="154" rx="9" ry="10" fill="${C.line}"/><circle cx="97" cy="150" r="3" fill="#fff"/><circle cx="149" cy="150" r="3" fill="#fff"/><g fill="none" ${sw(3)}><path d="M82 142 l20 -7"/><path d="M158 142 l-20 -7"/></g>`,
    sparkle: `<path d="${star(94, 150, 14, 0.42)}" fill="${C.line}"/><path d="${star(146, 150, 14, 0.42)}" fill="${C.line}"/><circle cx="97" cy="146" r="2.5" fill="#fff"/><circle cx="149" cy="146" r="2.5" fill="#fff"/>`,
  },
  mouth: {
    smile: `<path d="M110 168 q10 10 20 0" fill="none" ${stroke}/>`,
    open: `<path d="M108 166 q12 18 24 0 z" fill="${C.mouth}" ${sw(3.5)}/>`,
    small: `<path d="M113 172 q7 5 14 0" fill="none" ${stroke}/>`,
    frown: `<path d="M110 176 q10 -9 20 0" fill="none" ${stroke}/>`,
    o: `<ellipse cx="120" cy="174" rx="6" ry="7" fill="${C.mouth}" ${sw(3)}/>`,
  },
  /** 腕(小さな丸)。left/right の y を変えてポーズをつける */
  arms: (ly = 196, ry = 196, lx = 46, rx = 194) =>
    `<g ${stroke}><ellipse cx="${lx}" cy="${ly}" rx="13" ry="11" fill="${C.body}"/><ellipse cx="${rx}" cy="${ry}" rx="13" ry="11" fill="${C.body}"/></g>`,
  pillow: `<g ${stroke}><rect x="62" y="182" width="116" height="44" rx="20" fill="${C.pillow}"/><ellipse cx="62" cy="200" rx="13" ry="11" fill="${C.body}"/><ellipse cx="178" cy="200" rx="13" ry="11" fill="${C.body}"/></g><path d="${star(100, 202, 8)}" fill="${C.starDeep}"/><path d="${star(140, 206, 6.5)}" fill="${C.starDeep}"/><circle cx="120" cy="214" r="3" fill="${C.starDeep}"/>`,
  zzz: `<g fill="#7f8bb0" font-family="sans-serif" font-weight="700"><text x="196" y="74" font-size="22">Z</text><text x="212" y="52" font-size="16">z</text><text x="224" y="36" font-size="12">z</text></g>`,
  wave: `<g fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M14 90 q-6 10 0 20"/><path d="M22 84 q-8 16 0 30"/></g>`,
  sparkles: `<path d="${star(30, 70, 10, 0.35)}" fill="${C.star}"/><path d="${star(212, 92, 8, 0.35)}" fill="${C.star}"/><path d="${star(206, 30, 6, 0.35)}" fill="${C.star}"/>`,
  cloud: `<g ${sw(3.5)}><path d="M150 38 a16 16 0 0 1 30 -6 a14 14 0 0 1 26 10 a12 12 0 0 1 -4 24 h-50 a14 14 0 0 1 -2 -28z" fill="${C.cloud}"/></g><g stroke="${C.rain}" stroke-width="4" stroke-linecap="round"><path d="M164 76 l-4 10"/><path d="M182 76 l-4 10"/><path d="M200 76 l-4 10"/></g>`,
  sweat: `<path d="M180 120 q8 12 0 16 q-8 -4 0 -16z" fill="${C.rain}" stroke="${C.line}" stroke-width="2.5"/>`,
  /** 願いごとの手紙(星のシール付き) */
  letter: `<g ${stroke}><rect x="80" y="186" width="80" height="48" rx="5" fill="${C.paper}"/><path d="M80 190 l40 24 40 -24" fill="none" stroke-width="3"/></g><path d="${star(120, 220, 9)}" fill="${C.star}" stroke="${C.line}" stroke-width="2"/>`,
  /** 小さな望遠鏡 */
  telescope: `<g ${stroke}><rect x="150" y="150" width="70" height="20" rx="6" fill="${C.shade}" transform="rotate(-35 185 160)"/><rect x="208" y="122" width="14" height="28" rx="4" fill="${C.line}" transform="rotate(-35 215 136)"/><path d="M178 178 l-10 40 M186 176 l10 42" fill="none"/></g>`,
};

/** 表情・ポーズの一覧。name はファイル名、label は用途 */
const VARIANTS = [
  { name: 'night-pillow', label: '基本(夜・まくら)', layers: ['feet', 'body', 'slitOpen', 'eyes.open', 'cheeks', 'mouth.smile', 'pillow'] },
  { name: 'day-sleep', label: '休館日・お昼寝', layers: ['feet', 'body', 'slitClosed', 'eyes.sleep', 'cheeks', 'mouth.small', 'pillow', 'zzz'] },
  { name: 'open-tonight', label: '今夜は開催!', layers: [['feet', 6], 'body', 'slitOpen', 'eyes.happy', 'cheeks', 'mouth.open', ['arms', 98, 196, 34, 194], 'wave', 'sparkles'] },
  { name: 'cancelled', label: 'くもりで中止…', layers: ['feet', 'body', 'slitClosed', 'eyes.sad', 'cheeks', 'mouth.frown', ['arms', 204, 204], 'cloud', 'sweat'] },
  { name: 'wish', label: '願い星★宅配便', layers: ['feet', 'body', 'slitOpen', 'eyes.sparkle', 'cheeks', 'mouth.open', 'letter', ['arms', 204, 204, 74, 166]] },
  { name: 'observe', label: '観望ガイド', layers: ['feet', 'body', 'slitOpen', 'eyes.open', 'cheeks', 'mouth.o', 'telescope', ['arms', 200, 168, 46, 176]] },
];

function resolve(layer) {
  const [key, ...args] = Array.isArray(layer) ? layer : [layer];
  const value = key.split('.').reduce((o, k) => o[k], parts);
  return typeof value === 'function' ? value(...args) : value;
}

export function makuranSvg(variant, { title = `マクラン(${variant.label})` } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" role="img"><title>${title}</title>${parts.defs}${variant.layers.map(resolve).join('')}</svg>\n`;
}

/** 別の SVG に埋め込むための <g>(defs の id 衝突を避けるため prefix を付ける) */
export function makuranGroup(variantName, transform) {
  const v = VARIANTS.find((x) => x.name === variantName);
  const body = v.layers.map(resolve).join('').replaceAll('url(#dome)', 'url(#kv-dome)');
  return `<g transform="${transform}">${body}</g>`;
}
export const kvDefs = parts.defs.replace('id="dome"', 'id="kv-dome"');
export { VARIANTS, star, COLORS };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const v of VARIANTS) writeFileSync(join(OUT, `${v.name}.svg`), makuranSvg(v));
  console.log(`wrote ${VARIANTS.length} files to ${OUT}`);
}
