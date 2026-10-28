# Handoff: Video-Sound-Analyse (feature/video-analysis)

Status date: 2026-10-28 · Branch: `feature/video-analysis` (from `main`, 1 commit: PRD)
PRD: `docs/PRD-video-analysis.md` · CLI reference: `C:\Users\alexa\Videos\reolink\detect_sounds.py`

## What this is

Client-side video sound analysis for the Alble app: drop a Reolink MP4 in the
browser ("Analyse", entry via Clapperboard icon on the Heute header — no bottom
nav), analyze locally (Web Audio API + ported DSP, **no upload, no WASM**), report
with timeline/hotspots/click-to-seek video scrubbing, presets
("Alle Geräusche" / "Jammern & Weinen" / "Bellen"), optional save of metrics
(no audio/video) to the training day, History card with re-rendered timeline,
Charts group "Lautäußerungen" (Jammern-Sekunden/Tag bars + Bellen line).

## Code status: COMPLETE, typechecks clean, NOT yet committed, E2E pending

`pnpm typecheck` passes. All files below are uncommitted in the working tree —
**commit them first thing** to secure the work.

### Written files

- `src/shared/analysis.ts` — types + zod: `AnalysisEvent` (s/e/d/pk/hz/ty),
  `AnalysisEpisode`, `AnalysisMetrics` (events capped 2000),
  `SaveAnalysisInput`, `VideoAnalysisDTO`, `PRESETS/PRESET_LABELS`
- `src/client/lib/analysis/` — `constants.ts` (SR 16k, LEVEL -40, HYST 6,
  MIN_DUR 0.15, MERGE_GAP 0.35, EPISODE_GAP 60, bands), `dsp.ts` (cumsum RMS
  frames + per-second curve), `detect.ts` (hysteresis/merge/episodes/classify),
  `classify.ts` (radix-2 FFT 1024 zero-padded, band shares, dominant Hz),
  `decode.ts` (`decodeMono16k` via `AudioContext({sampleRate:16000})`,
  OfflineAudioContext fallback), `filename.ts` (Reolink HHMMSS-HHMMSS parse,
  clock utils), `presets.ts` (filter/summarize), `index.ts` (`analyzeVideo`,
  `aggregate`)
- `src/client/components/analysis/` — `Dropzone.tsx`, `PresetTabs.tsx`,
  `SummaryCards.tsx`, `TimelineChart.tsx` (SVG port; interactive with
  `videoRef`, static in History), `EventsTable.tsx` (CSV export),
  `ReportView.tsx` (presets, save flow incl. date picker)
- `src/client/pages/Analysis.tsx`, `app/analysis/page.tsx`
- `src/client/lib/routes.ts` — `/analysis` entry; `Layout.tsx` — Clapperboard
  link next to Settings on Heute header
- Server: `src/server/db/schema.ts` (`video_analyses` table),
  `drizzle/0006_familiar_human_cannonball.sql` (generated, **not yet applied
  anywhere** — auto-applies at server start via `runMigrations`), `repo.ts`
  (CRUD), `api.ts` (`GET/POST /api/analyses`, `GET/DELETE /api/analyses/:id`)
- Client: `lib/api.ts` (saveAnalysis/listAnalyses/deleteAnalysis),
  `hooks/use-analyses.ts`
- `History.tsx` — `SessionAnalyses` card inside expanded session (matches by
  date; timeline re-render from stored events via `buildStoredCurve`; delete
  with AlertDialog)
- `Charts.tsx` + `charts/VocalizationsChart.tsx` — "Lautäußerungen pro Tag"
  (ComposedChart; respects existing date-range filter; renders when data
  exists, independent of rating filters)

### Gotchas already solved

- recharts 3.x `Legend` has no `payload` prop → custom legend div
- `noUncheckedIndexedAccess` → `!` assertions on typed-array reads
- WSL2: background procs die with the `wsl` session → launch dev server as
  detached Windows process (script below)
- Dev would use prod Turso from `.env` → override via process env in
  `/tmp/start-alble-dev.sh` (port 3100, `data/test-analysis.db`, log
  `/tmp/alble-dev.log`)
- A dev server may already be running from the aborted test: check
  `curl http://localhost:3100/api/health` (from Windows or WSL) before
  starting another; kill via `pkill -f "next dev"` in WSL if needed

## Next steps (in order)

1. **Commit the WIP** (`git add -A && git commit -m "Add client-side video sound analysis (M1+M2)""`),
   then continue.
2. **E2E test** (aborted mid-launch — state unknown):
   ```powershell
   Start-Process -WindowStyle Hidden wsl -ArgumentList @('-d','archlinux','--','bash','/tmp/start-alble-dev.sh')
   ```
   Wait ~10s, then open `http://localhost:3100` in Chrome. Fresh local DB →
   first login (POST /api/auth/login with a test password) creates the hash.
   Navigate: Heute header → Clapperboard → drop zone → upload
   `C:\Users\alexa\Videos\reolink\10272026\Kamera-01-105741-112346.mp4`.
3. **Parity check vs CLI golden data** (same algorithm, must match):
   - All preset: **107 events, 72 Bellen, 35 Jammern, 5 Episoden, 110s sound,
     38 wind excluded**; episode 5 = 11:15:17–11:23:32 clock (17:37–25:51 video)
   - "Jammern & Weinen" preset: 35 events, 8 episodes, biggest 11:18:52–11:21:33
   - Golden CSVs: `C:\Users\alexa\Videos\reolink\10272026\Kamera-01-105741-112346_events.csv`
     (and `_events_whine.csv`); compare timestamps/durations/peaks (FFT bins
     differ slightly: dominant Hz within ~±20 Hz, band shares approximate)
4. Test: preset switching, click-a-dot-seeks-video (video.currentTime jumps),
   CSV download, save ("In Trainingstag übernehmen") → toast; then History
   (expand the day's session → Lautäußerungen card + timeline without video),
   Charts (Lautäußerungen at bottom). Check console for errors throughout.
5. Fix anything found; `pnpm typecheck`; follow-up commits.
6. `git push -u origin feature/video-analysis`. **Deploy only when explicitly
   told** (AGENTS.md rule). Note: deploy auto-applies migration 0006 to Turso.
7. Optional M3 polish (PRD §7): long-file warning, codec error states, PWA
   offline caching, AGENTS.md docs update.

## References

- PRD: `docs/PRD-video-analysis.md` (research verdict: native Web Audio, no WASM)
- CLI script + verified prototype timeline: `C:\Users\alexa\Videos\reolink\detect_sounds.py`
- App conventions: `AGENTS.md` (typecheck → commit → push; deploy only on request)
