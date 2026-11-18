/**
 * Groups session start times into the bars on the home screen's Sessions card.
 * Uses the phone's local time zone, so "today" matches what the user sees.
 */
export type StatsView = 'day' | 'month' | 'year';

export interface StatsBucket {
  label: string;
  value: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Bucket boundaries for a view, oldest first. `end` of the last one is "tomorrow". */
function bucketsFor(view: StatsView, now: Date): { start: number; end: number; label: string }[] {
  const today = startOfLocalDay(now);

  if (view === 'day') {
    // The last 7 days, ending today.
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      return { start: start.getTime(), end: end.getTime(), label: WEEKDAYS[start.getDay()] };
    });
  }

  if (view === 'month') {
    // The last 4 weeks as 7-day blocks, W4 ending today.
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27 + i * 7);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      return { start: start.getTime(), end: end.getTime(), label: `W${i + 1}` };
    });
  }

  // The last 12 calendar months, ending with this one.
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start: start.getTime(), end: end.getTime(), label: MONTH_INITIALS[start.getMonth()] };
  });
}

/** The earliest time a view shows, for querying only the sessions it needs. */
export function statsRangeStart(view: StatsView, now: Date = new Date()): number {
  return bucketsFor(view, now)[0].start;
}

export function bucketSessionStarts(
  view: StatsView,
  startedAts: number[],
  now: Date = new Date()
): StatsBucket[] {
  const buckets = bucketsFor(view, now);
  const counts = buckets.map(() => 0);

  for (const t of startedAts) {
    const index = buckets.findIndex((b) => t >= b.start && t < b.end);
    if (index !== -1) counts[index] += 1;
  }

  return buckets.map((b, i) => ({ label: b.label, value: counts[i] }));
}
