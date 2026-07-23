"use client";

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRightToLine, Loader2 } from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Button } from "@/client/components/ui/button";
import { RecentTags } from "@/client/components/RecentTags";
import { useRecentTags } from "@/client/hooks/use-journal";
import { todayIsoString } from "@/shared/dates";
import { extractTags } from "@/shared/journal";

interface ActiveTag {
  fragment: string;
  word: string;
  start: number;
  end: number;
}

function activeTagAtCursor(text: string, cursor: number): ActiveTag | null {
  const left = text.slice(0, cursor);
  const at = left.lastIndexOf("#");
  if (at === -1) return null;
  const wordStart = at + 1;
  const fragment = left.slice(wordStart);
  if (fragment.length === 0) return null;
  if (/[\s#]/.test(fragment)) return null;
  const restMatch = text.slice(wordStart).match(/^[^\s#]+/);
  const word = restMatch ? restMatch[0] : fragment;
  return { fragment, word, start: at, end: cursor };
}

export interface JournalQuickEntryPayload {
  timestamp: string;
  text: string;
  tags: string[];
}

interface JournalQuickEntryProps {
  onSubmit: (payload: JournalQuickEntryPayload) => void;
  submitting?: boolean;
  placeholder?: string;
}

function nowHHMM(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

export function JournalQuickEntry({
  onSubmit,
  submitting = false,
  placeholder = "Was ist passiert? #tag",
}: JournalQuickEntryProps) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dateInput, setDateInput] = useState(todayIsoString());
  const [timeInput, setTimeInput] = useState(nowHHMM());
  const { data: recentTags = [] } = useRecentTags();

  function handleTagSelect(label: string) {
    setText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} #${label}` : `#${label}`;
    });
  }

  const canSubmit = text.trim().length > 0 && !submitting;

  const activeTag = useMemo(() => activeTagAtCursor(text, cursor), [text, cursor]);

  const suggestion = useMemo(() => {
    if (!activeTag) return null;
    const frag = activeTag.fragment.toLowerCase();
    const word = activeTag.word.toLowerCase();
    return (
      recentTags.find((t) => {
        const lt = t.toLowerCase();
        return lt.startsWith(frag) && lt !== frag && lt !== word;
      }) ?? null
    );
  }, [activeTag, recentTags]);

  function acceptSuggestion() {
    if (!activeTag || !suggestion) return;
    const wordEnd = activeTag.start + 1 + activeTag.word.length;
    const next =
      text.slice(0, activeTag.start) + `#${suggestion} ` + text.slice(wordEnd);
    const newCursor = activeTag.start + suggestion.length + 2;
    setText(next);
    setCursor(newCursor);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newCursor, newCursor);
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const [hh, mm] = timeInput.split(":");
    const timestamp = `${dateInput}T${hh}:${mm}:00`;
    onSubmit({ timestamp, text: trimmed, tags: extractTags(trimmed) });
    setText("");
    setDateInput(todayIsoString());
    setTimeInput(nowHHMM());
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <Input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="flex-1"
        />
        <Input
          type="time"
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
          className="flex-1"
        />
      </div>

      <RecentTags onSelect={handleTagSelect} />

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCursor(e.target.selectionStart ?? 0);
        }}
        onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-20"
        maxLength={2000}
      />

      {suggestion && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={acceptSuggestion}
          className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/40 px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-secondary cursor-pointer"
        >
          <span className="font-medium">
            #{suggestion}
          </span>
          <ArrowRightToLine className="size-3 text-muted-foreground" />
        </button>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full md:w-auto cursor-pointer"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
