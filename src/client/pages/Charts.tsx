"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSessions } from "@/client/hooks/use-sessions";
import { PageTitle } from "@/client/components/PageTitle";
import { RATINGS, RATING_COLORS, RATING_SCORE, type Rating } from "@/shared/ratings";
import { dateToIsoString, getCalendarWeek, parseIsoDate } from "@/shared/dates";
import { parseDuration, buildData, type DateRange, type SelectionState } from "./charts/chart-data";
import { StatsSummary } from "./charts/StatsSummary";
import { ScatterOverTime } from "./charts/ScatterOverTime";
import { WeeklyDistribution } from "./charts/WeeklyDistribution";
import { CorrelationChart } from "./charts/CorrelationChart";
import { StripDistribution } from "./charts/StripDistribution";

export function Charts() {
  const sessions = useSessions();

  const [activeRatings, setActiveRatings] = useState<Set<Rating>>(new Set(RATINGS));
  const hasAnyActive = activeRatings.size > 0;

  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [selection, setSelection] = useState<SelectionState>({
    type: null, weekKey: null, dayTimestamp: null, rangeStart: null, rangeEnd: null,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection({ type: null, weekKey: null, dayTimestamp: null, rangeStart: null, rangeEnd: null });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

    const safePct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      sessionCount: current.count,
      sessionCountDelta: safePct(current.count, prior.count),
      totalDuration: current.duration,
      totalDurationDelta: safePct(current.duration, prior.duration),
      avgScore: current.avgScore,
      avgScoreDelta: Math.round((current.avgScore - prior.avgScore) * 10) / 10,
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
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-4">
      <PageTitle>Charts</PageTitle>

      <div className="flex gap-2">
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

      <div className="flex flex-wrap gap-2">
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

      <StatsSummary stats={stats} />

      {!hasAnyActive ? (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          Keine Bewertungen ausgewählt
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScatterOverTime scatterByRating={data.scatterByRating} activeRatings={activeRatings} selection={selection} onSelect={setSelection} />
          <WeeklyDistribution weekly={data.weekly} activeRatings={activeRatings} selection={selection} onSelect={setSelection} />
          <div className="lg:col-span-2">
            <CorrelationChart daily={data.daily} selection={selection} onSelect={setSelection} />
          </div>
          <div className="lg:col-span-2">
            <StripDistribution stripByRating={data.stripByRating} ratingStats={data.ratingStats} />
          </div>
        </div>
      )}
    </div>
  );
}
