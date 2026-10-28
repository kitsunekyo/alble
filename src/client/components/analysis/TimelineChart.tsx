"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisEpisode, AnalysisEvent } from "@/shared/analysis";
import { fmtClock, fmtRel } from "@/client/lib/analysis/filename";

const W = 1400;
const H = 352;
const ML = 54;
const MR = 14;
const PW = W - ML - MR;
const MT = 24;
const CURVE_H = 186;
const CURVE_BOT = MT + CURVE_H;
const STRIP_Y = 228;
const STRIP_H = 34;
const BR_Y = 288;
const AXIS_Y = 316;
const DB_MIN = -60;
const DB_MAX = 0;

const TYPE_COLOR: Record<AnalysisEvent["ty"], string> = {
  bark: "#3b82f6",
  whine: "#ef4444",
};

interface TimelineChartProps {
  durationSeconds: number;
  level: number;
  startedAt: number | null;
  curve: number[];
  events: AnalysisEvent[];
  episodes: AnalysisEpisode[];
  /** Optional: when given, clicking seeks the video. */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function TimelineChart({
  durationSeconds,
  level,
  startedAt,
  curve,
  events,
  episodes,
  videoRef,
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const playheadLabelRef = useRef<SVGTextElement>(null);
  const [hover, setHover] = useState<{ ev: AnalysisEvent; px: number; py: number } | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);

  const dur = Math.max(durationSeconds, 1);
  const x = (t: number) => ML + (t / dur) * PW;
  const y = (db: number) => MT + (1 - (Math.max(db, DB_MIN) - DB_MIN) / (DB_MAX - DB_MIN)) * CURVE_H;

  const heat = (db: number) => {
    const t = Math.min(Math.max((db - level) / 35, 0), 1);
    return `hsl(${48 - Math.round(40 * t)},95%,${62 - Math.round(20 * t)}%)`;
  };

  // energy curve path
  const curvePath = useMemo(() => {
    if (curve.length === 0) return "";
    let p = `M${x(0.5)} ${y(curve[0]!)}`;
    for (let i = 1; i < curve.length; i++) p += `L${x(i + 0.5).toFixed(1)} ${y(curve[i]!).toFixed(1)}`;
    return p;
  }, [curve, dur]);

  // hotspot strip cells
  const strip = useMemo(() => {
    const nSec = curve.length;
    if (nSec === 0) return [] as Array<{ x: number; w: number; fill: string }>;
    const cover = new Uint8Array(nSec);
    for (const ev of events) {
      for (let i = Math.floor(ev.s); i <= Math.min(Math.floor(ev.e), nSec - 1); i++) cover[i] = 1;
    }
    const cells = Math.min(nSec, Math.floor(PW / 2.5));
    const bs = Math.ceil(nSec / cells);
    const bw = (bs / dur) * PW;
    const out: Array<{ x: number; w: number; fill: string | null }> = [];
    for (let b = 0; b * bs < nSec; b++) {
      const i0 = b * bs;
      const i1 = Math.min(i0 + bs, nSec) - 1;
      let act = false;
      let mx = -90;
      for (let i = i0; i <= i1; i++) {
        if (cover[i]) act = true;
        if (curve[i]! > mx) mx = curve[i]!;
      }
      out.push({ x: ML + b * bw, w: Math.max(bw - 0.4, 0.6), fill: act ? heat(mx) : null });
    }
    return out;
  }, [curve, events, dur, level]);

  // x axis ticks (clock + video-relative)
  const ticks = useMemo(() => {
    const totalMin = dur / 60;
    let step = 60;
    for (const s of [1, 2, 5, 10, 15, 30, 60]) {
      if (totalMin / s <= 9) {
        step = s;
        break;
      }
    }
    const out: number[] = [];
    for (let m = 0; m * 60 <= dur + 1; m += step) out.push(Math.min(m * 60, dur));
    return out;
  }, [dur]);

  const eventDots = useMemo(
    () =>
      events.map((ev) => ({
        ev,
        cx: x((ev.s + ev.e) / 2),
        cy: y(ev.pk),
        r: 2.6 + Math.min(ev.d, 6) * 1.15,
      })),
    [events, dur],
  );

  // Playhead: follows the video's current position. Updated imperatively (no
  // React state) so 60 fps scrubbing never re-renders the whole SVG.
  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    let raf = 0;

    const apply = () => {
      const g = playheadRef.current;
      if (!g) return;
      const t = Math.min(Math.max(v.currentTime || 0, 0), dur);
      const px = ML + (t / dur) * PW;
      g.setAttribute("transform", `translate(${px.toFixed(2)} 0)`);
      g.setAttribute("visibility", "visible");
      const label = playheadLabelRef.current;
      if (label) {
        label.textContent = fmtRel(t);
        // x is relative to the playhead group; flip to the right side of the
        // line when it would be clipped at the left edge of the plot.
        const left = px - 6 >= ML + 34;
        label.setAttribute("x", left ? "-6" : "6");
        label.setAttribute("text-anchor", left ? "end" : "start");
      }
    };

    const loop = () => {
      apply();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      apply();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      apply();
    };

    apply();
    v.addEventListener("timeupdate", apply);
    v.addEventListener("seeked", apply);
    v.addEventListener("loadedmetadata", apply);
    v.addEventListener("play", start);
    v.addEventListener("playing", start);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", stop);
    if (!v.paused) start();

    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("timeupdate", apply);
      v.removeEventListener("seeked", apply);
      v.removeEventListener("loadedmetadata", apply);
      v.removeEventListener("play", start);
      v.removeEventListener("playing", start);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", stop);
    };
  }, [videoRef, dur]);

  function seek(t: number) {
    const v = videoRef?.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(t, 0), dur - 0.5);
    void v.play().catch(() => {});
  }

  function svgPos(e: React.MouseEvent): number {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return (e.clientX - rect.left) * (W / rect.width);
  }

  function onMove(e: React.MouseEvent) {
    const px = svgPos(e);
    if (px < ML || px > W - MR) return;
    if (videoRef) setCursorX(px);
    // nearest event dot within 10 px
    let closest: (typeof eventDots)[number] | null = null;
    for (const d of eventDots) {
      if (!closest || Math.abs(px - d.cx) < Math.abs(px - closest.cx)) closest = d;
    }
    if (closest && Math.abs(px - closest.cx) < 10) {
      setHover({ ev: closest.ev, px: closest.cx, py: closest.cy });
    } else {
      setHover(null);
    }
  }

  function onClick(e: React.MouseEvent) {
    const px = svgPos(e);
    if (px < ML || px > W - MR) return;
    if (hover) {
      seek(hover.ev.s - 1);
      return;
    }
    seek(((px - ML) / PW) * dur);
  }

  const cursorT = cursorX === null ? null : ((cursorX - ML) / PW) * dur;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block bg-card border border-border rounded-lg"
        style={{ cursor: videoRef ? "crosshair" : "default" }}
        onMouseMove={onMove}
        onMouseLeave={() => {
          setHover(null);
          setCursorX(null);
        }}
        onClick={onClick}
      >
        {/* dB gridlines */}
        {[-60, -40, -20, 0].map((g) => (
          <g key={g}>
            <line x1={ML} x2={W - MR} y1={y(g)} y2={y(g)} className="stroke-border" strokeWidth={1} />
            <text x={ML - 6} y={y(g) + 3.5} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
              {g} dB
            </text>
          </g>
        ))}

        {/* energy curve */}
        {curvePath && (
          <>
            <path
              d={`${curvePath}L${x(curve.length - 0.5)} ${CURVE_BOT}L${x(0.5)} ${CURVE_BOT}Z`}
              className="fill-muted"
              opacity={0.5}
            />
            <path d={curvePath} fill="none" className="stroke-zinc-400" strokeWidth={1} />
          </>
        )}

        {/* threshold */}
        <line
          x1={ML}
          x2={W - MR}
          y1={y(level)}
          y2={y(level)}
          stroke="#b91c1c"
          strokeDasharray="5 4"
          strokeWidth={1}
        />
        <text x={W - MR - 2} y={y(level) - 4} textAnchor="end" fill="#b91c1c" fontSize={10}>
          Schwellwert {level} dB
        </text>

        {/* hotspot strip */}
        {strip.map((c, i) =>
          c.fill === null ? (
            <rect
              key={i}
              x={c.x.toFixed(2)}
              y={STRIP_Y}
              width={c.w.toFixed(2)}
              height={STRIP_H}
              rx={1}
              className="fill-muted"
            />
          ) : (
            <rect key={i} x={c.x.toFixed(2)} y={STRIP_Y} width={c.w.toFixed(2)} height={STRIP_H} rx={1} fill={c.fill} />
          ),
        )}
        <text x={ML - 6} y={STRIP_Y + STRIP_H / 2 + 4} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
          Hotspots
        </text>

        {/* episode brackets */}
        {episodes.map((ep, k) => {
          const x1 = x(ep.s);
          const x2 = x(ep.e);
          const lab = `E${k + 1} ${fmtClock(startedAt, ep.s)}–${fmtClock(startedAt, ep.e)} · ${ep.n} Ev · ${ep.snd}s`;
          const approx = lab.length * 5.7;
          const overflow = x1 + approx > W - MR;
          return (
            <g key={k}>
              <path
                d={`M${x1} ${BR_Y} v-6 M${x1} ${BR_Y} H${x2} M${x2} ${BR_Y} v-6`}
                className="stroke-zinc-600"
                fill="none"
                strokeWidth={1}
              />
              <text
                x={overflow ? Math.max(ML, x2 - approx) : x1}
                y={BR_Y + 13}
                className="fill-zinc-600"
                fontSize={10.5}
              >
                {lab}
              </text>
            </g>
          );
        })}

        {/* x axis */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={MT} y2={AXIS_Y} className="stroke-border" strokeWidth={1} />
            <line x1={x(t)} x2={x(t)} y1={AXIS_Y} y2={AXIS_Y + 5} className="stroke-zinc-400" strokeWidth={1} />
            <text x={x(t)} y={AXIS_Y + 17} textAnchor="middle" className="fill-foreground" fontSize={10.5}>
              {fmtClock(startedAt, t)}
            </text>
            <text x={x(t)} y={AXIS_Y + 30} textAnchor="middle" className="fill-muted-foreground" fontSize={9.5}>
              {fmtRel(t)}
            </text>
          </g>
        ))}
        <line x1={ML} x2={W - MR} y1={AXIS_Y} y2={AXIS_Y} className="stroke-zinc-300" strokeWidth={1} />

        {/* event dots */}
        {eventDots.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r.toFixed(1)}
            fill={TYPE_COLOR[d.ev.ty]}
            fillOpacity={0.78}
            stroke="white"
            strokeWidth={0.8}
          />
        ))}

        {/* cursor */}
        {cursorX !== null && (
          <g>
            <line x1={cursorX} x2={cursorX} y1={MT} y2={AXIS_Y} className="stroke-zinc-500" strokeWidth={0.7} strokeDasharray="2 3" />
            <text x={Math.min(cursorX, W - MR - 95)} y={14} className="fill-muted-foreground" fontSize={10.5}>
              {cursorT !== null && `${fmtClock(startedAt, cursorT)} (${fmtRel(cursorT)})`}
            </text>
          </g>
        )}

        {/* playhead — current video position */}
        {videoRef && (
          <g ref={playheadRef} visibility="hidden" pointerEvents="none">
            <line x1={0} x2={0} y1={MT} y2={AXIS_Y} stroke="#0284c7" strokeWidth={4} opacity={0.18} />
            <line x1={0} x2={0} y1={MT} y2={AXIS_Y} stroke="#0284c7" strokeWidth={1.5} />
            <path d={`M-4 ${MT - 7} h8 l-4 7 Z`} fill="#0284c7" />
            <text ref={playheadLabelRef} x={-6} y={12} textAnchor="end" fill="#0284c7" fontSize={10.5} fontWeight={600}>
              {fmtRel(0)}
            </text>
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hover && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 text-white rounded-md px-2.5 py-1.5 text-xs leading-relaxed shadow-lg"
          style={{
            left: `${(hover.px / W) * 100}%`,
            top: `${(hover.py / H) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          <b style={{ color: hover.ev.ty === "whine" ? "#f87171" : "#60a5fa" }}>
            {hover.ev.ty === "whine" ? "Jaulen/Weinen" : "Winseln"}
          </b>
          <br />
          {fmtClock(startedAt, hover.ev.s)} – {fmtClock(startedAt, hover.ev.e)} (Video {fmtRel(hover.ev.s)})
          <br />
          {hover.ev.d.toFixed(1)}s · Peak {hover.ev.pk} dB · {hover.ev.hz} Hz
        </div>
      )}

      {/* legend */}
      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: TYPE_COLOR.bark }} />
          Winseln (kurz/breitbandig)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: TYPE_COLOR.whine }} />
          Jaulen/Weinen (tonal/anhaltend)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-8 rounded-sm"
            style={{ background: "linear-gradient(90deg,hsl(48,95%,62%),hsl(8,85%,42%))" }}
          />
          leise → laut
        </span>
        {videoRef && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-0.5 rounded-sm" style={{ background: "#0284c7" }} />
            aktuelle Videoposition
          </span>
        )}
        {videoRef && <span>· Punkt antippen um im Video dorthin zu springen</span>}
      </div>
    </div>
  );
}
