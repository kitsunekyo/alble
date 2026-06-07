import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { RATINGS, RATING_COLORS, type Rating } from "@/shared/ratings";
import { CHART_MARGIN, COMMON_TICK, COMMON_TOOLTIP_STYLE } from "./chart-config";
import type { WeeklyRow } from "./chart-data";

interface Props {
  weekly: WeeklyRow[];
  activeRatings: Set<Rating>;
}

export const WeeklyDistribution = React.memo(function WeeklyDistribution({ weekly, activeRatings }: Props) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Bewertungsverteilung pro Woche</h2>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weekly}
            margin={CHART_MARGIN}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="weekLabel"
              tick={COMMON_TICK}
              label={{
                value: "Kalenderwoche",
                position: "insideBottom",
                offset: -4,
                fill: "var(--color-muted-foreground)",
                fontSize: 12,
              }}
            />
            <YAxis tick={COMMON_TICK} />
            <Tooltip
              contentStyle={COMMON_TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {RATINGS.filter((r) => activeRatings.has(r)).map((rating) => (
              <Bar
                key={rating}
                dataKey={rating}
                stackId="ratings"
                fill={RATING_COLORS[rating]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
