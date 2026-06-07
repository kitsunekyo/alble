import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "@/client/components/ui/card";
import { formatDuration } from "@/shared/ratings";
import { formatTimestampDate, formatTimestampDateShort } from "@/shared/dates";
import { CHART_MARGIN, COMMON_X_AXIS_LABEL, COMMON_TICK, COMMON_TOOLTIP_STYLE } from "./chart-config";
import type { DailyPoint } from "./chart-data";

interface Props {
  daily: DailyPoint[];
}

export const DailyAvgLine = React.memo(function DailyAvgLine({ daily }: Props) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3">Durchschnittliche Trennungszeit pro Tag</h2>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={CHART_MARGIN}>
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
              tickFormatter={(v) => formatDuration(Number(v))}
              tick={COMMON_TICK}
            />
            <Tooltip
              contentStyle={COMMON_TOOLTIP_STYLE}
              labelFormatter={(label) => formatTimestampDate(Number(label))}
              formatter={(v) => [formatDuration(Number(v)), "⌀ Dauer"]}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="ma7_avg"
              name="7-Tage-⌀"
              stroke="var(--color-chart-1)"
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
