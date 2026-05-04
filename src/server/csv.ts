import { RATINGS, type Rating } from "@/shared/ratings";
import { isIsoDateString } from "@/shared/dates";
import type { CsvRow } from "./repo";

export interface CsvParseResult {
  rows: CsvRow[];
  errors: { line: number; message: string }[];
}

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

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = splitCsvLine(lines[i]!);
    const get = (k: string) => cols[indices[k]!]?.trim() ?? "";

    const globalDay = Number.parseInt(get("global_day"), 10);
    const step = Number.parseInt(get("step"), 10);
    const durationRaw = get("trennungszeit_seconds");
    const ratingRaw = get("bewertung");
    const duration = Number.parseInt(durationRaw, 10);
    const date = header.includes("date") ? get("date") : "";

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
    if (!RATINGS.includes(ratingRaw as Rating)) {
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
      bewertung: ratingRaw as Rating,
    });
  }

  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV: no quoted fields with commas in this dataset.
  return line.split(",");
}

export function rowsToCsv(
  rows: {
    date: string | null;
    global_day: number;
    step_number: number;
    duration_seconds: number;
    rating: string;
  }[],
): string {
  const header = "date,global_day,step,trennungszeit_seconds,bewertung";
  const body = rows
    .map((r) => `${r.date ?? ""},${r.global_day},${r.step_number},${r.duration_seconds},${r.rating}`)
    .join("\n");
  return header + "\n" + body + "\n";
}
