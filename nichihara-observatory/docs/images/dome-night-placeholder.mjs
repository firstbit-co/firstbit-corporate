/**
 * トップの背景 public/images/dome-night.jpg の「仮画像」(イラスト)の SVG を作る。
 * 本物の写真(夜空の下でスリットを開けたドーム)が届いたら、public/images/dome-night.jpg を写真で上書きする。
 * 写真は横長 3:2(1200×798 以上)。ドームを右寄り(横 70% 付近)に置くと文字と重ならない。
 *
 *   node docs/images/dome-night-placeholder.mjs → docs/images/dome-night-placeholder.svg
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 1200;
const H = 798;
let seed = 1985;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const stars = Array.from({ length: 320 }, () => {
  const x = rand() * W;
  const y = rand() * H * 0.8;
  const r = rand() ** 3 * 2 + 0.35;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.3 + rand() * 0.65).toFixed(2)}"/>`;
}).join('');

const trees = Array.from({ length: 26 }, (_, i) => {
  const x = 20 + i * 46 + rand() * 20;
  if (x > 680 && x < 990) return '';
  const base = x < 600 ? 700 - (x / 600) * 50 : 650 + ((x - 990) / 210) * 40;
  const h = 26 + rand() * 30;
  return `<path d="M${x.toFixed(0)} ${(base - h).toFixed(0)} l${(h * 0.32).toFixed(0)} ${h.toFixed(0)} h-${(h * 0.64).toFixed(0)}z" fill="#070b1c"/>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050816"/><stop offset=".6" stop-color="#101a3f"/><stop offset="1" stop-color="#26356b"/>
  </linearGradient>
  <linearGradient id="dome" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9aa4ba"/><stop offset=".45" stop-color="#eef1f6"/><stop offset="1" stop-color="#8790a8"/>
  </linearGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7c859c"/><stop offset=".45" stop-color="#c9d0de"/><stop offset="1" stop-color="#6d7690"/>
  </linearGradient>
  <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="30"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g filter="url(#blur)" opacity=".45">
  <ellipse cx="560" cy="300" rx="620" ry="70" fill="#8ea4e8" transform="rotate(-28 560 300)"/>
  <ellipse cx="620" cy="270" rx="380" ry="30" fill="#dfe6ff" transform="rotate(-28 620 270)"/>
</g>
${stars}
<path d="M0 640 Q180 600 360 620 T720 600 T1200 610 V798 H0Z" fill="#141d40"/>
<path d="M0 798 V700 C200 690 400 670 560 650 C640 642 700 640 960 640 C1040 642 1120 660 1200 690 V798Z" fill="#0b1128"/>
${trees}
<!-- 資料館 -->
<rect x="610" y="600" width="96" height="42" fill="#555e78"/>
<path d="M602 602 L658 580 L714 602Z" fill="#3e465f"/>
<rect x="628" y="614" width="14" height="12" fill="#ffcf7a" opacity=".85"/>
<!-- 天文台 -->
<rect x="730" y="522" width="180" height="120" fill="url(#wall)"/>
<rect x="726" y="514" width="188" height="12" fill="#5d6680"/>
<rect x="806" y="586" width="28" height="56" fill="#ffcf7a" opacity=".9"/>
<path d="M720 516 A100 100 0 0 1 920 516Z" fill="url(#dome)"/>
<path d="M804 418 Q820 415 836 418 L836 516 L804 516Z" fill="#0a0f24"/>
<rect x="790" y="452" width="22" height="78" rx="4" fill="#4a5578" transform="rotate(-24 801 491)"/>
<circle cx="812" cy="424" r="9" fill="#ffe9a8" opacity=".35"/>
<text x="${W - 20}" y="${H - 18}" text-anchor="end" font-family="sans-serif" font-size="18" fill="#ffffff" opacity=".55">仮画像(写真に差し替え)</text>
</svg>
`;

writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dome-night-placeholder.svg'), svg);
console.log('wrote dome-night-placeholder.svg');
