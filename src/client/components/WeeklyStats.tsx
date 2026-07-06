"use client";

import { useMemo } from "react";
import { useSessions } from "@/client/hooks/use-sessions";
import { useJournalEntries } from "@/client/hooks/use-journal";
import { RATING_SCORE, formatDuration, type Rating } from "@/shared/ratings";
import { MOOD_OPTIONS, MOOD_COLORS } from "@/client/components/MoodRatingPicker";
import type { SessionDTO } from "@/shared/schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

const RATING_EMOJI: Record<Rating, string> = MOOD_OPTIONS.reduce(
  (acc, m) => { acc[m.rating] = m.emoji; return acc; },
  {} as Record<Rating, string>,
);

const RATING_BG: Record<Rating, string> = MOOD_OPTIONS.reduce(
  (acc, m) => { acc[m.rating] = MOOD_COLORS[m.key] ?? "transparent"; return acc; },
  {} as Record<Rating, string>,
);

function closestRating(score: number): Rating | null {
  const entries = (Object.entries(RATING_SCORE) as [Rating, number | null][])
    .filter(([, v]) => v !== null) as [Rating, number][];
  if (entries.length === 0) return null;
  entries.sort((a, b) => Math.abs(score - a[1]) - Math.abs(score - b[1]));
  return entries[0]?.[0] ?? null;
}

function computeTrainingStats(sessions: SessionDTO[]) {
  const cutoff = Date.now() - 7 * DAY_MS;
  const filtered = sessions.filter((s) => {
    if (!s.date) return false;
    return new Date(s.date).getTime() >= cutoff;
  });

  let count = 0;
  let totalDuration = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const s of filtered) {
    let hasStep = false;
    for (const step of s.steps) {
      hasStep = true;
      if (step.rating !== "Abbruch") {
        totalDuration += step.duration_seconds;
        const sc = RATING_SCORE[step.rating];
        if (sc != null) {
          scoreSum += sc;
          scoreCount++;
        }
      }
    }
    if (hasStep) count++;
  }

  const avgScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
  const avgDuration = count > 0 ? totalDuration / count : 0;
  const rating = closestRating(avgScore);

  return {
    count,
    avgDuration,
    emoji: rating ? RATING_EMOJI[rating] : "—",
    bgColor: rating ? RATING_BG[rating] : "transparent",
    hasData: count > 0,
  };
}

function Pill({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm"
      style={bg ? { backgroundColor: bg } : undefined}
    >
      {children}
    </div>
  );
}

export function TrainingWeeklyStats() {
  const sessions = useSessions();
  const stats = useMemo(() => computeTrainingStats(sessions.data ?? []), [sessions.data]);

  if (!sessions.data) return null;

  const sessionLabel = stats.count === 1 ? "Session" : "Sessions";

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Letzte 7 Tage</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill bg="color-mix(in srgb, var(--color-sky-500) 14%, transparent)">
          <span>📊</span>
          <span className="font-medium tabular-nums">{stats.count} {sessionLabel}</span>
        </Pill>
        <Pill bg={stats.bgColor}>
          <span className="text-muted-foreground">⌀</span>
          <span className="text-base leading-none">{stats.emoji}</span>
        </Pill>
        <Pill bg="color-mix(in srgb, var(--color-violet-500) 14%, transparent)">
          <span>⏱</span>
          <span className="font-medium tabular-nums">
            {stats.hasData ? formatDuration(Math.round(stats.avgDuration)) : "—"}
          </span>
        </Pill>
      </div>
    </div>
  );
}

export function JournalWeeklyStats() {
  const entries = useJournalEntries(7);

  if (!entries.data) return null;

  const count = entries.data.length;
  const label = count === 1 ? "Eintrag" : "Einträge";

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Letzte 7 Tage</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill bg="color-mix(in srgb, var(--color-amber-500) 14%, transparent)">
          <span>📝</span>
          <span className="font-medium tabular-nums">{count} {label}</span>
        </Pill>
      </div>
    </div>
  );
}
