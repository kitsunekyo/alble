"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Loader2, Trash2, ChevronDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import {
  useSessions,
  useAddStep,
  useAddStepByDate,
  useSessionByDate,
  useDeleteSession,
  useUpdateSession,
  useDeleteStep,
  useUpdateStep,
} from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Textarea } from "@/client/components/ui/textarea";
import { Badge } from "@/client/components/ui/badge";
import { DatePicker } from "@/client/components/DatePicker";
import {
  QuickDurationInput,
  parseDuration,
  MAX_DURATION_SECONDS,
} from "@/client/components/QuickDurationInput";
import { MoodRatingPicker } from "@/client/components/MoodRatingPicker";
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
  todayIsoString,
} from "@/shared/dates";
import type { SessionDTO, StepDTO } from "@/shared/schemas";
import { toast } from "sonner";
import { cn } from "@/client/lib/utils";

const PAGE_SIZE = 10;

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

export function History() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const offset = (page - 1) * PAGE_SIZE;
  const sessions = useSessions(PAGE_SIZE, offset);

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

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

  if (sessions.isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 text-center text-muted-foreground">
        Fehler beim Laden.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-8 space-y-6">
      <DateEntryForm />

      {!sessions.data || sessions.data.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          {page > 1 ? "Keine Trainings in diesem Zeitraum." : <>Noch keine Daten. Lege auf <strong>Heute</strong> die erste Einheit an oder importiere die CSV in <strong>Einstellungen</strong>.</>}
        </Card>
      ) : (
        grouped.map(({ key, label, items }) => (
          <section key={key} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
            {items.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </section>
        ))
      )}

      <div className="flex items-center justify-center gap-4 pt-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="size-4 mr-1" /> Neuere
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">Seite {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
          Ältere <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function DateEntryForm() {
  const todayStr = todayIsoString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const session = useSessionByDate(selectedDate);
  const addStep = useAddStep();
  const addStepByDate = useAddStepByDate();

  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState(getCurrentTime);
  const [endTime, setEndTime] = useState("");
  const [rating, setRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");

  function clearForm() {
    setDuration("");
    setRating(null);
    setNotes("");
  }

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

  const parsedDuration = parseDuration(duration);
  const canSubmit =
    duration.trim() !== "" &&
    parsedDuration !== null &&
    parsedDuration > 0 &&
    parsedDuration <= MAX_DURATION_SECONDS &&
    rating !== null;

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

    if (session.data) {
      addStep.mutate(
        { sessionId: session.data.id, input },
        {
          onSuccess: clearForm,
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      addStepByDate.mutate(
        { date: selectedDate, input },
        {
          onSuccess: clearForm,
          onError: (e) => toast.error(e.message),
        },
      );
    }
  }

  const isPending = addStep.isPending || addStepByDate.isPending;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <DatePicker
          value={selectedDate}
          onChange={(v) => v && setSelectedDate(v)}
          className="w-full"
        />
      </div>

      {session.isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          {session.data && session.data.steps.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {session.data.steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </div>
          )}

          <div className="space-y-4">
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
          </div>
        </>
      )}

      {!session.isLoading && (
        <div className="text-sm text-muted-foreground text-center pt-2">
          {session.data ? (
            <>{formatWeekday(session.data.date ?? selectedDate)}, {formatDate(session.data.date ?? selectedDate)} ·{" "}
              Trainingstag {session.data.global_day} · {session.data.steps.length} Einheit
              {session.data.steps.length === 1 ? "" : "en"}</>
          ) : (
            <>{formatWeekday(selectedDate)}, {formatDate(selectedDate)} · 0 Einheiten</>
          )}
        </div>
      )}
    </Card>
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
        <DatePicker
          value={date === "" ? null : date}
          onChange={(v) => setDate(v ?? "")}
          className="flex-1"
        />
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
