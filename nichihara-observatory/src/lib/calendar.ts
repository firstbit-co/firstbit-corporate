/**
 * 開館日の判定。日付はすべて日本時間(JST)で扱う。
 *
 * 祝日の振替(「祝日の場合は翌平日」)は祝日データを持たないと自動判定できないため、
 * 当面は src/data/calendar-overrides.json に例外日を手で登録する運用とする。
 * 祝日の自動判定は docs/03-roadmap.md の Phase 2 を参照。
 */

export type CalendarOverride = {
  /** YYYY-MM-DD(JST) */
  date: string;
  open: boolean;
  reason: string;
};

export type DayStatus = {
  date: string;
  open: boolean;
  reason?: string;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date を JST の YYYY-MM-DD に変換 */
export function toJstDateString(date: Date): string {
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function jstWeekday(date: Date): number {
  return new Date(date.getTime() + JST_OFFSET_MS).getUTCDay();
}

export function dayStatus(
  date: Date,
  weeklyClosedDays: readonly number[],
  overrides: readonly CalendarOverride[],
): DayStatus {
  const key = toJstDateString(date);
  const override = overrides.find((o) => o.date === key);
  if (override) return { date: key, open: override.open, reason: override.reason };
  if (key.endsWith('-01-01')) return { date: key, open: false, reason: '元日休館' };
  if (weeklyClosedDays.includes(jstWeekday(date))) return { date: key, open: false, reason: '定休日' };
  return { date: key, open: true };
}

/** 今日から days 日分の開館状況 */
export function upcomingDays(
  from: Date,
  days: number,
  weeklyClosedDays: readonly number[],
  overrides: readonly CalendarOverride[],
): DayStatus[] {
  return Array.from({ length: days }, (_, i) =>
    dayStatus(new Date(from.getTime() + i * 86_400_000), weeklyClosedDays, overrides),
  );
}
