"use client";

import { useRef } from "react";
import { cn } from "@/client/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  className?: string;
  error?: boolean;
}

function maxForSegment(index: number): number {
  return index === 0 ? 23 : 59;
}

export function TimeInput({ value, onChange, onBlur, className, error }: TimeInputProps) {
  const displayValue = value || "00:00:00";
  const parts = displayValue.split(":");
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  function setRef(i: number) {
    return (el: HTMLInputElement | null) => {
      refs.current[i] = el;
    };
  }

  function readFromDom(): string[] {
    return refs.current.map((r) => r?.value ?? "00");
  }

  function handleInput(index: number) {
    const input = refs.current[index];
    if (!input) return;

    let clean = input.value.replace(/\D/g, "").slice(0, 2);

    if (clean.length === 2) {
      const val = parseInt(clean, 10);
      const max = maxForSegment(index);
      if (val > max) {
        clean = String(max).padStart(2, "0");
        input.value = clean;
      }
    }

    const next = value.split(":");
    next[index] = clean.padStart(2, "0");
    onChange(next.join(":"));

    if (clean.length === 2 && index < 2) {
      const nextInput = refs.current[index + 1];
      nextInput?.focus();
      nextInput?.select();
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.select();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;

    if (e.key === "Backspace" && input.value === "" && index > 0) {
      e.preventDefault();
      const prev = refs.current[index - 1];
      prev?.focus();
      prev?.select();
    }

    if (e.key === "ArrowLeft" && input.selectionStart === 0 && input.selectionEnd === 0 && index > 0) {
      e.preventDefault();
      const prev = refs.current[index - 1];
      prev?.focus();
      prev?.select();
    }

    if (e.key === "ArrowRight" && input.selectionStart === input.value.length && input.selectionEnd === input.value.length && index < 2) {
      e.preventDefault();
      const next = refs.current[index + 1];
      next?.focus();
      next?.select();
    }
  }

  function handleSegmentBlur() {
    const segValues = readFromDom();
    const valid = segValues.map((s, i) => {
      const n = parseInt(s, 10);
      if (isNaN(n)) return "00";
      return String(Math.min(n, maxForSegment(i))).padStart(2, "0");
    });
    const timeStr = valid.join(":");
    if (timeStr !== value) onChange(timeStr);
    onBlur?.(timeStr);
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center rounded-md border bg-background px-3 py-2 text-sm",
        "ring-offset-background focus-within:ring-2 focus-within:ring-offset-2",
        error
          ? "border-destructive focus-within:ring-destructive"
          : "border-input focus-within:ring-ring",
        className,
      )}
    >
      <Segment defaultValue={parts[0]} onInput={() => handleInput(0)} onFocus={handleFocus} onKeyDown={(e) => handleKeyDown(0, e)} onBlur={handleSegmentBlur} />
      <span className="text-muted-foreground select-none text-base leading-none mx-px">:</span>
      <Segment defaultValue={parts[1]} onInput={() => handleInput(1)} onFocus={handleFocus} onKeyDown={(e) => handleKeyDown(1, e)} onBlur={handleSegmentBlur} />
      <span className="text-muted-foreground select-none text-base leading-none mx-px">:</span>
      <Segment defaultValue={parts[2]} onInput={() => handleInput(2)} onFocus={handleFocus} onKeyDown={(e) => handleKeyDown(2, e)} onBlur={handleSegmentBlur} />
    </div>
  );
}

function Segment({
  defaultValue,
  onInput,
  onFocus,
  onKeyDown,
  onBlur,
}: {
  defaultValue: string | undefined;
  onInput: () => void;
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}) {
  return (
    <input
      defaultValue={defaultValue}
      maxLength={2}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      onInput={onInput}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="w-[2ch] min-w-0 text-center bg-transparent outline-none tabular-nums font-mono text-base p-0 border-0 focus:ring-0"
    />
  );
}
