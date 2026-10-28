"use client";

import { Card } from "@/client/components/ui/card";
import { formatDuration } from "@/shared/ratings";

interface SummaryCardsProps {
  count: number;
  bark: number;
  whine: number;
  whineSeconds: number;
  episodes: number;
  windExcluded: number;
}

export function SummaryCards({ count, bark, whine, whineSeconds, episodes, windExcluded }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{count}</div>
        <div className="text-xs text-muted-foreground mt-1">Geräusche erkannt</div>
        {windExcluded > 0 && (
          <div className="text-[11px] text-muted-foreground/80">{windExcluded} Wind/Rumpeln gefiltert</div>
        )}
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">{whine}</div>
        <div className="text-xs text-muted-foreground mt-1">Jaulen / Weinen</div>
        <div className="text-[11px] text-muted-foreground/80">{formatDuration(whineSeconds)} insgesamt</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">{bark}</div>
        <div className="text-xs text-muted-foreground mt-1">Winseln</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{episodes}</div>
        <div className="text-xs text-muted-foreground mt-1">Episoden</div>
      </Card>
    </div>
  );
}
