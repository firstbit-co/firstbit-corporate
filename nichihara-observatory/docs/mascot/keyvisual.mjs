/**
 * キービジュアル(1200x630)の生成。OGP 画像やポスターのたたき台に使う。
 *
 *   node docs/mascot/keyvisual.mjs   → docs/mascot/makuran/keyvisual.svg
 *
 * 枕瀬山の山頂に立つマクラン、天の川、ハレー彗星、ふもとで合流する津和野川と高津川。
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kvDefs, makuranGroup, star } from './generate.mjs';

const W = 1200;
const H = 630;

// ビルドごとに配置が変わらない疑似乱数
let seed = 1985;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const stars = Array.from({ length: 260 }, () => {
  const x = rand() * W;
  const y = rand() * H * 0.72;
  const r = rand() ** 3 * 2.2 + 0.4;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.35 + rand() * 0.6).toFixed(2)}"/>`;
}).join('');

const brightStars = [
  [360, 90, 7],
  [1080, 210, 6],
  [560, 40, 5],
  [180, 300, 5],
]
  .map(([x, y, r]) => `<path d="${star(x, y, r, 0.3)}" fill="#fff6d0"/>`)
  .join('');

const font = `font-family="'Hiragino Sans','Noto Sans JP','IPAGothic',sans-serif"`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>日原天文台 キービジュアル(マクラン)</title>
<defs>
  ${kvDefs.replace(/^<defs>|<\/defs>$/g, '')}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050816"/><stop offset=".65" stop-color="#16224d"/><stop offset="1" stop-color="#2a3a72"/>
  </linearGradient>
  <linearGradient id="comet" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#bfe3ff" stop-opacity=".9"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<!-- 天の川 -->
<g filter="url(#blur)" opacity=".5">
  <ellipse cx="640" cy="230" rx="560" ry="70" fill="#8ea4e8" transform="rotate(-24 640 230)"/>
  <ellipse cx="700" cy="210" rx="360" ry="34" fill="#dfe6ff" transform="rotate(-24 700 210)"/>
</g>
${stars}
${brightStars}

<!-- ハレー彗星(ハレぼうのお母さん) -->
<path d="M1010 92 L860 168 L1000 104 Z" fill="url(#comet)"/>
<path d="M1012 90 L880 188" stroke="url(#comet)" stroke-width="3"/>
<circle cx="1012" cy="90" r="6" fill="#fffbe6"/><circle cx="1012" cy="90" r="14" fill="#fffbe6" opacity=".25"/>

<!-- 遠くの山なみ -->
<path d="M0 470 Q140 420 260 450 T520 440 T760 430 T1000 420 T1200 440 V630 H0Z" fill="#1a2550"/>
<!-- 枕瀬山 -->
<path d="M120 630 C340 560 520 470 720 452 C820 444 880 446 960 470 C1060 500 1140 560 1200 600 V630Z" fill="#0f1733"/>

<!-- 合流する津和野川と高津川 -->
<g fill="none" stroke-linecap="round">
  <path d="M0 600 C200 590 380 606 560 618" stroke="#5a7fd6" stroke-width="5" opacity=".7"/>
  <path d="M260 630 C360 622 460 620 560 618" stroke="#5a7fd6" stroke-width="5" opacity=".7"/>
  <path d="M560 618 C640 614 700 620 760 630" stroke="#7d9de6" stroke-width="7" opacity=".8"/>
</g>

<!-- 山頂のマクラン(ドームの光) -->
<ellipse cx="830" cy="380" rx="150" ry="110" fill="url(#glow)"/>
${makuranGroup('open-tonight', 'translate(742 262) scale(.78)')}

<!-- ふきだし -->
<g transform="translate(520 236)">
  <path d="M0 18 Q0 0 18 0 H222 Q240 0 240 18 V52 Q240 70 222 70 H214 L252 98 L176 70 H18 Q0 70 0 52Z" fill="#fff" stroke="#2b3550" stroke-width="3"/>
  <text x="120" y="45" text-anchor="middle" ${font} font-size="22" font-weight="700" fill="#2b3550">今夜は晴れるかな〜</text>
</g>

<!-- タイトル -->
<g ${font}>
  <text x="72" y="150" font-size="26" font-weight="700" fill="#f5c46b" letter-spacing="3">日本で最初の公開天文台</text>
  <text x="68" y="236" font-size="84" font-weight="700" fill="#ffffff" letter-spacing="8">日原天文台</text>
  <text x="74" y="290" font-size="24" fill="#c9d3ef" letter-spacing="2">島根県津和野町・枕瀬山の山頂から</text>
  <text x="74" y="324" font-size="24" fill="#c9d3ef" letter-spacing="2">口径75cmの望遠鏡で星空へ</text>
</g>
<text x="${W - 24}" y="${H - 18}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#7f8bb0">DRAFT — キャラクター案</text>
</svg>
`;

const out = join(dirname(fileURLToPath(import.meta.url)), 'makuran', 'keyvisual.svg');
writeFileSync(out, svg);
console.log(`wrote ${out}`);
