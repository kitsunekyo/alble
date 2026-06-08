"use client";

import { useState, useMemo } from "react";
import { Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import {
  useJournalEntries,
  useAddJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
} from "@/client/hooks/use-journal";
import { MoodPicker } from "@/client/components/MoodPicker";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Textarea } from "@/client/components/ui/textarea";
import { Input } from "@/client/components/ui/input";
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
import { MOOD_MAP } from "@/shared/journal";
import type { Mood } from "@/shared/journal";
import type { JournalEntryDTO } from "@/shared/schemas";
import { todayIsoString, parseIsoDate, formatDate, formatWeekday } from "@/shared/dates";
import { toast } from "sonner";

function extractTime(iso: string): string {
  return iso.slice(11, 16);
}

function extractDate(iso: string): string {
  return iso.slice(0, 10);
}

function getDateLabel(dateStr: string): string {
  const today = todayIsoString();
  if (dateStr === today) return "Heute";
  const todayDate = parseIsoDate(today);
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === yesterdayStr) return "Gestern";
  const d = parseIsoDate(dateStr);
  return `${formatWeekday(dateStr)}, ${formatDate(dateStr)}`;
}

export function Journal() {
  const entries = useJournalEntries();
  const addEntry = useAddJournalEntry();

  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, "0");
  const currentMM = String(now.getMinutes()).padStart(2, "0");

  const [text, setText] = useState("");
  const [moods, setMoods] = useState<Mood[]>([]);
  const [timeInput, setTimeInput] = useState(`${currentHH}:${currentMM}`);

  function resetTime() {
    const n = new Date();
    const hh = String(n.getHours()).padStart(2, "0");
    const mm = String(n.getMinutes()).padStart(2, "0");
    setTimeInput(`${hh}:${mm}`);
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Text eingeben");
      return;
    }
    const [hh, mm] = timeInput.split(":");
    const today = todayIsoString();
    const timestamp = `${today}T${hh}:${mm}:00`;
    addEntry.mutate(
      { timestamp, text: trimmed, moods },
      {
        onSuccess: () => {
          setText("");
          setMoods([]);
          resetTime();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const grouped = useMemo(() => {
    if (!entries.data) return [];
    const map = new Map<string, JournalEntryDTO[]>();
    for (const entry of entries.data) {
      const dateKey = extractDate(entry.timestamp);
      const arr = map.get(dateKey) ?? [];
      arr.push(entry);
      map.set(dateKey, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries.data]);

  if (entries.isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 text-center text-muted-foreground">
        Fehler beim Laden.
      </div>
    );
  }

  if (entries.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Tagebuch</h1>
      </div>

      <Card className="p-4 mb-6 bg-background">
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was ist passiert?"
            className="min-h-20"
            maxLength={2000}
          />
          <MoodPicker value={moods} onChange={setMoods} />
          <div className="flex gap-2 items-end">
            <div className="w-28">
              <Input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} />
            </div>
            <Button onClick={submit} disabled={addEntry.isPending}>
              {addEntry.isPending ? <Loader2 className="size-4 animate-spin" /> : "Hinzufügen"}
            </Button>
          </div>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Noch keine Tagebucheinträge.
        </Card>
      ) : (
        grouped.map(([dateKey, dateEntries]) => (
          <div key={dateKey} className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {getDateLabel(dateKey)}
            </p>
            <div className="space-y-2">
              {dateEntries.map((entry) => (
                <JournalEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function JournalEntryRow({ entry }: { entry: JournalEntryDTO }) {
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(entry.text);
  const [draftMoods, setDraftMoods] = useState<Mood[]>(entry.moods);
  const [draftTime, setDraftTime] = useState(extractTime(entry.timestamp));

  if (!editing) {
    const moodInfos = entry.moods
      .map((m) => MOOD_MAP[m])
      .filter((v): v is NonNullable<typeof v> => !!v);
    return (
      <Card className="p-3 flex items-start gap-3">
        <div className="text-sm tabular-nums text-muted-foreground w-12 shrink-0 pt-0.5">
          {extractTime(entry.timestamp)}
        </div>
        {moodInfos.length > 0 && (
          <div className="flex flex-wrap gap-1 shrink-0 pt-0.5">
            {moodInfos.map((mi) => (
              <span key={mi.key} className="text-xs text-muted-foreground">
                {mi.emoji}&nbsp;{mi.label}
              </span>
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
        </div>
        <div className="flex shrink-0 -my-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Bearbeiten">
            <Pencil className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Löschen">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dieser Tagebucheintrag wird endgültig entfernt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteEntry.mutate(entry.id, {
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
      </Card>
    );
  }

  function save() {
    const trimmed = draftText.trim();
    if (!trimmed) {
      toast.error("Text eingeben");
      return;
    }
    const datePart = extractDate(entry.timestamp);
    const timestamp = `${datePart}T${draftTime}:00`;
    updateEntry.mutate(
      {
        id: entry.id,
        input: { timestamp, text: trimmed, moods: draftMoods },
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
        <div className="w-28">
          <Input type="time" value={draftTime} onChange={(e) => setDraftTime(e.target.value)} />
        </div>
        <MoodPicker value={draftMoods} onChange={setDraftMoods} />
        <Button variant="ghost" size="icon" onClick={save} aria-label="Speichern">
          <Check className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setEditing(false)} aria-label="Abbrechen">
          <X className="size-4" />
        </Button>
      </div>
      <Textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        className="min-h-20"
        maxLength={2000}
      />
    </Card>
  );
}
