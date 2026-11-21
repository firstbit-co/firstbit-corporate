import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moonAge, moonPhase } from '../src/lib/moon.ts';
import { dayStatus, toJstDateString, upcomingDays } from '../src/lib/calendar.ts';

test('既知の新月付近では月齢がほぼ0', () => {
  // 2024-01-11 11:57 UTC 新月
  const age = moonAge(new Date(Date.UTC(2024, 0, 11, 11, 57)));
  assert.ok(age < 1 || age > 28.5, `age=${age}`);
});

test('既知の満月付近では「満月」と判定', () => {
  // 2024-09-18 02:34 UTC 満月
  assert.equal(moonPhase(new Date(Date.UTC(2024, 8, 18, 2, 34))).name, '満月');
});

test('JST の日付境界', () => {
  // UTC 15:00 は JST 翌日 0:00
  assert.equal(toJstDateString(new Date(Date.UTC(2026, 9, 20, 15, 0))), '2026-10-21');
});

test('火・水は定休日、他は開館', () => {
  const closed = [2, 3];
  assert.equal(dayStatus(new Date('2026-10-20T12:00:00+09:00'), closed, []).open, false); // 火
  assert.equal(dayStatus(new Date('2026-10-21T12:00:00+09:00'), closed, []).open, false); // 水
  assert.equal(dayStatus(new Date('2026-10-22T12:00:00+09:00'), closed, []).open, true); // 木
});

test('元日は休館、例外日の登録が優先される', () => {
  assert.equal(dayStatus(new Date('2027-01-01T12:00:00+09:00'), [2, 3], []).open, false);
  const overrides = [{ date: '2026-10-20', open: true, reason: '特別開館' }];
  assert.deepEqual(dayStatus(new Date('2026-10-20T12:00:00+09:00'), [2, 3], overrides), {
    date: '2026-10-20',
    open: true,
    reason: '特別開館',
  });
});

test('upcomingDays は連続した日付を返す', () => {
  const days = upcomingDays(new Date('2026-10-18T12:00:00+09:00'), 3, [2, 3], []);
  assert.deepEqual(
    days.map((d) => d.date),
    ['2026-10-18', '2026-10-19', '2026-10-20'],
  );
});
