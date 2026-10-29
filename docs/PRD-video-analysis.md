# PRD: Video-Sound-Analyse (client-side) — "Analyse"

Status: Draft, awaiting go
Date: 2026-10-27
Owner: Alex

## 1. Background

Training sessions with Pina are recorded by the Reolink camera ("Kamera-01", MP4/H264/AAC).
Today these recordings are analyzed with a WSL CLI script (`detect_sounds.py`): RMS
loudness frames, hysteresis event detection, spectral classification (bark vs whine/cry
vs wind), episodes, and an interactive HTML timeline with video scrubbing.

Alble tracks the training manually (steps, ratings, journal, charts) but has no connection
to the actual recordings. This feature brings the analysis into the app: drop a recording
into Alble, get the report instantly, and — if desired — attach the metrics to the day's
training session so progress becomes measurable.

**Privacy requirement:** the video file never leaves the browser. All processing is
client-side. Only explicitly saved metrics (JSON, no audio/video) go to the database.

## 2. Research: WebAssembly or not?

**Decision: No WebAssembly. Use the browser's native Web Audio pipeline + a TypeScript
port of the proven DSP.**

Findings:

- **ffmpeg.wasm (single-thread)**: ~25–32 MB download per load, runs at **0.04x native
  speed** (published benchmark: 128.8 s vs 5.2 s native for a short transcode). Blocks
  workers; abort/cancel barely works.
- **ffmpeg.wasm (multi-thread)**: requires `SharedArrayBuffer` → page must be
  cross-origin isolated (COOP/COEP headers). Known pthread-pool hangs, marked "more
  unstable" by the project itself. Two production teams (Clapr, Browser Kitty) shipped
  the single-thread core and dropped MT after losing days to silent hangs.
- **Web Audio `decodeAudioData()`**: the browser decodes the audio track of an MP4 natively
  (video stream is skipped, no ffmpeg involved) at native codec speed. Creating the
  context at `sampleRate: 16000` resamples during decode; an `OfflineAudioContext`
  downmixes to mono. This exact pattern is used in production by Remotion
  (`getAudioData`) and ihub-apps (MP4 → 16 kHz mono, supports files up to 50 GB by
  slicing). No special headers, works on any host including the PWA.
- **The DSP itself** (cumsum RMS frames, hysteresis state machine, FFT band
  classification) is trivial arithmetic. For a 26-min clip: ~63k frames + ~150 FFTs →
  **well under 1 s in plain JS**.

Risk accepted: `decodeAudioData` covers only codecs the browser can decode. Target input
is exclusively Reolink MP4/AAC, which every relevant browser decodes. If other sources
appear later, a lazy-loaded fallback decoder (@audio/decode or ffmpeg.wasm) can be added
as a separate milestone — not needed for v1.

Estimated total for a 26-min clip: **~2–4 s** (decode dominates). ffmpeg.wasm would add
a 30 MB download and 10–25x slower processing for zero benefit on these files.

## 3. Goals / Non-Goals

**Goals**
1. Drop a Reolink MP4 into Alble → analysis runs fully client-side → report renders.
2. Report contains: energy curve, hotspot strip (amount + intensity), event dots,
   episode brackets, event table, summary numbers — port of the proven timeline.
3. Video scrubbing: embedded player (blob URL), click any hotspot/dot to jump there.
4. Presets: "Alle Geräusche" / "Bellen" / "Jammern & Weinen" (one click, instant filter).
5. Wall-clock timestamps parsed from the Reolink filename (`Kamera-01-HHMMSS-HHMMSS`).
6. Optional, explicit save: attach analysis metrics to the day's session → visible in
   Training history and Charts (e.g. Jammern-Sekunden per Tag).
7. CSV export of events (client-side download).
8. Works on desktop browser and installed PWA (file picker on mobile).

**Non-Goals (v1)**
- No video/audio upload anywhere.
- No WASM/ffmpeg bundling.
- No ML classification; keep the proven duration + spectral-band heuristic.
- No multi-file batch processing.
- No editing/annotation of detected events.

## 4. User Flow

1. Nav item **"Analyse"** (5th nav item, Video icon) → analysis page.
2. Drop zone (drag & drop on desktop; tap → file picker on mobile). One file at a time.
3. Progress: "Dekodiere Audio …" → "Analysiere …" (two staged progress states).
4. Report view (preset tabs on top):
   - Summary cards: events count, Jammern/Bellen split, total sound seconds, episodes.
   - Video player + timeline (curve, threshold, hotspots, dots, episode brackets,
     clock + video-relative axes, hover tooltips, click-to-seek).
   - Events table (clock time, video time, duration, peak dB, dominant Hz, type).
   - Actions: CSV export, "In Trainingstag übernehmen" (save), "Neues Video".
5. Saving shows a toast; the day's entry in Training/Charts then includes the metrics.

## 5. Functional Requirements

- **FR-1** Accept single `.mp4` (≤ ~2 GB); reject others with a clear German error.
- **FR-2** Decode audio client-side via `AudioContext({sampleRate:16000})` +
  `decodeAudioData` + `OfflineAudioContext` mono downmix. Clean up object URLs.
