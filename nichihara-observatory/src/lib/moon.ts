/**
 * 月齢の簡易計算(外部API不要)。
 * 平均朔望月で計算するため誤差は最大で半日〜1日程度。画面では「目安」と明記すること。
 * 正確な値が必要になったら国立天文台の暦計算室データ等に置き換える(docs/03-roadmap.md 参照)。
 *
 * ブラウザ(<script>)と Node のテスト(node --test)の両方から読むため、
 * 型注釈以外の TypeScript 固有構文(enum, namespace 等)は使わない。
 */

const SYNODIC_MONTH = 29.530588853;
/** 2000-01-06 18:14 UTC の新月 */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

export function moonAge(date: Date): number {
  const days = (date.getTime() - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const age = days % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

export type MoonPhase = {
  age: number;
  /** 0=新月, 0.5=満月 */
  fraction: number;
  name: string;
  /** 観望会の案内用のひとこと */
  hint: string;
};

export function moonPhase(date: Date): MoonPhase {
  const age = moonAge(date);
  const fraction = age / SYNODIC_MONTH;
  return { age, fraction, name: phaseName(age), hint: phaseHint(age) };
}

function phaseName(age: number): string {
  if (age < 1.5 || age >= 28.5) return '新月';
  if (age < 6.5) return '三日月';
  if (age < 8.5) return '上弦の月';
  if (age < 13.5) return '十日夜〜十三夜';
  if (age < 16.5) return '満月';
  if (age < 21.5) return '居待月〜更待月';
  if (age < 23.5) return '下弦の月';
  return '有明月';
}

function phaseHint(age: number): string {
  if (age < 3 || age >= 26) return '月明かりが少なく、星雲・星団や天の川が見やすい夜です。';
  if (age >= 5 && age < 12) return '宵の空に月が見え、クレーターの観察にぴったりです。';
  if (age >= 12 && age < 18) return '月が明るく、淡い天体は見えにくくなります。月そのものや惑星がおすすめです。';
  return '月の出が遅く、宵のうちは星が見やすい夜です。';
}
