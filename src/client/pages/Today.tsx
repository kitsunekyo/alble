import { useState } from "react";
import { Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { useTodaySession, useAddStep, useDeleteStep, useUpdateStep } from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Textarea } from "@/client/components/ui/textarea";
import { RatingPicker } from "@/client/components/RatingPicker";
import {
  DurationInput,
  durationPartsToSeconds,
  secondsToDurationParts,
  type DurationParts,
} from "@/client/components/DurationInput";
import { formatDuration, type Rating } from "@/shared/ratings";
import { formatDate, formatWeekday, getCalendarWeek } from "@/shared/dates";
import { toast } from "sonner";
import type { StepDTO } from "@/shared/schemas";

export function Today() {
  const session = useTodaySession();
  const addStep = useAddStep();
  const deleteStep = useDeleteStep();

  const [duration, setDuration] = useState<DurationParts>({ hours: "", minutes: "", seconds: "" });
  const [rating, setRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");

  if (session.isLoading || !session.data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
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
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-40 md:pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Heute</h1>
        <p className="text-sm text-muted-foreground">
          {dateLabel ? `${dateLabel} · ${weekLabel}` : `Trainingstag ${s.global_day}`} ·{" "}
          {s.steps.length} Einheit{s.steps.length === 1 ? "" : "en"}
        </p>
      </div>

      <div className="space-y-2 mb-6">
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

      <Card className="p-4 fixed md:static left-0 right-0 bottom-16 md:bottom-auto z-30 rounded-none md:rounded-xl border-t md:border bg-background">
        <div className="max-w-2xl mx-auto space-y-3">
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
