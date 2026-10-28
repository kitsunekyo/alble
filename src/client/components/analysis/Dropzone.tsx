"use client";

import { useRef, useState } from "react";
import { Clapperboard, FileVideo } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/client/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".mp4") && file.type !== "video/mp4") {
        throw new Error("Bitte eine MP4-Videodatei der Reolink-Kamera wählen.");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("Datei ist zu groß (max. ~2 GB im Browser).");
      }
      onFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Datei konnte nicht gelesen werden.");
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Video zum Analysieren ablegen oder auswählen"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      className={cn(
        "mx-auto max-w-xl rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,.mp4"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        {dragging ? <Clapperboard className="size-10" /> : <FileVideo className="size-10" />}
        <div className="text-base font-medium text-foreground">
          Reolink-Video hierher ziehen
        </div>
        <div className="text-sm">
          oder antippen, um eine Datei auszuwählen (.mp4)
        </div>
        <div className="text-xs mt-2 max-w-sm">
          Das Video wird ausschließlich lokal in deinem Browser analysiert — nichts wird hochgeladen.
        </div>
      </div>
    </div>
  );
}
