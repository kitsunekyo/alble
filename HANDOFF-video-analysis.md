# Handoff: Video-Sound-Analyse (feature/video-analysis)

Status date: 2026-10-28 · Branch: `feature/video-analysis`
PRD: `docs/PRD-video-analysis.md` · CLI reference: `C:\Users\alexa\Videos\reolink\detect_sounds.py`

## What this is

Client-side video sound analysis for the Alble app: drop a Reolink MP4 in the
browser ("Analyse", entry via Clapperboard icon on the Heute header — no bottom
nav), analyze locally (Web Audio API + ported DSP, **no upload, no WASM**), report
with timeline/hotspots/click-to-seek video scrubbing, presets
("Alle Geräusche" / "Jammern & Weinen" / "Bellen"), optional save of metrics
(no audio/video) to the training day, History card with re-rendered timeline,
Charts group "Lautäußerungen" (Jammern-Sekunden/Tag bars + Bellen line).

## Code status: COMPLETE — E2E verified, 1:1 parity with the CLI

`pnpm typecheck` clean. Committed on `feature/video-analysis` and pushed.
Not deployed (deploy is a separate, explicit step — it also auto-applies
migration `0006` to the prod Turso DB).

### Written files

- `src/shared/analysis.ts` — types + zod: `AnalysisEvent` (s/e/d/pk/hz/ty),
  `AnalysisEpisode`, `AnalysisMetrics` (events capped 2000),
  `SaveAnalysisInput`, `VideoAnalysisDTO`, `PRESETS/PRESET_LABELS`,
  `whineSecondsOf()` helper
- `src/client/lib/analysis/` — `constants.ts` (SR 16k, LEVEL -40, HYST 6,
  MIN_DUR 0.15, MERGE_GAP 0.35, EPISODE_GAP 60, bands, CONV_LEN 2048), `dsp.ts`
  (cumsum RMS frames + per-second curve), `detect.ts` (hysteresis/merge/
  episodes/classify), `classify.ts` (**exact 800-point DFT via Bluestein**, band
  shares, dominant Hz), `decode.ts` (`decodeMono16k` via
  `AudioContext({sampleRate:16000})`, OfflineAudioContext fallback), `filename.ts`
  (Reolink HHMMSS-HHMMSS parse, clock utils — **truncating** like the CLI),
  `presets.ts` (filter/summarize), `index.ts` (`analyzeVideo`, `aggregate`)
- `src/client/components/analysis/` — `Dropzone.tsx`, `PresetTabs.tsx`,
  `SummaryCards.tsx`, `TimelineChart.tsx` (SVG port; interactive with
  `videoRef`, static in History), `EventsTable.tsx` (CSV export),
  `ReportView.tsx` (presets, save flow incl. date picker)
- `src/client/pages/Analysis.tsx`, `app/analysis/page.tsx`
- `src/client/lib/routes.ts` — `/analysis` entry; `Layout.tsx` — Clapperboard
  link next to Settings on Heute header
- Server: `src/server/db/schema.ts` (`video_analyses` table),
  `drizzle/0006_familiar_human_cannonball.sql` (auto-applies at server start via
  `runMigrations`), `repo.ts` (CRUD), `api.ts` (`GET/POST /api/analyses`,
  `GET/DELETE /api/analyses/:id`)
- Client: `lib/api.ts` (saveAnalysis/listAnalyses/deleteAnalysis),
  `hooks/use-analyses.ts`
- `History.tsx` — `SessionAnalyses` card inside expanded session (matches by
  date; timeline re-render from stored events via `buildStoredCurve`; delete
  with AlertDialog)
- `Charts.tsx` + `charts/VocalizationsChart.tsx` — "Lautäußerungen pro Tag"
  (ComposedChart; respects existing date-range filter; renders when data
  exists, independent of rating filters)

## Parity: verified 1:1 against the CLI golden data

Test video: `Kamera-01-105741-112346.mp4` (26 min, 16 kHz mono AAC,
1568.8 s). Golden CSVs next to it: `_events.csv`, `_events_whine.csv`.

| metric | golden (CLI) | app (browser) |
| --- | --- | --- |
| raw detections | 145 | 145 |
| events (Alle Geräusche) | 107 | **107** |
| Bellen | 72 | **72** |
| Jammern | 35 | **35** |
| Episoden | 5 | **5** |
| wind/rumble excluded | 38 | **38** |
| total sound | 109.9 s | **110 s** (whine 77 s) |

- Episodes: `10:57:45–10:59:25 ·5`, `11:02:09–11:02:50 ·7`, `11:04:16–11:09:40 ·37`,
  `11:12:04–11:13:37 ·6`, `11:15:17–11:23:32 ·52` (17:37–25:51 video)
- "Jammern & Weinen" preset: **35 events, 8 episodes**, biggest
  `11:18:52–11:21:33` (16 ev, 43 s)
- Full-row CSV diff (start/end clock, start/end s, duration, peak dBFS,
  dominant Hz, type): **0 mismatches across all 107 rows**.

## Bugs found and fixed during E2E

