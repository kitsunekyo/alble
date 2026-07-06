"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import { QuickDurationInput, parseDuration, MAX_DURATION_SECONDS } from "@/client/components/QuickDurationInput";
import { MoodRatingPicker, MOOD_OPTIONS, BEIGE } from "@/client/components/MoodRatingPicker";
import { useTodaySession, useAddStep, useAddTodayStep } from "@/client/hooks/use-sessions";
import { useAddJournalEntry } from "@/client/hooks/use-journal";
import { JournalQuickEntry } from "@/client/components/JournalQuickEntry";
import { type Rating } from "@/shared/ratings";
import { cn } from "@/client/lib/utils";

export function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
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
      <h1 className="text-3xl font-semibold tracking-tight">
        Wie gehts Pina heute?
      </h1>

      <section className="space-y-2">
        <Card className="p-4">
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
                    "flex-1 aspect-square rounded-xl border bg-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
                    "hover:bg-muted",
                    active && "border-transparent",
                  )}
                  style={active ? { backgroundColor: BEIGE, borderColor: BEIGE } : undefined}
                >
                  <span className="text-3xl leading-none">{m.emoji}</span>
                  <span className="text-sm font-medium hidden md:block">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
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
        <h2 className="text-2xl font-semibold tracking-tight">
          Alleinbleiben Training
        </h2>
        <Card className="p-4 space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Trainingsdauer</span>
            <QuickDurationInput value={duration} onChange={setDuration} onEnter={submit} />
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
            <Button onClick={submit} disabled={!canSubmit || isPending} className="cursor-pointer">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Eintragen"}
            </Button>
          </div>
        </Card>
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
