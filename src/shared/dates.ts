const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

export interface CalendarWeek {
  year: number;
  week: number;
  key: number;
  label: string;
}

export function todayIsoString(timeZone = "Europe/Vienna"): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseIsoDate(value);
  return dateToIsoString(parsed) === value;
}

export function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export function dateToTimestamp(date: string): number {
  return parseIsoDate(date).getTime();
}

export function dateToIsoString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(date: string): string {
  const d = parseIsoDate(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

export function formatDateShort(date: string): string {
  const d = parseIsoDate(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.`;
}

export function formatTimestampDate(timestamp: number): string {
  return formatDate(dateToIsoString(new Date(timestamp)));
}

export function formatTimestampDateShort(timestamp: number): string {
  return formatDateShort(dateToIsoString(new Date(timestamp)));
}

export function formatWeekday(date: string): string {
  return WEEKDAYS[parseIsoDate(date).getUTCDay()]!;
}

export function getCalendarWeek(date: string): CalendarWeek {
  const d = parseIsoDate(date);
  const thursday = new Date(d);
  const day = (thursday.getUTCDay() + 6) % 7;
  thursday.setUTCDate(thursday.getUTCDate() - day + 3);

  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return {
    year,
    week,
    key: year * 100 + week,
    label: `KW ${week}/${year}`,
  };
}

export function compareOptionalDatesDesc(a: string | null, b: string | null): number {
  if (a && b) return b.localeCompare(a);
  if (a) return -1;
  if (b) return 1;
  return 0;
}
