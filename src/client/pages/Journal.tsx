"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Loader2,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  useJournalEntries,
  useAddJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
} from "@/client/hooks/use-journal";
import { JournalQuickEntry } from "@/client/components/JournalQuickEntry";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Textarea } from "@/client/components/ui/textarea";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { extractTags } from "@/shared/journal";
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

const PAGE_SIZE = 14;

export function Journal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const offset = (page - 1) * PAGE_SIZE;
  const entries = useJournalEntries(PAGE_SIZE, offset);
  const addEntry = useAddJournalEntry();

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
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-8 space-y-4">
      <Card className="p-4">
        <JournalQuickEntry
          submitting={addEntry.isPending}
          onSubmit={({ timestamp, text, tags }) =>
            addEntry.mutate(
              { timestamp, text, moods: tags },
              { onError: (e) => toast.error(e.message) },
            )
          }
        />
      </Card>

      {grouped.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          {page > 1 ? "Keine Einträge in diesem Zeitraum." : "Noch keine Tagebucheinträge."}
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

function JournalEntryRow({ entry }: { entry: JournalEntryDTO }) {
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(entry.text);
  const [draftTime, setDraftTime] = useState(extractTime(entry.timestamp));
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!editing) {
    return (
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-sm tabular-nums text-muted-foreground shrink-0">
            {extractTime(entry.timestamp)}
          </div>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Aktionen" className="-my-1">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
        </div>
        {entry.moods.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.moods.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
        input: { timestamp, text: trimmed, moods: extractTags(trimmed) },
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
