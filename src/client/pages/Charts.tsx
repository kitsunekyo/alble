"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { useSessions } from "@/client/hooks/use-sessions";
import { Card } from "@/client/components/ui/card";
import {
  RATINGS,
  RATING_COLORS,
  RATING_SCORE,
  formatDuration,
  type Rating,
} from "@/shared/ratings";
import {
  dateToTimestamp,
  formatDate,
  formatDateShort,
  formatTimestampDate,
  formatTimestampDateShort,
  getCalendarWeek,
  parseIsoDate,
  dateToIsoString,
} from "@/shared/dates";
import type { SessionDTO } from "@/shared/schemas";

type DateRange = "7d" | "30d" | "90d" | "all";

interface StatsData {
  sessionCount: number;
  sessionCountDelta: number;
  totalDuration: number;
  totalDurationDelta: number;
  avgScore: number;
  avgScoreDelta: number;
  bestWeek: { label: string; hours: number; startDate: string } | null;
}

function closestRatingLabel(score: number): string {
  const entries = Object.entries(RATING_SCORE).filter(([_, v]) => v !== null) as [Rating, number][];
  entries.sort((a, b) => Math.abs(score - a[1]) - Math.abs(score - b[1]));
  return entries[0]?.[0] ?? "";
}

function formatDelta(value: number, suffix: string): { text: string; color: string; arrow: string } {
  if (value > 0) return { text: `↑ +${value}${suffix}`, color: "var(--color-green-600)", arrow: "↑" };
  if (value < 0) return { text: `↓ ${value}${suffix}`, color: "var(--color-red-600)", arrow: "↓" };
  return { text: `→ 0${suffix}`, color: "var(--color-muted-foreground)", arrow: "→" };
}

function parseDuration(range: DateRange): number {
  const DAY = 24 * 60 * 60 * 1000;
  switch (range) {
    case "7d": return 7 * DAY;
    case "30d": return 30 * DAY;
    case "90d": return 90 * DAY;
    default: return Infinity;
  }
}

function computeMovingAvg(values: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const window = values.slice(Math.max(0, i - 6), i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    result.push(Math.round((sum / window.length) * 10) / 10);
  }
  return result;
}

