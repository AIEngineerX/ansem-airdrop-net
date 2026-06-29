import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Branded share card (replaces the old site screenshot). Generated at build time
// as a crisp 1200×630 PNG so X/Discord/Telegram previews are clean and on-brand.
// Design: The Black Bull as the focal element on the right, emerging from shadow;
// a faint oxblood "airdrop web" (one source → many recipients) behind the text;
// and just the question + URL. Minimal on purpose.
export const alt = "did ansem airdrop me? — the live on-chain map of Ansem's $ANSEM airdrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// black-bull-card.png is a build-prepared PNG (alpha-from-luminance, brightened)
// derived from the source bull photo so Satori can decode it and the bull reads
// against a near-black card with no visible image box.
const BULL_FILE = "black-bull-card.png";

// Faint oxblood constellation evoking the airdrop web: a single hub (Ansem's
// wallet) with thin lines fanning out to scattered recipient nodes, biased to the
// left so they sit behind the text rather than the bull. Built from absolutely
// positioned divs (Satori renders these reliably; SVG-data-URL backgrounds it
// does not).
const HUB = { x: 212, y: 252 } as const;
const NODES: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: 86, y: 150, r: 3 },
  { x: 150, y: 250, r: 3 },
  { x: 172, y: 432, r: 4 },
  { x: 250, y: 560, r: 5 },
  { x: 300, y: 250, r: 3 },
  { x: 338, y: 120, r: 3 },
  { x: 360, y: 332, r: 4 },
  { x: 432, y: 512, r: 4 },
  { x: 470, y: 206, r: 3 },
  { x: 540, y: 384, r: 5 },
  { x: 588, y: 108, r: 4 },
  { x: 360, y: 560, r: 3 },
  { x: 110, y: 360, r: 3 },
  { x: 470, y: 470, r: 3 },
  { x: 1052, y: 78, r: 4 },
  { x: 1138, y: 152, r: 3 },
];
// A few node-to-node links give the cluster a woven, web-like texture.
const WEB_LINKS: ReadonlyArray<[number, number]> = [
  [2, 6],
  [6, 9],
  [8, 10],
  [4, 6],
  [3, 7],
];

const ACCENT = "#e0455a";

function lineStyle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opacity: number,
  thickness: number,
): React.CSSProperties {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return {
    position: "absolute",
    left: x1,
    top: y1,
    width: len,
    height: thickness,
    background: ACCENT,
    opacity,
    transform: `rotate(${angle}deg)`,
    transformOrigin: "0 0",
  };
}

export default async function OpengraphImage() {
  const bullData = await readFile(join(process.cwd(), "public", BULL_FILE));
  const bullSrc = `data:image/png;base64,${bullData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          color: "#fafafa",
          // Oxblood glow on the left (behind the title) plus a soft backlight on
          // the right so the bull separates from the corner and picks up brand red.
          background:
            "radial-gradient(720px 560px at 23% 36%, rgba(177,18,38,0.42), rgba(5,5,6,0) 70%), radial-gradient(620px 560px at 84% 58%, rgba(177,18,38,0.26), rgba(5,5,6,0) 66%), #050506",
        }}
      >
        {/* faint airdrop-web motif, behind everything */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
          }}
        >
          {NODES.map((n, i) => (
            <div key={`s${i}`} style={lineStyle(HUB.x, HUB.y, n.x, n.y, 0.16, 1.3)} />
          ))}
          {WEB_LINKS.map(([a, b], i) => (
            <div
              key={`l${i}`}
              style={lineStyle(NODES[a].x, NODES[a].y, NODES[b].x, NODES[b].y, 0.1, 1.2)}
            />
          ))}
          {NODES.map((n, i) => (
            <div
              key={`d${i}`}
              style={{
                position: "absolute",
                left: n.x - n.r,
                top: n.y - n.r,
                width: n.r * 2,
                height: n.r * 2,
                borderRadius: 9999,
                background: ACCENT,
                opacity: 0.55,
              }}
            />
          ))}
          {/* hub: Ansem's wallet — the airdrop source */}
          <div
            style={{
              position: "absolute",
              left: HUB.x - 19,
              top: HUB.y - 19,
              width: 38,
              height: 38,
              borderRadius: 9999,
              border: `1.5px solid ${ACCENT}`,
              opacity: 0.4,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: HUB.x - 9,
              top: HUB.y - 9,
              width: 18,
              height: 18,
              borderRadius: 9999,
              background: ACCENT,
              opacity: 0.9,
            }}
          />
        </div>

        {/* The Black Bull — focal element, right side, bleeding off the bottom/right edges */}
        <img
          src={bullSrc}
          width={640}
          height={640}
          style={{ position: "absolute", right: -70, bottom: -28 }}
        />

        {/* content — minimal: the question + the URL */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            padding: "0 0 0 92px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
            }}
          >
            <div style={{ display: "flex" }}>did ansem</div>
            <div style={{ display: "flex" }}>
              airdrop me<span style={{ color: ACCENT }}>?</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 38,
              fontSize: 36,
              color: "#d4d4d8",
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 9999,
                background: ACCENT,
                marginRight: 16,
                boxShadow: `0 0 18px 5px rgba(224,69,90,0.6)`,
              }}
            />
            didansemdrop.me
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
