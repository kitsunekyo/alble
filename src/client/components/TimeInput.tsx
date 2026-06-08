"use client";
import { useEffect, useRef, useCallback } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { cn } from "@/client/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const internalRef = useRef(false);

  const handleChange = useCallback(
    (selectedDates: Date[]) => {
      const d = selectedDates[0];
      if (d) {
        const formatted = formatTime(d);
        internalRef.current = true;
        onChange(formatted);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (!inputRef.current) return;

    const parts = value.split(":");
    const hh = parts[0] ?? "";
    const mm = parts[1] ?? "";
    const defaultDate = new Date();
    defaultDate.setHours(
      Number.parseInt(hh, 10) || 0,
      Number.parseInt(mm, 10) || 0,
      0,
      0,
    );

    fpRef.current = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      time_24hr: true,
      dateFormat: "H:i",
      defaultHour: Number.parseInt(hh, 10) || 0,
      defaultMinute: Number.parseInt(mm, 10) || 0,
      defaultDate,
      minuteIncrement: 1,
      prevArrow: "",
      nextArrow: "",
      onChange: handleChange,
      onClose: () => {
        if (fpRef.current?.selectedDates[0]) {
          fpRef.current.input.value = formatTime(
            fpRef.current.selectedDates[0],
          );
        }
      },
    });

    return () => {
      fpRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current = false;
      return;
    }
    if (!fpRef.current) return;

    const parts = value.split(":");
    const hh = parts[0] ?? "";
    const mm = parts[1] ?? "";
    const d = new Date();
    d.setHours(
      Number.parseInt(hh, 10) || 0,
      Number.parseInt(mm, 10) || 0,
      0,
      0,
    );
    fpRef.current.setDate(d, false);
    if (inputRef.current) {
      inputRef.current.value = formatTime(d);
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
    />
  );
}
