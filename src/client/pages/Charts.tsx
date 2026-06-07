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
} from "recharts";
import { useSessions } from "@/client/hooks/use-sessions";
import { Card } from "@/client/components/ui/card";
import {
  RATINGS,
  RATING_COLORS,
  formatDuration,
  type Rating,
} from "@/shared/ratings";
import {
  dateToTimestamp,
  formatDate,
  formatTimestampDate,
  formatTimestampDateShort,
  getCalendarWeek,
} from "@/shared/dates";
import type { SessionDTO } from "@/shared/schemas";

export function Charts() {
  const sessions = useSessions();

  const [activeRatings, setActiveRatings] = useState<Set<Rating>>(new Set(RATINGS));
  const hasAnyActive = activeRatings.size > 0;

  const data = useMemo(() => buildData(sessions.data ?? []), [sessions.data]);

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

function buildData(sessions: SessionDTO[]) {
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
    if (count > 0) daily.push({ x: dateX, date: s.date, avg: Math.round(sum / count) });

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

  daily.sort((a, b) => a.x - b.x);
  scatter.sort((a, b) => a.x - b.x);

  return { scatter, daily, weekly, strip, scatterByRating, stripByRating };
}

/**
 * Deterministic jitter for scatter plot points.
 * Uses step properties (date, step_number, duration) to produce a stable
 * pseudo-random offset between -0.3 and +0.3. Points stay in place across
 * re-renders and session loads.
 */
function deterministicJitter(date: string, stepNumber: number, duration: number): number {
  const seed =
    date.split("-").reduce((acc, v) => acc * 31 + parseInt(v, 10), 0) +
    stepNumber * 7 +
    duration * 13;
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.6;
}
