"use client";

import { Download } from "lucide-react";
import type { AnalysisEvent } from "@/shared/analysis";
import { fmtClock, fmtRel } from "@/client/lib/analysis/filename";
import { Button } from "@/client/components/ui/button";

interface EventsTableProps {
  events: AnalysisEvent[];
  startedAt: number | null;
  fileName: string;
}

export function EventsTable({ events, startedAt, fileName }: EventsTableProps) {
  function exportCsv() {
    const header = "n,start_clock,end_clock,start_s,end_s,duration_s,peak_dbfs,dominant_hz,type";
    const lines = events.map((e, i) => {
      const ty = e.ty === "whine" ? "whine/cry" : "bark";
      return [
        i + 1,
        fmtClock(startedAt, e.s),
        fmtClock(startedAt, e.e),
        e.s.toFixed(2),
        e.e.toFixed(2),
        e.d.toFixed(2),
        e.pk.toFixed(1),
        e.hz,
        ty,
      ].join(",");
    });
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_events.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">Ereignisse ({events.length})</div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={events.length === 0}>
          <Download className="size-4" /> CSV
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-sm tabular-nums">
          <thead className="sticky top-0 bg-muted/95 backdrop-blur">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Uhrzeit</th>
              <th className="px-3 py-2 font-medium">Video</th>
              <th className="px-3 py-2 font-medium text-right">Dauer</th>
              <th className="px-3 py-2 font-medium text-right">Peak</th>
              <th className="px-3 py-2 font-medium text-right">Freq.</th>
              <th className="px-3 py-2 font-medium">Typ</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-3 py-1.5">{fmtClock(startedAt, e.s)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{fmtRel(e.s)}</td>
                <td className="px-3 py-1.5 text-right">{e.d.toFixed(1)}s</td>
                <td className="px-3 py-1.5 text-right">{e.pk} dB</td>
                <td className="px-3 py-1.5 text-right">{e.hz} Hz</td>
                <td className="px-3 py-1.5">
                  <span className={e.ty === "whine" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}>
                    {e.ty === "whine" ? "Jammern" : "Bellen"}
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Keine Ereignisse in dieser Auswahl.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
