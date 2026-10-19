/**
 * にちはらん(日原天文台キャラクター案)のラフ画を生成する。
 * デザインの元:ドームの帽子(紺のスリット+つば)、紺のケープ襟、胸の金の星、紺の足。
 * 「もっと可愛く」の方針:2頭身・目は低め&大きく・手足は短く丸く・線はやわらかい紺。
 *
 *   node docs/mascot/nichiharan.mjs   → docs/mascot/nichiharan/*.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'nichiharan');

export const COLORS = {
  line: '#1f2b57',
  skin: '#fffaf0',
  hat: '#ffffff',
  hatShade: '#e8ecf5',
  panel: '#b8c0d4',
  navy: '#1f2b57',
  gold: '#e3b341',
  blush: '#ffb9ad',
  mouth: '#f08a8a',
  tongue: '#ff6f7d',
  pillow: '#ffe7a3',
  cloud: '#a3adc8',
  rain: '#6aaef0',
  paper: '#ffffff',
};
const C = COLORS;

/** 線の共通属性(属性の重複は SVG として不正になるので太さは引数で渡す) */
const sw = (w = 5) => `stroke="${C.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export function star(cx, cy, r, inner = 0.45, round = false) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}Z`;
}
/** 4方向のきらきら */
const twinkle = (x, y, r) =>
  `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${C.gold}"/>`;

/** 腕:肩(x1,y1)から手先(x2,y2)までの丸いカプセル。手先が丸い手になる */
const limb = (x1, y1, x2, y2, w = 27) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return `<g transform="translate(${x1} ${y1}) rotate(${deg.toFixed(1)})"><rect x="${-w / 2}" y="${-w / 2}" width="${(len + w).toFixed(1)}" height="${w}" rx="${w / 2}" fill="${C.skin}" ${sw()}/></g>`;
};
const hand = (x, y, r = 12) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.skin}" ${sw()}/>`;

