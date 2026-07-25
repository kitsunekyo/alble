"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/client/components/ui/input";
import { TimeInput } from "@/client/components/TimeInput";
import { cn } from "@/client/lib/utils";
import { formatDuration } from "@/shared/ratings";
import { parseDuration } from "@/client/components/QuickDurationInput";

function getCurrentTimeString(): string {
  const now = new Date();
  return [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function timeToSeconds(time: string): number | null {
  const parts = time.split(":");
  if (parts.length !== 3) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = Number(parts[2]);
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  if (h < 0 || h > 24 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

function secondsToTime(total: number): string {
  total = ((total % 86400) + 86400) % 86400;
  return [
    String(Math.floor(total / 3600)).padStart(2, "0"),
    String(Math.floor((total % 3600) / 60)).padStart(2, "0"),
    String(total % 60).padStart(2, "0"),
  ].join(":");
}

interface TrainingTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  className?: string;
}

export function TrainingTimeInput({
  value,
  onChange,
  onEnter,
  className,
}: TrainingTimeInputProps) {
  const [startTime, setStartTime] = useState(getCurrentTimeString);
  const [endTime, setEndTime] = useState("");
  const [endCommitted, setEndCommitted] = useState(false);

  const startTimeRef = useRef(startTime);
  const onChangeRef = useRef(onChange);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const startSecs = timeToSeconds(startTime);
  const endSecs = timeToSeconds(endTime);
  const isEndBeforeStart =
    endCommitted && startSecs !== null && endSecs !== null && endSecs <= startSecs;

  function handleDurationBlur() {
    const s = timeToSeconds(startTimeRef.current);
    const d = parseDuration(value);
    if (s !== null && d !== null && d > 0) {
      setEndTime(secondsToTime(s + d));
      setEndCommitted(true);
    }
  }

  function handleStartTimeChange(newTime: string) {
    setStartTime(newTime);
  }

  function handleStartTimeBlur(blurredTime: string) {
    const s = timeToSeconds(blurredTime);
    if (s !== null) {
      const d = parseDuration(value);
      if (d !== null && d > 0) {
        setEndTime(secondsToTime(s + d));
        setEndCommitted(true);
      }
    }
  }

  function handleEndTimeChange(newTime: string) {
    setEndTime(newTime);
  }

  function handleEndTimeBlur(blurredTime: string) {
    setEndCommitted(true);
    const s = timeToSeconds(startTimeRef.current);
    const e = timeToSeconds(blurredTime);
    if (s !== null && e !== null) {
      const diff = e - s;
      if (diff > 0) {
        onChangeRef.current(formatDuration(diff));
      }
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <span className="text-sm font-medium">Dauer</span>
        <Input
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="0h"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleDurationBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Start</span>
          <TimeInput
            value={startTime}
            onChange={handleStartTimeChange}
            onBlur={handleStartTimeBlur}
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Ende</span>
          <TimeInput
            value={endTime}
            onChange={handleEndTimeChange}
            onBlur={handleEndTimeBlur}
            error={isEndBeforeStart}
          />
          {isEndBeforeStart && (
            <p className="text-xs text-destructive">Ende muss vor Start sein</p>
          )}
        </div>
      </div>
    </div>
  );
}
