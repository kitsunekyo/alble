import { RATINGS, RATING_SCORE, type Rating } from "@/shared/ratings";
import { dateToTimestamp, getCalendarWeek } from "@/shared/dates";
import type { SessionDTO } from "@/shared/schemas";

function percentiles(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const index = (p / 100) * (values.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower]!;
  return values[lower]! + (values[upper]! - values[lower]!) * (index - lower);
}

export type DateRange = "7d" | "30d" | "90d" | "all";

export interface StatsData {
  sessionCount: number;
  sessionCountDelta: number;
  totalDuration: number;
  totalDurationDelta: number;
  avgScore: number;
  avgScoreDelta: number;
  bestWeek: { label: string; hours: number; startDate: string } | null;
}

export interface ScatterPoint {
  x: number;
  date: string;
  y: number;
  step: number;
  rating: Rating;
}

export interface DailyPoint {
  x: number;
  date: string;
  avg: number;
  score: number;
  ma7_avg: number;
  ma7_score: number;
}

export interface WeeklyRow {
  weekKey: number;
  weekLabel: string;
  Ausgezeichnet: number;
  Gut: number;
  Mittel: number;
  Schlecht: number;
  Abbruch: number;
}

export interface StripPoint {
  x: number;
  y: number;
  rating: Rating;
  date: string;
}

export interface RatingStats {
  median: number;
  q1: number;
  q3: number;
}

export function parseDuration(range: DateRange): number {
  const DAY = 24 * 60 * 60 * 1000;
  switch (range) {
    case "7d": return 7 * DAY;
    case "30d": return 30 * DAY;
    case "90d": return 90 * DAY;
    default: return Infinity;
  }
}

export function computeMovingAvg(values: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const window = values.slice(Math.max(0, i - 6), i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    result.push(Math.round((sum / window.length) * 10) / 10);
  }
  return result;
}

export function aggregateMonthly(weekly: WeeklyRow[]): WeeklyRow[] {
  const monthMap = new Map<number, WeeklyRow>();
  for (const w of weekly) {
    const year = Math.floor(w.weekKey / 100);
    const week = w.weekKey % 100;
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = (jan4.getUTCDay() + 6) % 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek);
    const monday = new Date(week1Monday);
    monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
    const month = monday.getUTCMonth();
    const monthKey = year * 100 + month;

    const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const monthLabel = `${MONTH_NAMES[month] ?? month + 1} ${year}`;

    let row = monthMap.get(monthKey);
    if (!row) {
      row = { weekKey: monthKey, weekLabel: monthLabel, Ausgezeichnet: 0, Gut: 0, Mittel: 0, Schlecht: 0, Abbruch: 0 };
      monthMap.set(monthKey, row);
    }
    for (const r of RATINGS) {
      row[r] = (row[r] ?? 0) + (w[r] ?? 0);
    }
  }
  return [...monthMap.values()].sort((a, b) => a.weekKey - b.weekKey);
}

function deterministicJitter(date: string, stepNumber: number, duration: number): number {
  const seed =
    date.split("-").reduce((acc, v) => acc * 31 + parseInt(v, 10), 0) +
    stepNumber * 7 +
    duration * 13;
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.6;
}

export interface BuildDataResult {
  scatter: ScatterPoint[];
  daily: DailyPoint[];
  weekly: WeeklyRow[];
  strip: StripPoint[];
  scatterByRating: Record<Rating, ScatterPoint[]>;
  stripByRating: Record<Rating, StripPoint[]>;
  scoreDaily: DailyPoint[];
  ratingStats: Record<Rating, RatingStats>;
}