const P = {
  feet: `<g fill="${C.navy}" ${sw(4)}><ellipse cx="128" cy="300" rx="19" ry="10"/><ellipse cx="172" cy="300" rx="19" ry="10"/></g>`,
  body: `<path d="M106 226 C96 252 98 292 122 297 L178 297 C202 292 204 252 194 226Z" fill="${C.skin}" ${sw()}/>`,
  badge: `<path d="${star(150, 272, 10)}" fill="${C.gold}" stroke="${C.gold}" stroke-width="2" stroke-linejoin="round"/>`,
  /** フリル風のケープ襟。左右にちょこんと裾が出る */
  cape: `<path d="M102 232 Q92 248 84 258 Q95 259 103 254 Q114 264 126 256 Q138 265 150 257 Q162 265 174 256 Q186 264 197 254 Q205 259 216 258 Q208 248 198 232Z" fill="${C.navy}" ${sw(4)}/>`,
  head: `<ellipse cx="150" cy="168" rx="96" ry="74" fill="${C.skin}" ${sw()}/>`,
  hat: (open = true) => `
    <path d="M62 128 C62 72 100 38 150 38 C200 38 238 72 238 128Z" fill="${C.hat}" ${sw()}/>
    <path d="M70 124 C72 90 92 64 120 52" fill="none" stroke="${C.hatShade}" stroke-width="10" stroke-linecap="round"/>
    <g fill="none" stroke="${C.panel}" stroke-width="3" stroke-linecap="round"><path d="M110 48 Q94 86 98 122"/><path d="M190 48 Q206 86 202 122"/></g>
    ${
      open
        ? `<path d="M134 41 Q130 82 132 122 L168 122 Q170 82 166 41 Q150 37 134 41Z" fill="${C.navy}" ${sw(4)}/>
           <path d="${star(150, 72, 7)}" fill="${C.gold}"/><circle cx="143" cy="98" r="2" fill="#fff"/><circle cx="157" cy="108" r="1.6" fill="#fff"/><circle cx="156" cy="54" r="1.4" fill="#fff"/>`
        : `<path d="M148 40 Q146 82 148 122" fill="none" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/>`
    }
    <rect x="50" y="116" width="200" height="26" rx="13" fill="${C.hat}" ${sw()}/>
    <path d="M62 136 H238" stroke="${C.hatShade}" stroke-width="5" stroke-linecap="round"/>`,
  blush: `<ellipse cx="94" cy="200" rx="15" ry="9.5" fill="${C.blush}" opacity=".85"/><ellipse cx="206" cy="200" rx="15" ry="9.5" fill="${C.blush}" opacity=".85"/>`,
  eyes: {
    open: [118, 182]
      .map(
        (x) =>
          `<ellipse cx="${x}" cy="181" rx="12.5" ry="16" fill="${C.navy}"/><ellipse cx="${x + 4.5}" cy="174" rx="5.2" ry="6" fill="#fff"/><circle cx="${x - 4.5}" cy="189" r="2.6" fill="#fff"/>`,
      )
      .join(''),
    happy: `<g fill="none" ${sw(5.5)}><path d="M106 184 Q118 168 130 184"/><path d="M170 184 Q182 168 194 184"/></g>`,
    wink: `<ellipse cx="118" cy="181" rx="12.5" ry="16" fill="${C.navy}"/><ellipse cx="122.5" cy="174" rx="5.2" ry="6" fill="#fff"/><circle cx="113.5" cy="189" r="2.6" fill="#fff"/><path d="M170 182 Q182 170 194 182" fill="none" ${sw(5.5)}/>`,
    sleep: `<g fill="none" ${sw(5)}><path d="M106 180 Q118 190 130 180"/><path d="M170 180 Q182 190 194 180"/></g>`,
    sad: [118, 182]
      .map((x) => `<ellipse cx="${x}" cy="182" rx="10" ry="12.5" fill="${C.navy}"/><ellipse cx="${x + 3}" cy="177" rx="4" ry="4.6" fill="#fff"/>`)
      .join('') + `<g fill="none" ${sw(4)}><path d="M104 160 L128 154"/><path d="M196 160 L172 154"/></g>`,
    sparkle: [118, 182].map((x) => `<path d="${star(x, 180, 15, 0.46)}" fill="${C.navy}" ${sw(3)}/><circle cx="${x + 3}" cy="176" r="3" fill="#fff"/>`).join(''),
  },
  mouth: {
    open: `<path d="M140 196 Q150 214 160 196Z" fill="${C.mouth}" ${sw(4)}/><path d="M144 204 Q150 210 156 204" fill="${C.tongue}"/>`,
    smile: `<path d="M142 198 Q150 206 158 198" fill="none" ${sw(4)}/>`,
    cat: `<path d="M136 198 Q143 205 150 198 Q157 205 164 198" fill="none" ${sw(4)}/>`,
    small: `<path d="M145 200 Q150 204 155 200" fill="none" ${sw(4)}/>`,
    frown: `<path d="M142 205 Q150 197 158 205" fill="none" ${sw(4)}/>`,
    o: `<ellipse cx="150" cy="202" rx="6" ry="7" fill="${C.mouth}" ${sw(3.5)}/>`,
  },
  // 小物・効果
  wave: `<g fill="none" stroke="${C.line}" stroke-width="3.5" stroke-linecap="round" opacity=".55"><path d="M22 182 q-8 12 0 24"/><path d="M12 174 q-10 20 0 40"/></g>`,
  sparkles: twinkle(36, 92, 14) + twinkle(266, 112, 12) + twinkle(252, 44, 8),
  zzz: `<g fill="#7f8bb0" font-family="sans-serif" font-weight="700"><text x="236" y="72" font-size="26">Z</text><text x="256" y="48" font-size="18">z</text><text x="270" y="30" font-size="13">z</text></g>`,
  pillow: `<rect x="82" y="238" width="136" height="46" rx="22" fill="${C.pillow}" ${sw()}/><path d="${star(116, 260, 8)}" fill="${C.gold}"/><path d="${star(184, 264, 7)}" fill="${C.gold}"/><circle cx="150" cy="270" r="3" fill="${C.gold}"/>`,
  cloud: `<path d="M206 44 a17 17 0 0 1 32 -6 a15 15 0 0 1 28 11 a13 13 0 0 1 -4 26 h-54 a15 15 0 0 1 -2 -31z" fill="${C.cloud}" ${sw(4)}/><g stroke="${C.rain}" stroke-width="4.5" stroke-linecap="round"><path d="M222 86 l-4 11"/><path d="M240 86 l-4 11"/><path d="M258 86 l-4 11"/></g>`,
  sweat: `<path d="M226 150 q9 13 0 18 q-9 -5 0 -18z" fill="${C.rain}" ${sw(3)}/>`,
  letter: `<rect x="104" y="240" width="92" height="56" rx="6" fill="${C.paper}" ${sw()}/><path d="M104 245 L150 274 L196 245" fill="none" ${sw(4)}/><path d="${star(150, 280, 10)}" fill="${C.gold}" ${sw(2.5)}/>`,
  telescope: `<g transform="rotate(-28 222 170)"><rect x="196" y="156" width="78" height="28" rx="9" fill="${C.navy}" ${sw(4)}/><rect x="266" y="150" width="20" height="40" rx="7" fill="${C.navy}" ${sw(4)}/><ellipse cx="282" cy="170" rx="5" ry="14" fill="#3a4a80"/><path d="M226 156 V184" stroke="${C.gold}" stroke-width="5"/></g>`,
  shadow: `<ellipse cx="150" cy="306" rx="70" ry="8" fill="${C.line}" opacity=".08"/>`,
};

