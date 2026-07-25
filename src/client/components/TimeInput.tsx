"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/client/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

function isValidTimeStr(s: string): boolean {
  const parts = s.split(":");
  if (parts.length !== 3) return false;
  return parts.every((p) => /^\d{2}$/.test(p));
}

export function TimeInput({ value, onChange, onBlur, className }: TimeInputProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (isTouch) {
    return (
      <>
        <style>{`input.hide-time-controls::-webkit-calendar-picker-indicator,input.hide-time-controls::-webkit-clear-button,input.hide-time-controls::-webkit-inner-spin-button{display:none!important}`}</style>
        <input
          type="time"
          step="1"
          value={isValidTimeStr(value) ? value : "00:00:00"}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "hide-time-controls flex h-10 w-full truncate rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        />
      </>
    );
  }

  return <DesktopTimeInput value={value} onChange={onChange} onBlur={onBlur} className={className} />;
}

function DesktopTimeInput({ value, onChange, onBlur, className }: TimeInputProps) {
  const parts = value.split(":");
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  function setRef(i: number) {
    return (el: HTMLInputElement | null) => {
      refs.current[i] = el;
    };
  }

  function handleInput(index: number) {
    const input = refs.current[index];
    if (!input) return;

    const clean = input.value.replace(/\D/g, "").slice(0, 2);
    if (clean !== input.value) input.value = clean;

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
    const p = value.split(":");
    const valid = p.map((s, i) => {
      const n = parseInt(s, 10);
      if (isNaN(n)) return "00";
      const max = i === 0 ? 23 : 59;
      return String(Math.min(n, max)).padStart(2, "0");
    });
    const timeStr = valid.join(":");
    if (timeStr !== value) onChange(timeStr);
    onBlur?.();
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <input
        ref={setRef(0)}
        defaultValue={parts[0]}
        maxLength={2}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        onInput={() => handleInput(0)}
        onFocus={handleFocus}
        onKeyDown={(e) => handleKeyDown(0, e)}
        onBlur={handleSegmentBlur}
        className="w-[2ch] min-w-0 text-center bg-transparent outline-none tabular-nums font-mono text-base p-0 border-0 focus:ring-0"
      />
      <span className="text-muted-foreground select-none text-base leading-none mx-px">:</span>
      <input
        ref={setRef(1)}
        defaultValue={parts[1]}
        maxLength={2}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        onInput={() => handleInput(1)}
        onFocus={handleFocus}
        onKeyDown={(e) => handleKeyDown(1, e)}
        onBlur={handleSegmentBlur}
        className="w-[2ch] min-w-0 text-center bg-transparent outline-none tabular-nums font-mono text-base p-0 border-0 focus:ring-0"
      />
      <span className="text-muted-foreground select-none text-base leading-none mx-px">:</span>
      <input
        ref={setRef(2)}
        defaultValue={parts[2]}
        maxLength={2}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        onInput={() => handleInput(2)}
        onFocus={handleFocus}
        onKeyDown={(e) => handleKeyDown(2, e)}
        onBlur={handleSegmentBlur}
        className="w-[2ch] min-w-0 text-center bg-transparent outline-none tabular-nums font-mono text-base p-0 border-0 focus:ring-0"
      />
    </div>
  );
}
