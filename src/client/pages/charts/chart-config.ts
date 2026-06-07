import type { Margin } from "recharts/types/util/types";

export const CHART_MARGIN: Margin = { top: 8, right: 16, left: 0, bottom: 8 };

export const TOOLTIP_CONTAINER = "rounded-md border bg-background p-2 text-xs shadow-md";

export const COMMON_X_AXIS_LABEL = {
  value: "Datum",
  position: "insideBottom" as const,
  offset: -4,
  fill: "var(--color-muted-foreground)",
  fontSize: 12,
};

export const COMMON_TICK = { fill: "var(--color-muted-foreground)", fontSize: 12 };

export const COMMON_TOOLTIP_STYLE = {
  background: "var(--color-background)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 12,
};
