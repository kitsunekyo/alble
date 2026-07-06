"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { todayIsoString } from "@/shared/dates";
import { extractTags } from "@/shared/journal";

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
  const [timeInput, setTimeInput] = useState(nowHHMM());

  const tags = useMemo(() => extractTags(text), [text]);
  const canSubmit = text.trim().length > 0 && !submitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const [hh, mm] = timeInput.split(":");
    const timestamp = `${todayIsoString()}T${hh}:${mm}:00`;
    onSubmit({ timestamp, text: trimmed, tags: extractTags(trimmed) });
    setText("");
    setTimeInput(nowHHMM());
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="w-28">
        <Input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} />
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-20"
        maxLength={2000}
      />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="cursor-pointer"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
