import { Card } from "@/client/components/ui/card";
import { formatDuration } from "@/shared/ratings";
import { formatDateShort } from "@/shared/dates";
import { closestRatingLabel, formatDelta } from "./chart-helpers";
import type { StatsData } from "./chart-data";

export function StatsSummary({ stats }: { stats: StatsData }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Sitzungen</div>
        <div className="text-2xl font-semibold tabular-nums">{stats.sessionCount}</div>
        <div className="text-xs mt-1" style={{ color: formatDelta(stats.sessionCountDelta, "").color }}>
          {formatDelta(stats.sessionCountDelta, "").text} (vs. Vorperiode)
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Gesamtzeit</div>
        <div className="text-2xl font-semibold tabular-nums">{formatDuration(stats.totalDuration)}</div>
        <div className="text-xs mt-1" style={{ color: formatDelta(stats.totalDurationDelta / 3600, "h").color }}>
          {formatDelta(Math.round(stats.totalDurationDelta / 360) / 10, "h").text} (vs. Vorperiode)
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">⌀ Bewertung</div>
        <div className="text-2xl font-semibold tabular-nums">
          {closestRatingLabel(stats.avgScore)} ({stats.avgScore.toFixed(1)})
        </div>
        <div className="text-xs mt-1" style={{ color: formatDelta(stats.avgScoreDelta, "").color }}>
          {formatDelta(Math.round(stats.avgScoreDelta * 10) / 10, "").text} (vs. Vorperiode)
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Beste Woche</div>
        <div className="text-lg font-semibold">
          {stats.bestWeek ? stats.bestWeek.label : "—"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {stats.bestWeek
            ? `(${formatDateShort(stats.bestWeek.startDate)}) · ${formatDuration(stats.bestWeek.hours * 3600)}`
            : "Keine Daten"
          }
        </div>
      </Card>
    </div>
  );
}
