/** Date helpers for rows and the 7-day capture strip. No Intl dependency. */

const DAY = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** "Today" · "Yesterday" · "Fri 15 Aug" (adds the year when not this year). */
export function formatDay(ts: number): string {
  const now = Date.now();
  if (sameDay(ts, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(ts, yesterday.getTime())) return 'Yesterday';

  const d = new Date(ts);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "18 Oct 2026" — full date for statements and headers. */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "today" · "yesterday" · "N days ago" — for backup health. */
export function formatAgo(ts: number): string {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** True when `ts` is more than `days` whole days in the past. */
export function olderThan(ts: number, days: number): boolean {
  return startOfDay(Date.now()) - startOfDay(ts) > days * DAY;
}

/** [this month's start, next month's start) — budgets and recurring periods. */
export function monthRange(): { from: number; to: number } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
  };
}

/** The last `count` days (today first) for the capture sheet's date strip. */
export function recentDays(count = 7): { ts: number; label: string }[] {
  const out: { ts: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const ts = d.getTime();
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
    out.push({ ts, label });
  }
  return out;
}

/** Pick a day for an entry: keeps the current time-of-day so ordering stays natural. */
export function timestampOnDay(dayTs: number): number {
  const now = Date.now();
  const offset = now - startOfDay(now);
  return Math.min(dayTs + offset, now);
}

export { DAY };
