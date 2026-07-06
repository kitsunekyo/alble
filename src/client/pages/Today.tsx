"use client";

import { useState } from "react";
import { Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { useTodaySession, useAddStep, useAddTodayStep, useDeleteStep, useUpdateStep } from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { PageTitle } from "@/client/components/PageTitle";
import { Textarea } from "@/client/components/ui/textarea";
import { RatingPicker } from "@/client/components/RatingPicker";
import {
  DurationInput,
  durationPartsToSeconds,
  secondsToDurationParts,
  type DurationParts,
} from "@/client/components/DurationInput";
import { formatDuration, type Rating } from "@/shared/ratings";
import { formatDate, formatWeekday, getCalendarWeek, todayIsoString } from "@/shared/dates";
import { toast } from "sonner";
import type { StepDTO } from "@/shared/schemas";

export function Today() {
  const session = useTodaySession();
  const addStep = useAddStep();
  const addTodayStep = useAddTodayStep();
  const deleteStep = useDeleteStep();

  const [duration, setDuration] = useState<DurationParts>({ hours: "", minutes: "", seconds: "" });
  const [rating, setRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");

  if (session.isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 text-center text-muted-foreground">
        Fehler beim Laden. Stelle sicher, dass die Umgebungsvariablen <code>TURSO_DATABASE_URL</code> und <code>TURSO_AUTH_TOKEN</code> gesetzt sind.
      </div>
    );
  }

  if (session.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!session.data) {
    // No session exists for today yet — still show the input form.
    const todayIso = todayIsoString();
    const dateLabel = `${formatWeekday(todayIso)}, ${formatDate(todayIso)}`;
    const weekLabel = getCalendarWeek(todayIso).label;

    function submitToday() {
      const dur = durationPartsToSeconds(duration);
      if (dur === null || dur > 86_400) {
        toast.error("Dauer ungültig");
        return;
      }
      if (!rating) {
        toast.error("Bewertung wählen");
        return;
      }
      const trimmedNotes = notes.trim();
      addTodayStep.mutate(
        { duration_seconds: dur, rating, notes: trimmedNotes === "" ? null : trimmedNotes },
        {
          onSuccess: () => {
            setDuration({ hours: "", minutes: "", seconds: "" });
            setRating(null);
            setNotes("");
          },
          onError: (e) => toast.error(e.message),
        },
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-8 space-y-4">
        <PageTitle
          content={
            <p>{dateLabel} · {weekLabel} · 0 Einheiten</p>
          }
        >
          Heute
        </PageTitle>

        <div className="space-y-2">
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Noch keine Einheit erfasst. Füge unten die erste hinzu.
          </Card>
        </div>

        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <DurationInput value={duration} onChange={setDuration} onEnter={submitToday} />
              </div>
              <Button onClick={submitToday} disabled={addTodayStep.isPending} className="min-w-20">
                {addTodayStep.isPending ? <Loader2 className="size-4 animate-spin" /> : "Hinzufügen"}
              </Button>
            </div>
            <RatingPicker value={rating} onChange={setRating} />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionale Notiz"
              className="min-h-20"
            />
          </div>
        </Card>
      </div>
    );
  }

  const s = session.data;
  const dateLabel = s.date ? `${formatWeekday(s.date)}, ${formatDate(s.date)}` : null;
  const weekLabel = s.date ? getCalendarWeek(s.date).label : null;

  function submit() {
    const dur = durationPartsToSeconds(duration);
    if (dur === null || dur > 86_400) {
      toast.error("Dauer ungültig");
      return;
    }
    if (!rating) {
      toast.error("Bewertung wählen");
      return;
    }
    const trimmedNotes = notes.trim();
    addStep.mutate(
      {
        sessionId: s.id,
        input: { duration_seconds: dur, rating, notes: trimmedNotes === "" ? null : trimmedNotes },
      },
      {
        onSuccess: () => {
          setDuration({ hours: "", minutes: "", seconds: "" });
          setRating(null);
          setNotes("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-8 space-y-4">
      <PageTitle
        content={
          <p>
            {dateLabel ? `${dateLabel} · ${weekLabel}` : `Trainingstag ${s.global_day}`} ·{" "}
            {s.steps.length} Einheit{s.steps.length === 1 ? "" : "en"}
          </p>
        }
      >
        Heute
      </PageTitle>

      <div className="space-y-2">
        {s.steps.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Noch keine Einheit erfasst. Füge unten die erste hinzu.
          </Card>
        ) : (
          s.steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              onDelete={() =>
                deleteStep.mutate(step.id, {
                  onError: (e) => toast.error(e.message),
                })
              }
            />
          ))
        )}
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <DurationInput value={duration} onChange={setDuration} onEnter={submit} />
            </div>
            <Button onClick={submit} disabled={addStep.isPending} className="min-w-20">
              {addStep.isPending ? <Loader2 className="size-4 animate-spin" /> : "Hinzufügen"}
            </Button>
          </div>
          <RatingPicker value={rating} onChange={setRating} />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notiz"
            className="min-h-20"
          />
        </div>
      </Card>
    </div>
  );
}

function StepRow({ step, onDelete }: { step: StepDTO; onDelete: () => void }) {
  const updateStep = useUpdateStep();
  const [editing, setEditing] = useState(false);
  const [draftDur, setDraftDur] = useState<DurationParts>(
    secondsToDurationParts(step.duration_seconds),
  );
  const [draftRating, setDraftRating] = useState<Rating>(step.rating);
  const [draftNotes, setDraftNotes] = useState(step.notes ?? "");

  if (!editing) {
    return (
      <Card className="p-3 flex items-center gap-3">
        <div className="text-sm text-muted-foreground w-8 text-center">{step.step_number}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium tabular-nums">
            {formatDuration(step.duration_seconds)}
          </div>
          <div className="text-sm text-muted-foreground">{step.rating}</div>
          {step.notes && <div className="text-sm whitespace-pre-wrap mt-1">{step.notes}</div>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Bearbeiten">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Löschen">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </Card>
    );
  }

  function save() {
    const dur = durationPartsToSeconds(draftDur);
    if (dur === null || dur > 86_400) {
      toast.error("Dauer ungültig");
      return;
    }
    updateStep.mutate(
      {
        id: step.id,
        input: {
          duration_seconds: dur,
          rating: draftRating,
          notes: draftNotes.trim() === "" ? null : draftNotes.trim(),
        },
      },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-end gap-2">
        <div className="text-sm text-muted-foreground w-8 text-center">{step.step_number}</div>
        <DurationInput
          value={draftDur}
          onChange={setDraftDur}
          onEnter={save}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" onClick={save} aria-label="Speichern">
          <Check className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setEditing(false)} aria-label="Abbrechen">
          <X className="size-4" />
        </Button>
      </div>
      <RatingPicker value={draftRating} onChange={setDraftRating} />
      <Textarea
        value={draftNotes}
        onChange={(e) => setDraftNotes(e.target.value)}
        placeholder="Optionale Notiz"
        className="min-h-20"
      />
    </Card>
  );
}
