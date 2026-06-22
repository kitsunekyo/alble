import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { formatDuration } from "@/shared/ratings";
import { formatTimestampDate, formatTimestampDateShort, getCalendarWeek } from "@/shared/dates";
import { CHART_MARGIN, COMMON_X_AXIS_LABEL, COMMON_TICK, COMMON_TOOLTIP_STYLE } from "./chart-config";
import { closestRatingLabel } from "./chart-helpers";
import type { DailyPoint, SelectionState } from "./chart-data";

interface Props {
  daily: DailyPoint[];
  selection: SelectionState;
  onSelect: React.Dispatch<React.SetStateAction<SelectionState>>;
}

type LineKey = "avg" | "ma7_avg" | "score" | "ma7_score";

const LINE_CONFIG: Array<{ key: LineKey; label: string; color: string; dashed: boolean }> = [
  { key: "avg",      label: "Dauer",         color: "var(--color-chart-1)", dashed: false },
  { key: "ma7_avg",  label: "Dauer 7T-⌀",    color: "var(--color-chart-1)", dashed: true  },
  { key: "score",    label: "Bewertung",      color: "var(--color-chart-2)", dashed: false },
  { key: "ma7_score",label: "Bewertung 7T-⌀", color: "var(--color-chart-2)", dashed: true  },
];

export const CorrelationChart = React.memo(function CorrelationChart({ daily, selection, onSelect }: Props) {
  const [visibleLines, setVisibleLines] = useState<Set<LineKey>>(
    new Set(["avg", "ma7_avg", "score", "ma7_score"])
  );

  const toggleLine = (key: LineKey) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // keep at least one line visible
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const weekHighlight = useMemo(() => {
    if (selection.type !== "week" || selection.weekKey === null) return null;
    const daysInWeek = daily.filter(d => {
      const week = getCalendarWeek(d.date);
      return week.key === selection.weekKey;
    });
    if (daysInWeek.length === 0) return null;
    const minX = Math.min(...daysInWeek.map(d => d.x));
    const maxX = Math.max(...daysInWeek.map(d => d.x));
    return { x1: minX, x2: maxX };
  }, [daily, selection]);

  // Only include points that have at least one visible series with data
  const chartData = useMemo(() => {
    return daily.filter(d => {
      if ((visibleLines.has("avg") || visibleLines.has("ma7_avg")) && d.avg > 0) return true;
      if ((visibleLines.has("score") || visibleLines.has("ma7_score")) && d.score > 0) return true;
      return false;
    });
  }, [daily, visibleLines]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-medium">Dauer & Bewertung im Vergleich</h2>
        <div className="flex flex-wrap gap-1.5">
          {LINE_CONFIG.map(({ key, label, color, dashed }) => {
            const active = visibleLines.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground bg-transparent"
                }`}
                style={active ? { backgroundColor: color } : undefined}
                aria-pressed={active}
              >
                <span
                  className="inline-block w-4 h-0 border-t-2"
                  style={{
                    borderColor: active ? "white" : color,
                    borderStyle: dashed ? "dashed" : "solid",
                  }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatTimestampDateShort(Number(v))}
              tick={COMMON_TICK}
              label={COMMON_X_AXIS_LABEL}
            />
            {/* Left Y-axis: duration */}
            <YAxis
              yAxisId="duration"
              orientation="left"
              tickFormatter={(v) => formatDuration(Number(v))}
              tick={COMMON_TICK}
            />
            {/* Right Y-axis: rating score */}
            <YAxis
              yAxisId="score"
              orientation="right"
              type="number"
              domain={[0.5, 4.5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(v) => {
                const labels: Record<number, string> = { 1: "Schlecht", 2: "Mittel", 3: "Gut", 4: "Ausgezeichnet" };
                return labels[Number(v)] ?? "";
              }}
              tick={COMMON_TICK}
            />

            {weekHighlight && (
              <ReferenceArea
                yAxisId="duration"
                x1={weekHighlight.x1}
                x2={weekHighlight.x2}
                fill="var(--color-chart-1)"
                fillOpacity={0.08}
              />
            )}

            <ReferenceLine yAxisId="score" y={2.5} stroke="var(--color-border)" strokeDasharray="4 4" />

            <Tooltip
              contentStyle={COMMON_TOOLTIP_STYLE}
              labelFormatter={(label) => formatTimestampDate(Number(label))}
              formatter={(value, name) => {
                if (name === "avg") return [formatDuration(Number(value)), "Dauer"];
                if (name === "ma7_avg") return [formatDuration(Number(value)), "Dauer 7T-⌀"];
                if (name === "score" || name === "ma7_score") {
                  const s = Number(value ?? 0);
                  const label = name === "score" ? "Bewertung" : "Bewertung 7T-⌀";
                  return [`${s.toFixed(1)} (${closestRatingLabel(s)})`, label];
                }
                return [String(value), String(name)];
              }}
            />

            {visibleLines.has("avg") && (
              <Line
                yAxisId="duration"
                type="monotone"
                dataKey="avg"
                name="avg"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
              />
            )}
            {visibleLines.has("ma7_avg") && (
              <Line
                yAxisId="duration"
                type="monotone"
                dataKey="ma7_avg"
                name="ma7_avg"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
              />
            )}
            {visibleLines.has("score") && (
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="score"
                name="score"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
              />
            )}
            {visibleLines.has("ma7_score") && (
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="ma7_score"
                name="ma7_score"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
