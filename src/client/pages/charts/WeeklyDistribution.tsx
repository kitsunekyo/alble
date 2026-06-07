import React, { useCallback } from "react";
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
import { CHART_MARGIN, COMMON_TICK, TOOLTIP_CONTAINER } from "./chart-config";
import type { WeeklyRow, SelectionState } from "./chart-data";

interface Props {
  weekly: WeeklyRow[];
  activeRatings: Set<Rating>;
  selection: SelectionState;
  onSelect: React.Dispatch<React.SetStateAction<SelectionState>>;
}

export const WeeklyDistribution = React.memo(function WeeklyDistribution({ weekly, activeRatings, selection, onSelect }: Props) {
  const handleClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const weekKey = data.activePayload[0]!.payload.weekKey as number;
      onSelect(prev =>
        prev.type === "week" && prev.weekKey === weekKey
          ? { type: null, weekKey: null, dayTimestamp: null, rangeStart: null, rangeEnd: null }
          : { type: "week", weekKey, dayTimestamp: null, rangeStart: null, rangeEnd: null }
      );
    }
  }, [onSelect]);

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Bewertungsverteilung pro Woche</h2>
      <div className="h-72 min-w-0 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weekly}
            margin={CHART_MARGIN}
            onClick={handleClick}
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
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                return (
                  <div className={TOOLTIP_CONTAINER}>
                    <div className="font-medium mb-1">{label}</div>
                    {payload.map((entry) => (
                      <div key={String(entry.dataKey)} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}:</span>
                        <span className="tabular-nums font-medium">{entry.value}</span>
                      </div>
                    ))}
                    <div className="border-t mt-1.5 pt-1 text-muted-foreground">
                      Gesamt: {total} Schritte
                    </div>
                  </div>
                );
              }}
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
