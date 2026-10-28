"use client";

import { useMemo, useRef, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisResult } from "@/client/lib/analysis";
import { aggregate } from "@/client/lib/analysis";
import { buildEpisodes } from "@/client/lib/analysis/detect";
import { filterByPreset, summarize } from "@/client/lib/analysis/presets";
import { fmtClockFromSecOfDay } from "@/client/lib/analysis/filename";
import { ANALYSIS_EVENT_CAP, type Preset } from "@/shared/analysis";
import { todayIsoString } from "@/shared/dates";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { PresetTabs } from "./PresetTabs";
import { SummaryCards } from "./SummaryCards";
import { TimelineChart } from "./TimelineChart";
import { EventsTable } from "./EventsTable";
import { useSaveAnalysis } from "@/client/hooks/use-analyses";

interface ReportViewProps {
  videoUrl: string;
  result: AnalysisResult;
  onReset: () => void;
}

export function ReportView({ videoUrl, result, onReset }: ReportViewProps) {
  const [preset, setPreset] = useState<Preset>("all");
  const videoRef = useRef<HTMLVideoElement>(null);

  const filtered = useMemo(() => filterByPreset(result.events, preset), [result.events, preset]);
  const episodes = useMemo(() => buildEpisodes(filtered), [filtered]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const whineSeconds = useMemo(
    () => filtered.filter((e) => e.ty === "whine").reduce((a, e) => a + e.d, 0),
    [filtered],
  );

  const totals = useMemo(() => aggregate(result), [result]);

  // --- save flow ---
  const saveAnalysis = useSaveAnalysis();
  const [date, setDate] = useState(todayIsoString());
  const saved = saveAnalysis.isSuccess;

  function save() {
    saveAnalysis.mutate(
      {
        date,
        file_name: result.fileName,
        started_at: result.startedAt !== null ? fmtClockFromSecOfDay(result.startedAt) : null,
        metrics: {
          level: result.level,
          durationSeconds: Math.round(result.durationSeconds),
          soundSeconds: totals.soundSeconds,
          windExcluded: result.windExcluded,
          counts: totals.counts,
          episodes: totals.episodes,
          events: totals.events.slice(0, ANALYSIS_EVENT_CAP),
        },
      },
      {
        onSuccess: () => toast.success("Analyse im Trainingstag gespeichert."),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-2 pb-8 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{result.fileName}</div>
          <div className="text-xs text-muted-foreground">
            {Math.round(result.durationSeconds / 60)} Min Video · {result.events.length} Geräusche ·{" "}
            {result.startedAt !== null ? `gestartet ${fmtClockFromSecOfDay(result.startedAt)} Uhr` : "keine Uhrzeit im Dateinamen"}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw className="size-4" /> Neues Video
        </Button>
      </div>

      <PresetTabs preset={preset} onChange={setPreset} />

      <SummaryCards
        count={summary.count}
        bark={summary.bark}
        whine={summary.whine}
        whineSeconds={whineSeconds}
        episodes={episodes.length}
        windExcluded={result.windExcluded}
      />

      <video
        ref={videoRef}
        src={videoUrl}
        controls
        preload="metadata"
        playsInline
        className="w-full rounded-lg bg-black"
      />

      <TimelineChart
        durationSeconds={result.durationSeconds}
        level={result.level}
        startedAt={result.startedAt}
        curve={result.curve}
        events={filtered}
        episodes={episodes}
        videoRef={videoRef}
      />

      <EventsTable events={filtered} startedAt={result.startedAt} fileName={result.fileName} />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <label htmlFor="analysis-date" className="text-xs font-medium text-muted-foreground">
            Trainingstag
          </label>
          <Input
            id="analysis-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex-1 text-xs text-muted-foreground">
          Speichert die Metriken (Anzahlen, Zeiten, Episoden — kein Video) zum Trainingstag.
          Das Video selbst verlässt deinen Browser nicht.
        </div>
        <Button onClick={save} disabled={saved || saveAnalysis.isPending || !/^\d{4}-\d{2}-\d{2}$/.test(date)}>
          <Save className="size-4" />
          {saveAnalysis.isPending ? "Speichere…" : saved ? "Gespeichert" : "In Trainingstag übernehmen"}
        </Button>
      </div>
    </div>
  );
}
