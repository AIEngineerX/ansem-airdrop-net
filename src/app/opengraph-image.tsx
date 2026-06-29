import { ImageResponse } from "next/og";

// Branded share card (replaces the old site screenshot). Generated at build time
// as a crisp 1200×630 PNG so X/Discord/Telegram previews are clean and on-brand.
export const alt = "did ansem airdrop me? — the live on-chain map of Ansem's $ANSEM airdrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px 84px",
          color: "#ededed",
          background:
            "radial-gradient(circle at 28% 32%, rgba(177,18,38,0.40), rgba(5,5,6,0) 58%), radial-gradient(circle at 88% 92%, rgba(140,15,31,0.30), rgba(5,5,6,0) 55%), #050506",
        }}
      >
        {/* top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 22,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "#e0455a",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#e0455a",
              boxShadow: "0 0 22px 6px rgba(224,69,90,0.7)",
            }}
          />
          Unofficial · Read-only · On-chain
        </div>

        {/* title block — fixed two-line layout so the accent "?" sits right after "me" */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 116, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.02em" }}>
            <div style={{ display: "flex" }}>did ansem</div>
            <div style={{ display: "flex" }}>
              airdrop me<span style={{ color: "#e0455a" }}>?</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#a1a1aa", maxWidth: 940, lineHeight: 1.3 }}>
            The live on-chain map of every wallet Ansem&apos;s $ANSEM airdropped to — paste yours to check.
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex", color: "#ededed", fontWeight: 700 }}>didansemdrop.me</div>
          <div style={{ display: "flex", color: "#71717a" }}>$ANSEM · The Black Bull</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
