"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import { QuickDurationInput, parseDuration, MAX_DURATION_SECONDS } from "@/client/components/QuickDurationInput";
import { MoodRatingPicker, MOOD_OPTIONS, MOOD_COLORS } from "@/client/components/MoodRatingPicker";
import { useTodaySession, useAddStep, useAddTodayStep } from "@/client/hooks/use-sessions";
import { useAddJournalEntry } from "@/client/hooks/use-journal";
import { JournalQuickEntry } from "@/client/components/JournalQuickEntry";
import { TrainingWeeklyStats, JournalWeeklyStats } from "@/client/components/WeeklyStats";
import { type Rating } from "@/shared/ratings";
import { cn } from "@/client/lib/utils";

function timeToSeconds(t: string): number {
  const [h = "0", m = "0", s = "0"] = t.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

function secondsToTime(total: number): string {
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function secondsToDurationString(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

function getCurrentTime(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState(getCurrentTime);
  const [endTime, setEndTime] = useState("");
  const [rating, setRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");

  const session = useTodaySession();
  const addStep = useAddStep();
  const addTodayStep = useAddTodayStep();
  const addJournalEntry = useAddJournalEntry();

  const isPending = addStep.isPending || addTodayStep.isPending;
  const parsedDuration = parseDuration(duration);
  const canSubmit =
    duration.trim() !== "" &&
    parsedDuration !== null &&
    parsedDuration > 0 &&
    parsedDuration <= MAX_DURATION_SECONDS &&
    rating !== null;

  function handleDurationChange(value: string) {
    setDuration(value);
    const parsed = parseDuration(value);
    if (parsed !== null && parsed > 0) {
      const startSeconds = timeToSeconds(startTime || "00:00:00");
      setEndTime(secondsToTime(startSeconds + parsed));
    }
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    const parsed = parseDuration(duration);
    if (parsed !== null && parsed > 0) {
      const startSeconds = timeToSeconds(value || "00:00:00");
      setEndTime(secondsToTime(startSeconds + parsed));
    }
  }

  function handleEndTimeChange(value: string) {
    setEndTime(value);
    const endSeconds = timeToSeconds(value || "00:00:00");
    const startSeconds = timeToSeconds(startTime || "00:00:00");
    let diff = endSeconds - startSeconds;
    if (diff < 0) diff += 24 * 3600;
    setDuration(secondsToDurationString(diff));
  }

  function reset() {
    setDuration("");
    setRating(null);
    setNotes("");
  }

  function submit() {
    const dur = parseDuration(duration);
    if (dur === null || dur > 86_400) {
      toast.error("Dauer ungültig");
      return;
    }
    if (!rating) {
      toast.error("Bewertung wählen");
      return;
    }
    const trimmedNotes = notes.trim();
    const input = {
      duration_seconds: dur,
      rating,
      notes: trimmedNotes === "" ? null : trimmedNotes,
    };
    const opts = {
      onSuccess: reset,
      onError: (e: Error) => toast.error(e.message),
    };
    if (session.data) {
      addStep.mutate({ sessionId: session.data.id, input }, opts);
    } else {
      addTodayStep.mutate(input, opts);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-8 space-y-6">
      <section className="space-y-2">
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Wie gehts Pina heute?
          </h2>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((m) => {
              const active = selected === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(active ? null : m.key)}
                  className={cn(
                    "flex-1 aspect-square rounded-xl border-2 border-transparent flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
                    active && "border-primary",
                  )}
                  style={{ backgroundColor: MOOD_COLORS[m.key] }}
                >
                  <span className="text-3xl leading-none">{m.emoji}</span>
                  <span className="text-sm font-medium hidden md:block">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div>
            <JournalQuickEntry
              submitting={addJournalEntry.isPending}
              onSubmit={({ timestamp, text, tags }) => {
                addJournalEntry.mutate(
                  { timestamp, text, moods: tags },
                  {
                    onSuccess: () => toast.success("Eintrag hinzugefügt"),
                    onError: (e) => toast.error(e.message),
                  },
                );
              }}
            />
          </div>
        </Card>
        <JournalWeeklyStats />
        <div className="text-center">
          <Link
            href="/journal"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Tagebuch Einträge
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Alleinbleiben Training
          </h2>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Trainingsdauer</span>
            <QuickDurationInput value={duration} onChange={handleDurationChange} onEnter={submit} />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Start</span>
            <input
              type="time"
              step="1"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Ende</span>
            <input
              type="time"
              step="1"
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Bewertung</span>
            <MoodRatingPicker value={rating} onChange={setRating} />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notiz"
            className="min-h-20"
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || isPending} className="w-full md:w-auto cursor-pointer">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Eintragen"}
            </Button>
          </div>
        </Card>
        <TrainingWeeklyStats />
        <div className="text-center">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Trainingsverlauf
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
