"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { buildGraphModel, short, type GraphNode } from "@/lib/airdrop-view";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

/* Client-only lazy import of react-force-graph-2d.
   next/dynamic does NOT forward refs in this Next version, and we need the
   instance ref (force tuning + zoomToFit), so we load the real forwardRef
   component on the client ourselves. The module touches `window`, so it must
   never be imported at module top (it would break SSR of this client comp). */
type GraphComponent = (typeof import("react-force-graph-2d"))["default"];
type FGNode = GraphNode & { x?: number; y?: number; vx?: number; vy?: number; fx?: number; fy?: number };
type Hover = { id: string; src: boolean } | null;

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

// ── Ember colour ramp: dim oxblood → accent → accent-soft → white-hot ────────
const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [120, 26, 35]],
  [0.4, [177, 18, 38]],
  [0.72, [224, 69, 90]],
  [1.0, [255, 226, 216]],
];
function emberColor(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (x >= STOPS[i][0] && x <= STOPS[i + 1][0]) { lo = STOPS[i]; hi = STOPS[i + 1]; break; }
  }
  const span = hi[0] - lo[0] || 1;
  const f = (x - lo[0]) / span;
  const c = (a: number, b: number) => Math.round(a + (b - a) * f);
  return `rgb(${c(lo[1][0], hi[1][0])},${c(lo[1][1], hi[1][1])},${c(lo[1][2], hi[1][2])})`;
}

const idOf = (v: unknown): string =>
  typeof v === "object" && v !== null ? String((v as { id?: unknown }).id) : String(v);

function tip(kind: string, line: string, sub: string): string {
  return (
    `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(8,6,7,0.94);` +
    `border:1px solid rgba(224,69,90,0.35);border-radius:9px;padding:7px 10px;` +
    `box-shadow:0 10px 34px rgba(0,0,0,0.65);backdrop-filter:blur(4px)">` +
    `<div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#e0455a">${kind}</div>` +
    `<div style="margin-top:3px;font-size:12px;color:#ededed">${line}</div>` +
    `<div style="margin-top:2px;font-size:11px;color:#a1a1aa">${sub}</div></div>`
  );
}

