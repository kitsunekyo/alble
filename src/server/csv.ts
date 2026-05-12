import { RATINGS, type Rating } from "@/shared/ratings";
import { isIsoDateString } from "@/shared/dates";
import type { CsvRow } from "./repo";

export interface CsvParseResult {
  rows: CsvRow[];
  errors: { line: number; message: string }[];
}

const LEGACY_RATINGS: Record<string, { rating: Rating; note?: string }> = {
  Pause: { rating: "Abbruch" },
  "Bitte anschauen": {
    rating: "Schlecht",
    note: "Bitte anschauen: migrated from previous rating",
  },
};

const REQUIRED_COLUMNS = ["global_day", "step", "trennungszeit_seconds", "bewertung"] as const;

export function parseCsv(text: string): CsvParseResult {
  const errors: { line: number; message: string }[] = [];
  const rows: CsvRow[] = [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { rows, errors: [{ line: 0, message: "Empty file" }] };

  const header = splitCsvLine(lines[0]!);
  const indices: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) {
    const i = header.indexOf(col);
    if (i === -1) {
      errors.push({ line: 1, message: `Missing column: ${col}` });
    } else {
      indices[col] = i;
    }
  }
  if (errors.length > 0) return { rows, errors };
  const dateIndex = header.indexOf("date");
  const noteIndex = header.indexOf("note");

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = splitCsvLine(lines[i]!);
    const get = (k: string) => cols[indices[k]!]?.trim() ?? "";

    const globalDay = Number.parseInt(get("global_day"), 10);
    const step = Number.parseInt(get("step"), 10);
    const durationRaw = get("trennungszeit_seconds");
    const ratingRaw = get("bewertung");
    const duration = Number.parseInt(durationRaw, 10);
    const date = dateIndex === -1 ? "" : (cols[dateIndex]?.trim() ?? "");
    const note = noteIndex === -1 ? "" : (cols[noteIndex]?.trim() ?? "");

    // Skip rows missing duration or rating (pause days, incomplete records).
    if (durationRaw === "" || ratingRaw === "") continue;

    if (!Number.isFinite(globalDay) || globalDay < 1) {
      errors.push({ line: lineNo, message: `Invalid global_day: ${get("global_day")}` });
      continue;
    }
    if (!Number.isFinite(step) || step < 1) {
      errors.push({ line: lineNo, message: `Invalid step: ${get("step")}` });
      continue;
    }
    if (!Number.isFinite(duration) || duration < 0) {
      errors.push({ line: lineNo, message: `Invalid duration: ${get("trennungszeit_seconds")}` });
      continue;
    }
    const normalized = normalizeRating(ratingRaw);
    if (!normalized) {
      errors.push({ line: lineNo, message: `Unknown rating: ${ratingRaw}` });
      continue;
    }
    if (date !== "" && !isIsoDateString(date)) {
      errors.push({ line: lineNo, message: `Invalid date: ${date}` });
      continue;
    }

    rows.push({
      date: date === "" ? null : date,
      global_day: globalDay,
      step,
      trennungszeit_seconds: duration,
      bewertung: normalized.rating,
      note: note === "" ? (normalized.note ?? null) : note,
    });
  }

  return { rows, errors };
}

function normalizeRating(value: string): { rating: Rating; note?: string } | null {
  if (RATINGS.includes(value as Rating)) return { rating: value as Rating };
  return LEGACY_RATINGS[value] ?? null;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cols.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cols.push(current);
  return cols;
}

export function rowsToCsv(
  rows: {
    date: string | null;
    global_day: number;
    step_number: number;
    duration_seconds: number;
    rating: string;
    notes: string | null;
  }[],
): string {
  const header = "date,global_day,step,trennungszeit_seconds,bewertung,note";
  const body = rows
    .map((r) =>
      [
        r.date ?? "",
        r.global_day,
        r.step_number,
        r.duration_seconds,
        escapeCsvValue(r.rating),
        escapeCsvValue(r.notes ?? ""),
      ].join(","),
    )
    .join("\n");
  return header + "\n" + body + "\n";
}

function escapeCsvValue(value: string): string {
  const singleLine = value.replaceAll(/\r\n?|\n/g, " ");
  return /[",]/.test(singleLine) ? `"${singleLine.replaceAll('"', '""')}"` : singleLine;
}
