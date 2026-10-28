"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { analyzeVideo, type AnalysisResult, type AnalysisStage } from "@/client/lib/analysis";
import { Dropzone } from "@/client/components/analysis/Dropzone";
import { ReportView } from "@/client/components/analysis/ReportView";

const STAGE_LABELS: Record<AnalysisStage, string> = {
  read: "Lese Datei…",
  decode: "Dekodiere Audio…",
  downmix: "Wandle auf 16 kHz um…",
  analyze: "Analysiere Geräusche…",
};

export function Analysis() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stage, setStage] = useState<AnalysisStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function reset() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setVideoUrl(null);
    setResult(null);
    setStage(null);
    setError(null);
  }

  async function onFile(file: File) {
    reset();
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setVideoUrl(url);
    setStage("read");
    try {
      const r = await analyzeVideo(file, setStage);
      setResult(r);
      setStage(null);
    } catch (err) {
      reset();
      setError(
        err instanceof Error
          ? err.message
          : "Audio konnte nicht analysiert werden. Wird das Format vom Browser unterstützt?",
      );
    }
  }

  if (result && videoUrl) {
    return <ReportView videoUrl={videoUrl} result={result} onReset={reset} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24 md:pb-8 space-y-6">
      {stage && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <div className="text-sm font-medium text-foreground">{STAGE_LABELS[stage]}</div>
          <div className="text-xs">Läuft komplett lokal im Browser — kein Upload.</div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
          <TriangleAlert className="size-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      <Dropzone onFile={onFile} disabled={stage !== null} />
    </div>
  );
}