export function AirdropGraph({ snap, loading }: { snap: AirdropSnapshot; loading?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 0, h: 520 });
  const [hover, setHover] = useState<Hover>(null);
  const [Graph, setGraph] = useState<GraphComponent | null>(null);

  // Load the canvas library on the client only.
  useEffect(() => {
    let alive = true;
    import("react-force-graph-2d").then((m) => { if (alive) setGraph(() => m.default); });
    return () => { alive = false; };
  }, []);

  // Responsive stage sizing.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = w < 640 ? 460 : Math.min(Math.round(w * 0.62), 600);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = size.w > 0 && size.w < 640;
  const data = useMemo(() => buildGraphModel(snap, isMobile ? 120 : 300), [snap, isMobile]);
  const hasData = useMemo(() => data.nodes.some((n) => n.kind === "recipient"), [data]);
  const maxUi = useMemo(
    () => data.nodes.reduce((m, n) => (n.kind === "recipient" ? Math.max(m, n.ansemUi) : m), 1),
    [data],
  );
  // Smallest gift in the model — the log floor for the perceptual size/colour
  // scale below. (Math.min over recipients; falls back to 1 if none.)
  const minUi = useMemo(
    () => data.nodes.reduce((m, n) => (n.kind === "recipient" ? Math.min(m, n.ansemUi) : m), Infinity),
    [data],
  );

  // Single source of truth for the galaxy's outer radius. Every non-source node
  // is hard-clamped to this radius by a custom force (below), and the camera
  // frames exactly this circle — so nothing can drift past the frame and streak
  // off the bottom edge. `frameTarget` is the zoom that maps the radius to ~80%
  // of the limiting half-dimension (height on the wide desktop stage, width on
  // the narrow mobile one), leaving ~20% breathing room for node glow + labels.
  const galaxyR = isMobile ? 126 : 158;
  const frameTarget = ((isMobile ? size.w : size.h) * 0.5 * 0.8) / galaxyR;

  // Per-node visual style (radius, ember colour, glow flag) — computed once per model.
  // The gift distribution is extreme (7 whales at 3.7M–10M vs ~695 community
  // wallets at ~1.7K–10K), so a linear/sqrt map on amount/max collapses the
  // whole community into one minimum-size dot. We size on a LOG scale instead:
  // `u` is each gift's position within [log(min) … log(max)], so every order of
  // magnitude gets equal visual room. That keeps the whales clearly dominant
  // while spreading real, perceptible variation across the long tail. Radius is
  // hard-capped at rMax so a 10M node can't blow out the frame.
  const style = useMemo(() => {
    const recips = data.nodes.filter((n) => n.kind === "recipient");
    const hotCount = isMobile ? 6 : 14;
    const lo = Math.log(Math.max(Number.isFinite(minUi) ? minUi : 1, 1));
    const hi = Math.log(Math.max(maxUi, Math.exp(lo) + 1));
    const span = hi - lo || 1;
    const rMin = isMobile ? 1.4 : 1.6;
    const rMax = isMobile ? 7.5 : 9.5;
    const m = new Map<string, { r: number; fill: string; hot: boolean }>();
    recips.forEach((n, i) => {
      const u = Math.min(1, Math.max(0, (Math.log(Math.max(n.ansemUi, 1)) - lo) / span));
      m.set(n.id, {
        r: rMin + (rMax - rMin) * u,
        // Colour on the same log axis (gently lifted) so the tail isn't a flat
        // oxblood wash: community embers warm through the ramp, whales go white-hot.
        fill: emberColor(Math.pow(u, 0.7)),
        hot: i < hotCount,
      });
    });
    return m;
  }, [data, isMobile, maxUi, minUi]);

  // Layout forces: a compact, layered halo around GV6U. The bull is pinned at
  // the origin (the gravitational anchor — and a stable frame centre). Spoke
  // length varies with amount so the largest recipients orbit close in and the
  // long tail forms outer rings — depth, not a packed disk — but kept tight
  // enough that the web fills the stage with no far-flung stragglers.
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    const src = data.nodes.find((n) => n.kind === "source") as FGNode | undefined;
    if (src) { src.fx = 0; src.fy = 0; }
    const charge = fg.d3Force("charge");
    if (charge) { charge.strength(isMobile ? -34 : -42); charge.distanceMax?.(isMobile ? 200 : 230); }
    const link = fg.d3Force("link");
    if (link) {
      link.strength?.(0.5);
      link.distance?.((l: LinkObject) => {
        const tgt = l.target;
        const node = typeof tgt === "object" && tgt !== null ? (tgt as FGNode) : null;
        if (!node) return 80;
        if (node.kind === "cluster") return isMobile ? 116 : 150;
        const t = Math.min(1, (node.ansemUi ?? 0) / maxUi);
        return (isMobile ? 48 : 62) + (isMobile ? 46 : 58) * (1 - Math.sqrt(t));
      });
    }
    // Hard radial clamp: keep every recipient/cluster node inside the galaxy
    // radius so long-tail stragglers (which charge repulsion would otherwise
    // fling past distanceMax) can't settle below the frame and render as the
    // vertical flow-particle streaks that bled off the bottom edge. The source
    // stays pinned at the origin; anything crossing the boundary is pulled back
    // onto the circle and its outward velocity is damped to avoid jitter.
    const R = galaxyR;
    fg.d3Force("bound", () => {
      for (const node of data.nodes) {
        const n = node as FGNode;
        if (n.kind === "source") continue;
        const x = n.x ?? 0, y = n.y ?? 0;
        const d = Math.hypot(x, y);
        if (d > R) {
          const s = R / d;
          n.x = x * s; n.y = y * s;
          if (typeof n.vx === "number") n.vx *= 0.25;
          if (typeof n.vy === "number") n.vy *= 0.25;
        }
      }
    });
    fg.d3ReheatSimulation?.();
  }, [Graph, data, isMobile, maxUi, galaxyR]);

  // Deterministic framing: GV6U is pinned at the origin, so centre on it and
  // zoom so the clamped galaxy radius fills ~80% of the limiting half-dimension.
  // Because every node is hard-clamped within `galaxyR`, this frames the whole
  // web with breathing room — no stragglers bleeding off the edges.
  useEffect(() => {
    if (!Graph || size.w === 0) return;
    const frame = () => {
      const fg = fgRef.current; if (!fg) return;
      fg.centerAt?.(0, 0, 500);
      fg.zoom?.(frameTarget, 500);
    };
    const id = setTimeout(frame, 120);
    return () => clearTimeout(id);
  }, [Graph, size.w, size.h, isMobile, frameTarget]);

  const recipientCount = snap.totals.uniqueRecipients;

  // Particle COUNT must keep a stable identity across hover re-renders. The
  // underlying force-graph re-emits every particle from the start whenever this
  // accessor is re-applied, so an inline function (new identity each render)
  // makes the flow animation visibly restart on hover. Memoise it; the
  // hover-dependent colour/width accessors below can stay inline (they only
  // affect drawing, not particle emission). Mobile emits none (battery).
  const linkParticles = useCallback(
    (link: LinkObject) => {
      if (isMobile) return 0;
      const tgt = link.target;
      const node = typeof tgt === "object" && tgt !== null ? (tgt as FGNode) : null;
      if (!node) return 2;
      if (node.kind === "cluster") return 4;
      const t = Math.min(1, (node.ansemUi ?? 0) / maxUi);
      return 1 + Math.round(3 * Math.sqrt(t));
    },
    [isMobile, maxUi],
  );

  // Particle COLOUR is likewise kept hover-independent and stable, so no
  // particle-system prop is ever re-applied on hover (which would restart the
  // flow). Hovered links still stand out via linkColor/linkWidth below.
  const particleColor = useCallback(
    (link: LinkObject) => {
      const tgt = link.target;
      const node = typeof tgt === "object" && tgt !== null ? (tgt as FGNode) : null;
      const t = node ? Math.min(1, (node.ansemUi ?? 0) / maxUi) : 0;
      return t > 0.55 ? "#ff8088" : "rgba(224,69,90,0.92)";
    },
    [maxUi],
  );

  return (
    <div
      ref={wrap}
      className="graph-stage w-full border border-white/[0.07]"
      style={{ height: size.h }}
      role="img"
      aria-label={`Network graph: GV6U airdropped $ANSEM to ${snap.totals.uniqueRecipients} wallets`}
    >
      {/* Black Bull brand atmosphere — sits behind the canvas (see .graph-bull in globals.css) */}
      <div className="graph-bull" aria-hidden="true" />

      {/* corner captions */}
      <div className="graph-overlay left-4 top-4 sm:left-5 sm:top-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">Airdrop web</p>
        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
          GV6U → {fmt(recipientCount)} wallet{recipientCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="graph-overlay bottom-4 left-4 hidden items-center gap-4 sm:flex">
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-full bg-[#e0455a] shadow-[0_0_8px_2px_rgba(224,69,90,0.6)]" />
          GV6U source
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#b11226]" />
          recipient · size = ANSEM received
        </span>
      </div>

      {!hasData && (
        <div className="graph-overlay inset-0 flex items-center justify-center">
          {loading === false && snap.totals.totalAirdrops === 0 ? (
            <p role="status" aria-live="polite" className="text-sm text-zinc-500">Airdrop data is temporarily unavailable — check back shortly.</p>
          ) : (
            <p role="status" aria-live="polite" className="animate-pulse text-sm text-zinc-500">Loading the airdrop map…</p>
          )}
        </div>
      )}

      {Graph && size.w > 0 && hasData && (
        <Graph
          ref={fgRef}
          graphData={data}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          // Desktop keeps the always-on redraw for the pulse + flow particles.
          // Mobile lets the canvas park once the layout settles (battery/heat),
          // which is safe because particles are disabled on mobile below.
          autoPauseRedraw={isMobile}
          warmupTicks={isMobile ? 20 : 30}
          cooldownTicks={140}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.42}
          // Clamp the camera to the framed scale: can't shrink the web to a dot
          // (minZoom sat far below the framing zoom before) or zoom past readable.
          minZoom={frameTarget * 0.7}
          maxZoom={frameTarget * 4}
          enableNodeDrag={false}
          onEngineStop={() => {
            const fg = fgRef.current; if (!fg) return;
            fg.centerAt?.(0, 0, 600);
            fg.zoom?.(frameTarget, 600);
          }}
          linkColor={(link: LinkObject) => {
            if (!hover || hover.src) return "rgba(177,18,38,0.14)";
            const s = idOf(link.source), t = idOf(link.target);
            return s === hover.id || t === hover.id ? "rgba(224,69,90,0.85)" : "rgba(177,18,38,0.025)";
          }}
          linkWidth={(link: LinkObject) =>
            hover && !hover.src && (idOf(link.source) === hover.id || idOf(link.target) === hover.id) ? 1.7 : 0.5
          }
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={2.2}
          linkDirectionalParticleSpeed={0.0045}
          linkDirectionalParticleColor={particleColor}
          onNodeHover={(node: NodeObject | null) => {
            const n = node as FGNode | null;
            setHover(n ? { id: String(n.id), src: n.kind === "source" } : null);
          }}
          onNodeClick={(node: NodeObject) => {
            // Select/highlight only — never move the camera. Panning + zooming
            // the canvas under a stationary cursor was disorienting ("centers,
            // then the mouse is off it") and shoved the web off-frame. Setting
            // hover also gives touch devices a tap-to-reveal label.
            const n = node as FGNode;
            setHover({ id: String(n.id), src: n.kind === "source" });
          }}
          nodeLabel={(node: NodeObject) => {
            const n = node as FGNode;
            if (n.kind === "source") return tip("GV6U · Ansem", "Creator wallet", `${fmt(n.ansemUi)} ANSEM distributed`);
            if (n.kind === "cluster") return tip("Smaller recipients", n.label, `${fmt(n.ansemUi)} ANSEM combined`);
            return tip("Recipient", short(String(n.id)), `${fmt(n.ansemUi)} ANSEM received`);
          }}
          nodePointerAreaPaint={(node: NodeObject, color: string, ctx: CanvasRenderingContext2D, scale: number) => {
            const n = node as FGNode;
            const k = 1 / (Number.isFinite(scale) && scale > 0 ? scale : 1);
            const x = Number.isFinite(n.x) ? (n.x as number) : 0;
            const y = Number.isFinite(n.y) ? (n.y as number) : 0;
            const r = n.kind === "source" ? 15 * k : n.kind === "cluster" ? 8 * k : ((style.get(n.id)?.r ?? 3) + 1.5) * k;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
          }}
          nodeCanvasObject={(node: NodeObject, ctx: CanvasRenderingContext2D, scale: number) => {
            const n = node as FGNode;
            // Guard: the engine can hand us a transient non-finite globalScale or
            // un-positioned (NaN) coords on the first frames after a reheat/reframe.
            // createRadialGradient/arc throw on non-finite input, which would blank
            // the whole canvas — so clamp to safe finite values.
            const k = 1 / (Number.isFinite(scale) && scale > 0 ? scale : 1);
            const x = Number.isFinite(n.x) ? (n.x as number) : 0;
            const y = Number.isFinite(n.y) ? (n.y as number) : 0;
            const dim = !!hover && !hover.src && n.kind !== "source" && hover.id !== String(n.id);
            ctx.save();
            ctx.globalAlpha = dim ? 0.16 : 1;

            if (n.kind === "source") {
              const now = typeof performance !== "undefined" ? performance.now() : Date.now();
              const pulse = 0.5 - 0.5 * Math.cos(((now % 3600) / 3600) * Math.PI * 2);
              const R = (13 + pulse * 2.4) * k;
              ctx.shadowColor = "#b11226";
              ctx.shadowBlur = (30 + pulse * 14) * k;
              const halo = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 3.2);
              halo.addColorStop(0, `rgba(224,69,90,${0.3 + pulse * 0.12})`);
              halo.addColorStop(0.5, "rgba(177,18,38,0.12)");
              halo.addColorStop(1, "rgba(177,18,38,0)");
              ctx.beginPath(); ctx.arc(x, y, R * 3.2, 0, 2 * Math.PI); ctx.fillStyle = halo; ctx.fill();
              ctx.shadowBlur = 0;
              const disc = ctx.createRadialGradient(x - R * 0.25, y - R * 0.25, R * 0.1, x, y, R);
              disc.addColorStop(0, "#ff8a98");
              disc.addColorStop(0.45, "#e0455a");
              disc.addColorStop(1, "#8c0f1f");
              ctx.beginPath(); ctx.arc(x, y, R, 0, 2 * Math.PI); ctx.fillStyle = disc; ctx.fill();
              ctx.lineWidth = 1.2 * k; ctx.strokeStyle = "rgba(255,210,205,0.5)"; ctx.stroke();
              ctx.font = `600 ${11 * k}px ui-monospace, monospace`;
              ctx.textAlign = "center"; ctx.textBaseline = "top";
              ctx.fillStyle = "rgba(237,237,237,0.88)"; ctx.fillText("GV6U", x, y + R + 6 * k);
            } else if (n.kind === "cluster") {
              const r = 7 * k;
              ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(138,143,152,0.1)"; ctx.fill();
              ctx.lineWidth = 1.1 * k; ctx.setLineDash([3 * k, 2.5 * k]);
              ctx.strokeStyle = "rgba(176,181,189,0.55)"; ctx.stroke(); ctx.setLineDash([]);
              ctx.font = `${10 * k}px ui-monospace, monospace`;
              ctx.textAlign = "center"; ctx.textBaseline = "top";
              ctx.fillStyle = "rgba(161,161,170,0.85)"; ctx.fillText(n.label, x, y + r + 3 * k);
            } else {
              const st = style.get(n.id);
              const r = (st?.r ?? 3) * k;
              if (st?.hot) { ctx.shadowColor = "#e0455a"; ctx.shadowBlur = (st.r * 2) * k; }
              ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
              ctx.fillStyle = st?.fill ?? "#b11226"; ctx.fill();
              ctx.shadowBlur = 0;
              if (st?.hot) {
                ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, 2 * Math.PI);
                ctx.fillStyle = "rgba(255,238,232,0.92)"; ctx.fill();
              }
              if (hover && hover.id === String(n.id)) {
                ctx.globalAlpha = 1;
                ctx.beginPath(); ctx.arc(x, y, r + 3 * k, 0, 2 * Math.PI);
                ctx.lineWidth = 1 * k; ctx.strokeStyle = "rgba(224,69,90,0.9)"; ctx.stroke();
                ctx.font = `${10.5 * k}px ui-monospace, monospace`;
                ctx.textAlign = "center"; ctx.textBaseline = "top";
                ctx.fillStyle = "rgba(237,237,237,0.92)"; ctx.fillText(short(String(n.id)), x, y + r + 5 * k);
              }
            }
            ctx.restore();
          }}
        />
      )}
    </div>
  );
}