- **FR-3** Analysis identical to `detect_sounds.py` v2 (validated against the 10272026
  recording): 50 ms/25 ms frames, threshold −40 dBFS, 6 dB hysteresis, min duration
  0.15 s, merge gap 0.35 s, episode gap 60 s, LF (<250 Hz) wind rejection,
  bark/whine classification via band shares + tonality/centroid, dominant-Hz per
  event. (2026-10-29: sustained low-pitched tonal events are classified as
  Jaulen even when their harmonics fill the 800–3000 Hz band — see
  HANDOFF-video-analysis.md.)
- **FR-4** Presets filter the view; defaults per PRD. Wind excluded everywhere by default.
- **FR-5** Timeline interaction parity with the HTML prototype (verified feature):
   hover tooltips, cursor time readout, click-to-seek, episode brackets.
- **FR-6** Parse `HHMMSS-HHMMSS` filenames for clock times; fall back to video-relative
  only when absent.
- **FR-7** Save (explicit action): persist metrics JSON linked to the day's session
  (`global_day`); no audio/video bytes leave the device.
- **FR-8** Training history: session detail shows saved analyses (summary + timeline
  without video).
- **FR-9** Charts: new "Geräusche" view — Jammern-Sekunden/Tag + Bellen count/Tag
  (recharts, existing style).
- **FR-10** CSV export with the same columns as the CLI `_events.csv`.

## 6. Technical Plan

### New code (all client-side unless noted)

```
src/client/lib/analysis/
  decode.ts        # File -> Float32Array 16 kHz mono (Web Audio), staged progress
  dsp.ts           # frame energies (cumsum RMS), constants
  detect.ts        # hysteresis, merge, min-duration, episodes
  classify.ts      # small radix-2 FFT (800->1024 padded), band shares, type
  filename.ts      # Reolink HHMMSS-HHMMSS parsing -> start DateTime
  presets.ts       # "all" | "whine" | "bark" filter definitions
  index.ts         # analyzeVideo(file, onProgress): AnalysisResult
  types.ts         # AnalysisEvent, Episode, AnalysisResult
src/client/components/analysis/
  Dropzone.tsx     # drag & drop + file input, accepts video/mp4
  ReportView.tsx   # layout: presets, cards, player, timeline, table, actions
  TimelineChart.tsx# SVG port of the prototype (React, refs for seek)
  EventsTable.tsx  # scrollable table, CSV export button
  SummaryCards.tsx
  PresetTabs.tsx
src/client/pages/Analysis.tsx + app/analysis/page.tsx
src/shared/analysis.ts  # DTOs + zod schemas for persisted metrics
```

### Server (M2)

- `src/server/db/schema.ts`: new `video_analyses` table:
  `id, global_day (unique per day+file), file_name, duration_seconds, preset,
  metrics (json text: totals, byType, episodes[], events[] capped at 2000),
  created_at`.
- Repo/API functions following the existing `api-handler` pattern:
  `saveVideoAnalysis`, `listAnalysesForDay`, `deleteVideoAnalysis`.
- Migration: `pnpm db:generate` + `pnpm db:migrate`.
- Charts/History integration (recharts, existing page structure).

### Existing pieces reused

- Timeline SVG logic: direct port from the verified prototype in
  `C:\Users\alexa\Videos\reolink\detect_sounds.py` (same geometry/interactions).
- DSP constants + algorithm: identical to the CLI script for result parity.
- UI: shadcn components, sonner toasts, route config, German labels, bottom nav.

### Performance notes

- 26-min clip: decode ~1–3 s (native), DSP < 1 s, render instant.
- Memory: 26 min @16 kHz mono Float32 ≈ 100 MB — fine. Recordings > 2 h: warn but allow.

## 7. Milestones

- **M1 — Core analysis (drop → report):** analysis page, decode, DSP, report with
  scrubbing, presets, CSV export. No DB changes. Independently shippable.
- **M2 — Training integration:** save to session, history view, charts "Geräusche".
- **M3 — Polish:** long-file warning, codec error states, offline/PWA caching of the
  page, docs update (AGENTS.md).

## 8. Verification

1. `pnpm typecheck` after each change (repo workflow).
2. **Golden-file parity check:** analyze `Kamera-01-105741-112346.mp4` in the app and
   diff against the CLI `_events.csv` (107 events, 5 episodes, 35 whines, 110 s sound,
   episode 7 = 11:18:52–11:21:33). Counts and timestamps must match within rounding.
3. Manual: scrub-to-event via click; preset switching; save flow; charts show the day.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Browser AAC decode fails on some file | Page blocked | FR-2 catch → clear error + suggest CLI fallback |
| Very long recordings | Memory pressure | Warn > 2 h; camera clips are ~26 min |
| Metrics JSON grows | DB bloat | Cap stored events at 2000; totals always stored |
| Result drift vs CLI | Trust | Golden-file parity check in M1 |

## 10. Open Questions

1. Nav placement: new 5th nav item "Analyse" (proposed) vs. only reachable from "Heute"?
2. Headline chart metric: Jammern-Sekunden/Tag (proposed) — also Bellen count?
3. Store the full event list (capped) so history can re-render timelines without the
   video (proposed), or summary numbers only?
