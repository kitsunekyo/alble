import { useMemo, useState } from "react";
import { Loader2, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import {
  useSessions,
  useDeleteSession,
  useUpdateSession,
  useDeleteStep,
  useUpdateStep,
} from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Badge } from "@/client/components/ui/badge";
import {
  DurationInput,
  durationPartsToSeconds,
  secondsToDurationParts,
  type DurationParts,
} from "@/client/components/DurationInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/client/components/ui/alert-dialog";
import { RatingPicker } from "@/client/components/RatingPicker";
import {
  formatDuration,
  type Rating,
} from "@/shared/ratings";
import {
  compareOptionalDatesDesc,
  formatDate,
  formatWeekday,
  getCalendarWeek,
} from "@/shared/dates";
import type { SessionDTO, StepDTO } from "@/shared/schemas";
import { toast } from "sonner";
import { cn } from "@/client/lib/utils";

export function History() {
  const sessions = useSessions();

  const grouped = useMemo(() => {
    if (!sessions.data) return [];
    const map = new Map<number, { label: string; items: SessionDTO[] }>();
    const undated: SessionDTO[] = [];

    for (const s of sessions.data) {
      if (!s.date) {
        undated.push(s);
        continue;
      }

      const week = getCalendarWeek(s.date);
      const group = map.get(week.key) ?? { label: week.label, items: [] };
      group.items.push(s);
      map.set(week.key, group);
    }

    const datedGroups = [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: group.items.sort(
          (a, b) => compareOptionalDatesDesc(a.date, b.date) || b.global_day - a.global_day,
        ),
      }));

    if (undated.length === 0) return datedGroups;
    return [
      ...datedGroups,
      {
        key: 0,
        label: "Ohne Datum",
        items: undated.sort((a, b) => b.global_day - a.global_day),
      },
    ];
  }, [sessions.data]);

  if (sessions.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!sessions.data || sessions.data.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 text-center text-muted-foreground">
        Noch keine Daten. Lege auf <strong>Heute</strong> die erste Einheit an oder importiere die
        CSV in <strong>Einstellungen</strong>.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-6">
      <h1 className="text-2xl font-semibold">Verlauf</h1>
      {grouped.map(({ key, label, items }) => (
        <section key={key} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
          {items.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: SessionDTO }) {
  const [open, setOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const avg = session.steps.length
    ? Math.round(
        session.steps.reduce((sum, s) => sum + s.duration_seconds, 0) / session.steps.length,
      )
    : 0;
  const max = session.steps.length
    ? Math.max(...session.steps.map((s) => s.duration_seconds))
    : 0;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-2">
            <span className="font-medium">
              {session.date ? formatDate(session.date) : `Trainingstag ${session.global_day}`}
            </span>
            {session.date && <Badge variant="secondary">{formatWeekday(session.date)}</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {session.steps.length} Einheiten · ⌀ {formatDuration(avg)} · max{" "}
            {formatDuration(max)}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t p-3 space-y-3">
          {editingMeta ? (
            <SessionMetaEditor
              session={session}
              onSave={(input) =>
                updateSession.mutate(
                  { id: session.id, input },
                  {
                    onSuccess: () => setEditingMeta(false),
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
              onCancel={() => setEditingMeta(false)}
            />
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">
                  {session.date
                    ? `Datum: ${formatDate(session.date)} · ${formatWeekday(session.date)}`
                    : "Kein Datum (Import)"}
                </div>
                {session.notes && (
                  <p className="text-sm whitespace-pre-wrap mt-1">{session.notes}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingMeta(true)}>
                <Pencil className="size-3.5 mr-1" /> Bearbeiten
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="size-3.5 mr-1 text-destructive" /> Löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Session löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {session.date ? formatDate(session.date) : `Trainingstag ${session.global_day}`} mit{" "}
                      {session.steps.length} Einheiten wird endgültig entfernt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deleteSession.mutate(session.id, {
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <div className="space-y-1.5">
            {session.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StepRow({ step }: { step: StepDTO }) {
  const [editing, setEditing] = useState(false);
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const [dur, setDur] = useState<DurationParts>(secondsToDurationParts(step.duration_seconds));
  const [rating, setRating] = useState<Rating>(step.rating);
  const [notes, setNotes] = useState(step.notes ?? "");

  if (!editing) {
    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-1.5 rounded-md text-sm",
            "hover:bg-muted/40",
          )}
        >
          <span className="text-muted-foreground w-6 text-center">{step.step_number}</span>
          <span className="flex-1 tabular-nums">
            {formatDuration(step.duration_seconds)}
          </span>
          <span className="text-muted-foreground">{step.rating}</span>
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Bearbeiten">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Löschen"
            onClick={() =>
              deleteStep.mutate(step.id, { onError: (e) => toast.error(e.message) })
            }
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
        {step.notes && <p className="ml-10 text-sm whitespace-pre-wrap">{step.notes}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 border rounded-md">
      <div className="flex items-end gap-2">
        <span className="text-muted-foreground w-6 text-center text-sm">{step.step_number}</span>
        <DurationInput value={dur} onChange={setDur} className="flex-1" />
        <Button
          size="sm"
          onClick={() => {
            const v = durationPartsToSeconds(dur);
            if (v === null || v > 86_400) {
              toast.error("Dauer ungültig");
              return;
            }
            updateStep.mutate(
              {
                id: step.id,
                input: {
                  duration_seconds: v,
                  rating,
                  notes: notes.trim() === "" ? null : notes.trim(),
                },
              },
              {
                onSuccess: () => setEditing(false),
                onError: (e) => toast.error(e.message),
              },
            );
          }}
        >
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Abbruch
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
  );
}

function SessionMetaEditor({
  session,
  onSave,
  onCancel,
}: {
  session: SessionDTO;
  onSave: (input: { date: string | null; notes: string | null }) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(session.date ?? "");
  const [notes, setNotes] = useState(session.notes ?? "");
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <label className="text-sm w-16">Datum</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex gap-2 items-start">
        <label className="text-sm w-16 mt-2">Notizen</label>
        <Textarea
          className="flex-1 min-h-16"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbruch
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              date: date.trim() === "" ? null : date,
              notes: notes.trim() === "" ? null : notes,
            })
          }
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}