export function buildData(sessions: SessionDTO[], activeRatings: Set<Rating>): BuildDataResult {
  const scatter: ScatterPoint[] = [];
  const daily: DailyPoint[] = [];
  const weekly: WeeklyRow[] = [];
  const strip: StripPoint[] = [];
  const scatterByRating: Record<Rating, ScatterPoint[]> = {
    Ausgezeichnet: [], Gut: [], Mittel: [], Schlecht: [], Abbruch: [],
  };
  const stripByRating: Record<Rating, StripPoint[]> = {
    Ausgezeichnet: [], Gut: [], Mittel: [], Schlecht: [], Abbruch: [],
  };

  const weekMap = new Map<number, WeeklyRow>();

  for (const s of sessions) {
    if (!s.date) continue;

    const dateX = dateToTimestamp(s.date);
    let sum = 0;
    let count = 0;
    for (const step of s.steps) {
      const rating = step.rating;
      scatter.push({
        x: dateX,
        date: s.date,
        y: step.duration_seconds,
        step: step.step_number,
        rating,
      });
      scatterByRating[rating].push({
        x: dateX,
        date: s.date,
        y: step.duration_seconds,
        step: step.step_number,
        rating,
      });
      const ratingIndex = RATINGS.indexOf(rating) + 1;
      const stripPoint: StripPoint = {
        x: ratingIndex + deterministicJitter(s.date, step.step_number, step.duration_seconds),
        y: step.duration_seconds,
        rating,
        date: s.date,
      };
      strip.push(stripPoint);
      stripByRating[rating].push(stripPoint);
      if (rating !== "Abbruch") {
        sum += step.duration_seconds;
        count++;
      }
    }
    if (count > 0) daily.push({ x: dateX, date: s.date, avg: Math.round(sum / count), score: 0, ma7_avg: 0, ma7_score: 0 });

    const week = getCalendarWeek(s.date);
    let row = weekMap.get(week.key);
    if (!row) {
      row = {
        weekKey: week.key,
        weekLabel: week.label,
        Ausgezeichnet: 0,
        Gut: 0,
        Mittel: 0,
        Schlecht: 0,
        Abbruch: 0,
      };
      weekMap.set(week.key, row);
    }
    for (const step of s.steps) {
      row[step.rating] = (row[step.rating] ?? 0) + 1;
    }
  }

  for (const w of [...weekMap.keys()].sort((a, b) => a - b)) {
    weekly.push(weekMap.get(w)!);
  }

  const scoreDaily: DailyPoint[] = [];
  const scoreByDate = new Map<string, number[]>();
  for (const s of sessions) {
    if (!s.date) continue;
    const scores: number[] = [];
    for (const step of s.steps) {
      if (!activeRatings.has(step.rating)) continue;
      if (step.rating === "Abbruch") continue;
      const score = RATING_SCORE[step.rating];
      if (score != null) scores.push(score);
    }
    if (scores.length === 0) continue;
    const existing = scoreByDate.get(s.date) ?? [];
    scoreByDate.set(s.date, [...existing, ...scores]);
  }
  for (const [date, scores] of scoreByDate) {
    if (scores.length === 0) continue;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    scoreDaily.push({ x: dateToTimestamp(date), date, avg: 0, score: Math.round(avgScore * 10) / 10, ma7_avg: 0, ma7_score: 0 });
  }
  scoreDaily.sort((a, b) => a.x - b.x);

  daily.sort((a, b) => a.x - b.x);
  const maValues = computeMovingAvg(daily.map(d => d.avg));
  for (let i = 0; i < daily.length; i++) {
    daily[i]!.ma7_avg = maValues[i]!;
  }

  const maScoreValues = computeMovingAvg(scoreDaily.map(d => d.score));
  for (let i = 0; i < scoreDaily.length; i++) {
    scoreDaily[i]!.ma7_score = maScoreValues[i]!;
  }

  scatter.sort((a, b) => a.x - b.x);

  const ratingStats: Record<Rating, RatingStats> = {
    Ausgezeichnet: { median: 0, q1: 0, q3: 0 },
    Gut: { median: 0, q1: 0, q3: 0 },
    Mittel: { median: 0, q1: 0, q3: 0 },
    Schlecht: { median: 0, q1: 0, q3: 0 },
    Abbruch: { median: 0, q1: 0, q3: 0 },
  };

  for (const r of RATINGS) {
    const durations = stripByRating[r].map(p => p.y).sort((a, b) => a - b);
    if (durations.length > 0) {
      ratingStats[r] = {
        median: percentiles(durations, 50),
        q1: percentiles(durations, 25),
        q3: percentiles(durations, 75),
      };
    }
  }

  if (weekly.length > 52) {
    return { scatter, daily, weekly: aggregateMonthly(weekly), strip, scatterByRating, stripByRating, scoreDaily, ratingStats };
  }

  return { scatter, daily, weekly, strip, scatterByRating, stripByRating, scoreDaily, ratingStats };
}