function aggregateMonthly(weekly: WeeklyRow[]): WeeklyRow[] {
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

export function Charts() {
  const sessions = useSessions();

  const [activeRatings, setActiveRatings] = useState<Set<Rating>>(new Set(RATINGS));
  const hasAnyActive = activeRatings.size > 0;

  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const filteredSessions = useMemo(() => {
    if (dateRange === "all") return sessions.data ?? [];
    const cutoff = Date.now() - parseDuration(dateRange);
    return (sessions.data ?? []).filter(s => {
      if (!s.date) return false;
      return new Date(s.date).getTime() >= cutoff;
    });
  }, [sessions.data, dateRange]);

  const data = useMemo(() => buildData(filteredSessions, activeRatings), [filteredSessions, activeRatings]);

  const stats = useMemo(() => {
    const filtered = sessions.data ?? [];
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const rangeDays = dateRange === "all" ? 365 : (parseDuration(dateRange) / DAY);
    const rangeStart = now - rangeDays * DAY;
    const prevStart = rangeStart - rangeDays * DAY;

    const inRange = filtered.filter((s) => {
      if (!s.date) return false;
      const ts = new Date(s.date).getTime();
      return ts >= rangeStart && ts <= now;
    });

    const inPrev = filtered.filter((s) => {
      if (!s.date) return false;
      const ts = new Date(s.date).getTime();
      return ts >= prevStart && ts < rangeStart;
    });

    const compute = (sessions: typeof filtered) => {
      let count = 0;
      let duration = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      for (const s of sessions) {
        let hasActive = false;
        for (const step of s.steps) {
          if (!activeRatings.has(step.rating)) continue;
          hasActive = true;
          if (step.rating !== "Abbruch") {
            duration += step.duration_seconds;
            const sc = Number(RATING_SCORE[step.rating]);
            if (!Number.isNaN(sc)) {
              scoreSum += sc;
              scoreCount++;
            }
          }
        }
        if (hasActive) count++;
      }

      const avgScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
      return { count, duration, avgScore };
    };

    const bestWeek = (sessions: typeof filtered) => {
      const weekMap = new Map<
        number,
        { totalDuration: number; label: string; dates: string[] }
      >();

      for (const s of sessions) {
        if (!s.date) continue;
        const week = getCalendarWeek(s.date);
        let row = weekMap.get(week.key);
        if (!row) {
          row = { totalDuration: 0, label: week.label, dates: [] };
          weekMap.set(week.key, row);
        }
        row.dates.push(s.date);
        for (const step of s.steps) {
          if (!activeRatings.has(step.rating)) continue;
          if (step.rating !== "Abbruch") {
            row.totalDuration += step.duration_seconds;
          }
        }
      }

      let best: { key: number; totalDuration: number; label: string; dates: string[] } | null = null;
      for (const [key, row] of weekMap) {
        if (!best || row.totalDuration > best.totalDuration) {
          best = { key, ...row };
        }
      }

      if (!best || best.totalDuration === 0) return null;

      const earliestDate = best.dates.sort()[0]!;
      const d = parseIsoDate(earliestDate);
      const day = d.getUTCDay();
      const offset = day === 0 ? 6 : day - 1;
      const monday = new Date(d.getTime() - offset * DAY);
      const startDate = dateToIsoString(monday);

      return {
        label: best.label,
        hours: best.totalDuration / 3600,
        startDate,
      };
    };

    const current = compute(inRange);
    const prior = compute(inPrev);

    return {
      sessionCount: current.count,
      sessionCountDelta: current.count - prior.count,
      totalDuration: current.duration,
      totalDurationDelta: current.duration - prior.duration,
      avgScore: current.avgScore,
      avgScoreDelta: current.avgScore - prior.avgScore,
      bestWeek: bestWeek(inRange),
    };
  }, [sessions.data, activeRatings, dateRange]);

  if (sessions.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!sessions.data || sessions.data.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 text-center text-muted-foreground">
        Noch keine Daten zum Anzeigen.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-6">
      <h1 className="text-2xl font-semibold">Charts</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {RATINGS.map((rating) => {
          const isActive = activeRatings.has(rating);
          return (
            <button
              key={rating}
              onClick={() => {
                setActiveRatings((prev) => {
                  const next = new Set(prev);
                  if (next.has(rating)) next.delete(rating);
                  else next.add(rating);
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                isActive
                  ? "text-white border-transparent"
                  : "text-muted-foreground border-border bg-transparent"
              }`}
              style={isActive ? { backgroundColor: RATING_COLORS[rating] } : undefined}
            >
              {rating}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        {(["7d", "30d", "90d", "all"] as const).map((preset) => {
          const labels: Record<DateRange, string> = { "7d": "7 Tage", "30d": "30 Tage", "90d": "90 Tage", "all": "Alle" };
          const isActive = dateRange === preset;
          return (
            <button
              key={preset}
              onClick={() => setDateRange(preset)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border bg-transparent hover:bg-muted"
              }`}
            >
              {labels[preset]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Sitzungen</div>
          <div className="text-2xl font-semibold tabular-nums">{stats.sessionCount}</div>
          <div className="text-xs mt-1" style={{ color: formatDelta(stats.sessionCountDelta, "").color }}>
            {formatDelta(stats.sessionCountDelta, "").text} (vs. Vorperiode)
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Gesamtzeit</div>
          <div className="text-2xl font-semibold tabular-nums">{formatDuration(stats.totalDuration)}</div>
          <div className="text-xs mt-1" style={{ color: formatDelta(stats.totalDurationDelta / 3600, "h").color }}>
            {formatDelta(Math.round(stats.totalDurationDelta / 360) / 10, "h").text} (vs. Vorperiode)
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">⌀ Bewertung</div>
          <div className="text-2xl font-semibold tabular-nums">
            {closestRatingLabel(stats.avgScore)} ({stats.avgScore.toFixed(1)})
          </div>
          <div className="text-xs mt-1" style={{ color: formatDelta(stats.avgScoreDelta, "").color }}>
            {formatDelta(Math.round(stats.avgScoreDelta * 10) / 10, "").text} (vs. Vorperiode)
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Beste Woche</div>
          <div className="text-lg font-semibold">
            {stats.bestWeek ? stats.bestWeek.label : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.bestWeek
              ? `(${formatDateShort(stats.bestWeek.startDate)}) · ${formatDuration(stats.bestWeek.hours * 3600)}`
              : "Keine Daten"
            }
          </div>
        </Card>
      </div>

      {!hasAnyActive ? (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          Keine Bewertungen ausgewählt
        </div>
      ) : (
        <>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Trennungszeit über die Zeit</h2>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Datum"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => formatTimestampDateShort(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                label={{
                  value: "Datum",
                  position: "insideBottom",
                  offset: -4,
                  fill: "var(--color-muted-foreground)",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Dauer"
                tickFormatter={(v) => formatDuration(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const p = payload[0]!.payload as ScatterPoint;
                  return (
                    <div className="rounded-md border bg-background p-2 text-xs shadow-md">
                      <div>
                        <strong>{formatDate(p.date)}</strong> · Schritt {p.step}
                      </div>
                      <div className="tabular-nums">
                        {formatDuration(p.y)}
                      </div>
                      <div style={{ color: RATING_COLORS[p.rating] }}>{p.rating}</div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span style={{ color: "var(--color-foreground)" }}>{value}</span>
                )}
              />
              {RATINGS.filter((r) => activeRatings.has(r)).map((rating) => (
                <Scatter
                  key={rating}
                  name={rating}
                  data={data.scatterByRating[rating]}
                  fill={RATING_COLORS[rating]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Bewertungsverteilung pro Woche</h2>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.weekly}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                label={{
                  value: "Kalenderwoche",
                  position: "insideBottom",
                  offset: -4,
                  fill: "var(--color-muted-foreground)",
                  fontSize: 12,
                }}
              />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {RATINGS.filter((r) => activeRatings.has(r)).map((rating) => (
                <Bar
                  key={rating}
                  dataKey={rating}
                  stackId="ratings"
                  fill={RATING_COLORS[rating]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Durchschnittliche Trennungszeit pro Tag</h2>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.daily} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => formatTimestampDateShort(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                label={{
                  value: "Datum",
                  position: "insideBottom",
                  offset: -4,
                  fill: "var(--color-muted-foreground)",
                  fontSize: 12,
                }}
              />
              <YAxis
                tickFormatter={(v) => formatDuration(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(label) => formatTimestampDate(Number(label))}
                formatter={(v) => [formatDuration(Number(v)), "⌀ Dauer"]}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ma7_avg"
                name="7-Tage-⌀"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Durchschnittliche Bewertung über die Zeit</h2>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.scoreDaily} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => formatTimestampDateShort(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                label={{
                  value: "Datum",
                  position: "insideBottom",
                  offset: -4,
                  fill: "var(--color-muted-foreground)",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                domain={[0.5, 4.5]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={(v) => {
                  const labels: Record<number, string> = { 1: "Schlecht", 2: "Mittel", 3: "Gut", 4: "Ausgezeichnet" };
                  return labels[Number(v)] ?? "";
                }}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <ReferenceLine y={2.5} stroke="var(--color-border)" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(label) => formatTimestampDate(Number(label))}
                formatter={(value) => {
                  const score = Number(value ?? 0);
                  const closest = closestRatingLabel(score);
                  return [`${score.toFixed(1)} (${closest})`, "⌀ Bewertung"];
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ma7_score"
                name="7-Tage-⌀"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Trennungszeit-Verteilung je Bewertung</h2>
        <div className="h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Bewertung"
                domain={[0.5, RATINGS.length + 0.5]}
                ticks={RATINGS.map((_, i) => i + 1)}
                tickFormatter={(v) => RATINGS[v - 1] ?? ""}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Dauer"
                tickFormatter={(v) => formatDuration(Number(v))}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const p = payload[0]!.payload as StripPoint;
                  return (
                    <div className="rounded-md border bg-background p-2 text-xs shadow-md">
                      <div style={{ color: RATING_COLORS[p.rating] }}>{p.rating}</div>
                      <div className="tabular-nums">
                        {formatDuration(p.y)}
                      </div>
                      <div className="text-muted-foreground">{formatDate(p.date)}</div>
                    </div>
                  );
                }}
              />
              {RATINGS.map((rating) => (
                <Scatter
                  key={rating}
                  data={data.stripByRating[rating]}
                  fill={RATING_COLORS[rating]}
                  fillOpacity={0.6}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
        </>
      )}
    </div>
  );
}

interface ScatterPoint {
  x: number;
  date: string;
  y: number;
  step: number;
  rating: Rating;
}

interface DailyPoint {
  x: number;
  date: string;
  avg: number;
  score: number;
  ma7_avg: number;
  ma7_score: number;
}

interface WeeklyRow {
  weekKey: number;
  weekLabel: string;
  Ausgezeichnet: number;
  Gut: number;
  Mittel: number;
  Schlecht: number;
  Abbruch: number;
}

interface StripPoint {
  x: number;
  y: number;
  rating: Rating;
  date: string;
}

function buildData(sessions: SessionDTO[], activeRatings: Set<Rating>) {
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

  if (weekly.length > 52) {
    return { scatter, daily, weekly: aggregateMonthly(weekly), strip, scatterByRating, stripByRating, scoreDaily };
  }

  return { scatter, daily, weekly, strip, scatterByRating, stripByRating, scoreDaily };
}

function deterministicJitter(date: string, stepNumber: number, duration: number): number {
  const seed =
    date.split("-").reduce((acc, v) => acc * 31 + parseInt(v, 10), 0) +
    stepNumber * 7 +
    duration * 13;
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.6;
}
