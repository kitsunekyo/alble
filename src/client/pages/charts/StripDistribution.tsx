import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { RATINGS, RATING_COLORS, formatDuration, type Rating } from "@/shared/ratings";
import { formatDate } from "@/shared/dates";
import { CHART_MARGIN, COMMON_TICK } from "./chart-config";
import type { StripPoint } from "./chart-data";

interface Props {
  stripByRating: Record<Rating, StripPoint[]>;
}

export const StripDistribution = React.memo(function StripDistribution({ stripByRating }: Props) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Trennungszeit-Verteilung je Bewertung</h2>
      <div className="h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Bewertung"
              domain={[0.5, RATINGS.length + 0.5]}
              ticks={RATINGS.map((_, i) => i + 1)}
              tickFormatter={(v) => RATINGS[v - 1] ?? ""}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Dauer"
              tickFormatter={(v) => formatDuration(Number(v))}
              tick={COMMON_TICK}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const p = payload[0]!.payload as StripPoint;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow-md">
                    <div style={{ color: RATING_COLORS[p.rating] }}>{p.rating}</div>
                    <div className="tabular-nums">
                      {formatDuration(p.y)}
                    </div>
                    <div className="text-muted-foreground">{formatDate(p.date)}</div>
                  </div>
                );
              }}
            />
            {RATINGS.map((rating) => (
              <Scatter
                key={rating}
                data={stripByRating[rating]}
                fill={RATING_COLORS[rating]}
                fillOpacity={0.6}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