const ARMS = {
  // 上げた腕は頭の後ろに描き、手先だけ顔の外に出す(付け根が頭に隠れてちびキャラらしくなる)
  waveDown: limb(188, 256, 204, 278),
  waveUp: limb(110, 254, 44, 200),
  cheer: limb(110, 252, 44, 200) + limb(190, 252, 256, 200),
  down: limb(112, 256, 98, 278) + limb(188, 256, 202, 278),
  telescope: limb(188, 252, 220, 200),
  hold: hand(92, 262) + hand(208, 262),
};

/** layers は描画順。腕は体の上・ケープと頭の下に描くと、肩の付け根が襟で隠れて自然になる */
export const VARIANTS = [
  { name: 'wave', label: 'こんばんは!(基本)', layers: ['shadow', 'feet', 'body', 'badge', 'arms.waveDown', 'arms.waveUp', 'cape', 'head', 'hat', 'blush', 'eyes.open', 'mouth.open', 'wave'] },
  { name: 'telescope', label: '観望ガイド', layers: ['shadow', 'feet', 'body', 'badge', 'arms.down', 'cape', 'head', 'hat', 'blush', 'eyes.wink', 'mouth.open', 'telescope', 'arms.telescope'] },
  { name: 'cheer', label: '今夜は開催!', layers: ['shadow', 'feet', 'body', 'badge', 'arms.cheer', 'cape', 'head', 'hat', 'blush', 'eyes.happy', 'mouth.open', 'sparkles'] },
  { name: 'sleep', label: '休館日・おやすみ', layers: ['shadow', 'feet', 'body', 'cape', 'head', 'hat:closed', 'blush', 'eyes.sleep', 'mouth.cat', 'pillow', 'arms.hold', 'zzz'] },
  { name: 'cancelled', label: 'くもりで中止…', layers: ['shadow', 'feet', 'body', 'badge', 'arms.down', 'cape', 'head', 'hat:closed', 'blush', 'eyes.sad', 'mouth.frown', 'cloud', 'sweat'] },
  { name: 'wish', label: '願い星★宅配便', layers: ['shadow', 'feet', 'body', 'cape', 'head', 'hat', 'blush', 'eyes.sparkle', 'mouth.open', 'letter', 'arms.hold'] },
];

function resolve(layer) {
  if (layer === 'hat:closed') return P.hat(false);
  if (layer === 'hat') return P.hat(true);
  const [group, key] = layer.split('.');
  if (group === 'arms') return ARMS[key];
  const v = key ? P[group][key] : P[group];
  return typeof v === 'function' ? v() : v;
}

export const nichiharanBody = (name) => VARIANTS.find((v) => v.name === name).layers.map(resolve).join('');

export function nichiharanSvg(v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 320" role="img"><title>にちはらん(${v.label})</title>${v.layers.map(resolve).join('')}</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const v of VARIANTS) writeFileSync(join(OUT, `${v.name}.svg`), nichiharanSvg(v));
  console.log(`wrote ${VARIANTS.length} files to ${OUT}`);
}
