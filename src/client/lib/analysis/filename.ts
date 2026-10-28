/**
 * Reolink recording filenames encode start and end times:
 * Kamera-01-105741-112346.mp4  ->  recorded 10:57:41 .. 11:23:46
 * (a recording crossing midnight gets end < start).
 */

export interface ParsedTimes {
  startSec: number | null; // seconds of day
  endSec: number | null;
}

export function parseReolinkTimes(fileName: string): ParsedTimes | null {
  const m = /(\d{6})-(\d{6})/.exec(fileName.replace(/\.[^.]+$/, ""));
  if (!m) return null;
  const parse = (s: string): number | null => {
    const h = parseInt(s.slice(0, 2), 10);
    const mi = parseInt(s.slice(2, 4), 10);
    const sec = parseInt(s.slice(4, 6), 10);
    if (h > 23 || mi > 59 || sec > 59) return null;
    return h * 3600 + mi * 60 + sec;
  };
  const startSec = parse(m[1]!);
  const endSec = parse(m[2]!);
  if (startSec === null || endSec === null) return null;
  return { startSec, endSec: endSec <= startSec ? endSec + 86400 : endSec };
}

export function fmtClock(startSec: number | null, offset: number): string {
  if (startSec === null) return "--:--:--";
  // Truncate like the CLI (datetime + timedelta -> strftime drops the fraction),
  // so exported clocks line up with detect_sounds.py's CSV.
  const total = Math.floor(startSec + offset);
  const sec = ((total % 86400) + 86400) % 86400;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function fmtRel(sec: number): string {
  const t = Math.round(sec);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function fmtClockFromSecOfDay(secOfDay: number): string {
  const total = Math.floor(secOfDay);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** "HH:MM:SS" -> seconds of day; null if invalid. */
export function clockToSecOfDay(clock: string): number | null {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(clock);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mi = parseInt(m[2]!, 10);
  const s = parseInt(m[3]!, 10);
  if (h > 23 || mi > 59 || s > 59) return null;
  return h * 3600 + mi * 60 + s;
}
