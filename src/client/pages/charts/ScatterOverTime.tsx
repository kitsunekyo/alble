import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { RATINGS, RATING_COLORS, formatDuration, type Rating } from "@/shared/ratings";
import { formatDate, formatTimestampDateShort } from "@/shared/dates";
import { CHART_MARGIN, COMMON_X_AXIS_LABEL, COMMON_TICK } from "./chart-config";
import type { ScatterPoint } from "./chart-data";

interface Props {
  scatterByRating: Record<Rating, ScatterPoint[]>;
  activeRatings: Set<Rating>;
}

export const ScatterOverTime = React.memo(function ScatterOverTime({ scatterByRating, activeRatings }: Props) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Trennungszeit über die Zeit</h2>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Datum"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatTimestampDateShort(Number(v))}
              tick={COMMON_TICK}
              label={COMMON_X_AXIS_LABEL}
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
                const p = payload[0]!.payload as ScatterPoint;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow-md">
                    <div>
                      <strong>{formatDate(p.date)}</strong> · Schritt {p.step}
                    </div>
                    <div className="tabular-nums">
                      {formatDuration(p.y)}
                    </div>
                    <div style={{ color: RATING_COLORS[p.rating] }}>{p.rating}</div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => (
                <span style={{ color: "var(--color-foreground)" }}>{value}</span>
              )}
            />
            {RATINGS.filter((r) => activeRatings.has(r)).map((rating) => (
              <Scatter
                key={rating}
                name={rating}
                data={scatterByRating[rating]}
                fill={RATING_COLORS[rating]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
