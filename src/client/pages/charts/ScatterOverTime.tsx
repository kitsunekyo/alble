import React, { useMemo } from "react";
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
import { formatDate, formatTimestampDateShort, getCalendarWeek } from "@/shared/dates";
import { CHART_MARGIN, COMMON_X_AXIS_LABEL, COMMON_TICK, TOOLTIP_CONTAINER } from "./chart-config";
import type { ScatterPoint, SelectionState } from "./chart-data";

interface Props {
  scatterByRating: Record<Rating, ScatterPoint[]>;
  activeRatings: Set<Rating>;
  selection: SelectionState;
  onSelect: React.Dispatch<React.SetStateAction<SelectionState>>;
}

export const ScatterOverTime = React.memo(function ScatterOverTime({ scatterByRating, activeRatings, selection, onSelect }: Props) {
  const hasWeekSelection = selection.type === "week" && selection.weekKey !== null;

  const splitBySelection = useMemo(() => {
    const result: Record<Rating, { selected: ScatterPoint[]; unselected: ScatterPoint[] }> = {} as any;
    for (const rating of RATINGS) {
      const points = scatterByRating[rating] ?? [];
      if (!hasWeekSelection) {
        result[rating] = { selected: [], unselected: points };
        continue;
      }
      const selected: ScatterPoint[] = [];
      const unselected: ScatterPoint[] = [];
      for (const p of points) {
        const week = getCalendarWeek(p.date);
        (week.key === selection.weekKey ? selected : unselected).push(p);
      }
      result[rating] = { selected, unselected };
    }
    return result;
  }, [scatterByRating, selection.weekKey, hasWeekSelection]);

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
                  <div className={TOOLTIP_CONTAINER}>
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
            {RATINGS.filter((r) => activeRatings.has(r) && splitBySelection[r]).map((rating) => {
              const { selected, unselected } = splitBySelection[rating]!;
              if (!hasWeekSelection) {
                return (
                  <Scatter
                    key={rating}
                    name={rating}
                    data={unselected}
                    fill={RATING_COLORS[rating]}
                  />
                );
              }
              return (
                <React.Fragment key={rating}>
                  {unselected.length > 0 && (
                    <Scatter
                      data={unselected}
                      fill={RATING_COLORS[rating]}
                      fillOpacity={0.15}
                      r={2}
                      legendType="none"
                    />
                  )}
                  <Scatter
                    name={rating}
                    data={selected}
                    fill={RATING_COLORS[rating]}
                    fillOpacity={1}
                    r={5}
                  />
                </React.Fragment>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