1. **Band classification off by 3 events** (110/73/37/4 vs 107/72/35/5). The
   ported `classify.ts` used a 1024-point zero-padded FFT (15.625 Hz bins) while
   the CLI uses `np.fft.rfft` over the 800-sample frame (20 Hz bins) with exact
   band-edge comparisons. On identical PCM the padding shifted `lf` share by
   ~0.06–0.10, so three borderline rumble events (`lf` 0.508–0.595) were
   classified as bark/whine instead of wind — which also merged two episodes
   (the 4-vs-5 episode gap). Fixed by computing the **exact 800-point DFT via
   Bluestein's chirp-z** (2048-point convolution FFT) with exact frequency
   masks. Verified offline: 0 type flips, worst band-share delta 0.000.
2. **Clock display ±1 s vs the CLI**: `fmtClock` rounded the offset while
   Python's `strftime` truncates. Now truncates → CSV clocks match exactly.
3. **History card showed the wrong whine duration** ("35 Jammern (1m50s)" —
   it used `metrics.soundSeconds`, the total over barks *and* whines). Now uses
   the new `whineSecondsOf(metrics)` (sums stored whine events) → 1m17s,
   consistent with the report cards and the Charts bars.

## E2E checklist — all verified in Chrome

- upload + analyze `Kamera-01-105741-112346.mp4` → report in ~2 s, no uploads
- preset switching (Alle / Jammern / Bellen) → counts, rows, hotspots correct
- click a timeline dot → `video.currentTime` jumps (0 → 561 s)
- CSV export → 107 rows, headers + values match the golden CSV
- "In Trainingstag übernehmen" → toast "Analyse im Trainingstag gespeichert.",
  button → "Gespeichert" (disabled); `POST /api/analyses` 200; stored
  `soundSeconds 110, counts 72/35, episodes 5, events 107, windExcluded 38`
- History: expand the day → "LAUTÄUSSERUNGEN" card with file name, summary,
  hotspots E1–E5 and a re-rendered timeline, **no `<video>`**; delete via
  AlertDialog → 204 + card disappears
- Charts: "Lautäußerungen pro Tag" at the bottom, 1 bar (77 s) + 1 line dot (72)
- "Neues Video" → report unmounts, dropzone returns, blob URL revoked
- no console errors/exceptions on any page (the only recharts
  "width(-1)/height(-1)" warnings are pre-existing on all Charts cards —
  they also appear with zero analyses)

## Gotchas (tooling, not app)

- **Never run two dev servers on this repo at once.** They share `.next` and
  corrupt each other's Turbopack cache: the next first API request can then take
  *minutes* (`GET /api/... 200 in 3.8min`, with `next.js: 3.8min` in the log =
  compile time), every API call queues behind it, and the UI looks frozen. If a
  request hangs for minutes, kill all servers, `rm -rf .next`, start one.
  A healthy cold start compiles the API route in ~1s.
- Plain `pnpm dev` uses the **production** Turso DB from `.env`. Logging in
  there is not local testing, and `runMigrations` will apply pending migrations
  to production. For local work use
  `TURSO_DATABASE_URL=file:./data/dev.db pnpm dev` (or the script below).
- **WSL2 dev server**: launch detached from Windows:
  `Start-Process -WindowStyle Hidden wsl -ArgumentList @('-d','archlinux','--','bash','/tmp/start-alble-dev.sh')`
  (script sets `TURSO_DATABASE_URL=file:./data/test-analysis.db`, port 3100,
  log `/tmp/alble-dev.log` — dev would otherwise hit prod Turso from `.env`).
- **Fresh local DB** → the first `POST /api/auth/login` sets the password.
  The `data/` dir is gitignored; delete `data/test-analysis.db` to start over.
- **chrome-devtools MCP `upload_file` mangles Windows paths** (resolves them
  against the MCP's WSL cwd → `/home/.../C:\Users\...mp4`), so the file never
  reaches the input. Use CDP `DOM.setFileInputFiles` with the real
  `C:\...` path instead — no file-chooser dialog, no browser wedge.
- **Closing the last tab kills the agent Chrome window** (and a wedged renderer
  takes the whole browser down). Keep a spare tab; relaunch with
  `--user-data-dir=...\Temp\chrome-agent-profile` + `--remote-debugging-port=9222`
  and the anti-freeze flags (`--disable-backgrounding-occluded-windows`,
  `--disable-renderer-backgrounding`,
  `--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling`).
- Useful local harnesses (throwaway, not committed): `/tmp/opencode/e2e.mjs`
  (upload + poll), `download.mjs`, `csvdiff.mjs`, `parity.py`
  (`~/.venvs/audio/bin/python` — compares 800- vs 1024-point classification on
  identical ffmpeg PCM).

## Optional M3 polish (PRD §7, not started)

Long-file warning, codec error states, PWA offline caching, AGENTS.md docs
update, and showing the per-analysis whine-only seconds in the stored metrics
(today it's derived from `events` via `whineSecondsOf`).

## References

- PRD: `docs/PRD-video-analysis.md` (research verdict: native Web Audio, no WASM)
- CLI script + verified prototype timeline: `C:\Users\alexa\Videos\reolink\detect_sounds.py`
- App conventions: `AGENTS.md` (typecheck → commit → push; deploy only on request)
