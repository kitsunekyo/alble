"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { formatDuration } from "@/shared/ratings";
import { CHART_MARGIN, COMMON_TICK, TOOLTIP_CONTAINER } from "./chart-config";
import type { VideoAnalysisDTO } from "@/shared/analysis";

export interface VocalsDay {
  date: string;
  label: string;
  whineSeconds: number;
  barkCount: number;
  recordings: number;
}

export function buildVocalsByDay(analyses: VideoAnalysisDTO[]): VocalsDay[] {
  const map = new Map<string, VocalsDay>();
  for (const a of analyses) {
    let whineSeconds = 0;
    let bark = 0;
    for (const e of a.metrics.events) {
      if (e.ty === "whine") whineSeconds += e.d;
      else bark++;
    }
    const day = map.get(a.date) ?? {
      date: a.date,
      label: a.date.slice(8, 10) + "." + a.date.slice(5, 7) + ".",
      whineSeconds: 0,
      barkCount: 0,
      recordings: 0,
    };
    day.whineSeconds += whineSeconds;
    day.barkCount += bark;
    day.recordings++;
    map.set(a.date, day);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function VocalizationsChart({ days }: { days: VocalsDay[] }) {
  const hasData = days.length > 0;
  const maxBark = useMemo(() => Math.max(1, ...days.map((d) => d.barkCount)), [days]);

  if (!hasData) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-medium">Lautäußerungen pro Tag</h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Jammern/Weinen (Sekunden)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            Bellen (Anzahl)
          </span>
        </div>
      </div>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={days} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={COMMON_TICK} />
            <YAxis
              yAxisId="seconds"
              tick={COMMON_TICK}
              label={{
                value: "Jammern (Sek.)",
                position: "insideLeft",
                angle: -90,
                dy: 40,
                fill: "var(--color-muted-foreground)",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              domain={[0, maxBark * 1.2]}
              allowDecimals={false}
              tick={COMMON_TICK}
              label={{
                value: "Bellen (Anzahl)",
                position: "insideRight",
                angle: 90,
                dy: -40,
                fill: "var(--color-muted-foreground)",
                fontSize: 12,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const day = payload[0]!.payload as VocalsDay;
                return (
                  <div className={TOOLTIP_CONTAINER}>
                    <div className="font-medium mb-1">{day.date}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      <span>Jammern/Weinen:</span>
                      <span className="tabular-nums font-medium">{formatDuration(Math.round(day.whineSeconds))}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                      <span>Bellen:</span>
                      <span className="tabular-nums font-medium">{day.barkCount}</span>
                    </div>
                    <div className="border-t mt-1.5 pt-1 text-muted-foreground">
                      {day.recordings} Aufnahme{day.recordings > 1 ? "n" : ""} analysiert
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              yAxisId="seconds"
              dataKey="whineSeconds"
              name="Jammern (Sekunden)"
              fill="#ef4444"
              fillOpacity={0.75}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="count"
              dataKey="barkCount"
              name="Bellen (Anzahl)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
