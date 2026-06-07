import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { formatTimestampDate, formatTimestampDateShort } from "@/shared/dates";
import { CHART_MARGIN, COMMON_X_AXIS_LABEL, COMMON_TICK, COMMON_TOOLTIP_STYLE } from "./chart-config";
import { closestRatingLabel } from "./chart-helpers";
import type { DailyPoint } from "./chart-data";

interface Props {
  scoreDaily: DailyPoint[];
}

export const RatingScoreTrend = React.memo(function RatingScoreTrend({ scoreDaily }: Props) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Durchschnittliche Bewertung über die Zeit</h2>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scoreDaily} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatTimestampDateShort(Number(v))}
              tick={COMMON_TICK}
              label={COMMON_X_AXIS_LABEL}
            />
            <YAxis
              type="number"
              domain={[0.5, 4.5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(v) => {
                const labels: Record<number, string> = { 1: "Schlecht", 2: "Mittel", 3: "Gut", 4: "Ausgezeichnet" };
                return labels[Number(v)] ?? "";
              }}
              tick={COMMON_TICK}
            />
            <ReferenceLine y={2.5} stroke="var(--color-border)" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={COMMON_TOOLTIP_STYLE}
              labelFormatter={(label) => formatTimestampDate(Number(label))}
              formatter={(value) => {
                const score = Number(value ?? 0);
                const closest = closestRatingLabel(score);
                return [`${score.toFixed(1)} (${closest})`, "⌀ Bewertung"];
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="ma7_score"
              name="7-Tage-⌀"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
