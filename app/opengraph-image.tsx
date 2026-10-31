import { ImageResponse } from "next/og";

// The card shown when a RecoveryOS link is shared (WhatsApp, LinkedIn, X...).
// Built once at build time from the brand palette; uses next/og's bundled
// Geist, since the image renderer cannot read the site's WOFF2 fonts.

export const alt = "RecoveryOS: find the path back to your assets. IEPF claims, prepared with you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#05080E";
const FG = "#E8EEF7";
const FG2 = "#A9B6CB";
const FG3 = "#8593AA";
const CYAN = "#00F2FE";
const BLUE = "#4FACFE";
const EMERALD = "#10B981";

export default function Image() {
  const grid = [];
  for (let x = 48; x < 1200; x += 48)
    grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={630} />);
  for (let y = 48; y < 630; y += 48)
    grid.push(<line key={`y${y}`} x1={0} y1={y} x2={1200} y2={y} />);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: INK,
      }}
    >
      {/* Light falling on the route, as on the landing hero. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          backgroundImage:
            "radial-gradient(circle at 80% 38%, rgba(0,242,254,0.16), transparent 42%), radial-gradient(circle at 6% 104%, rgba(79,172,254,0.14), transparent 46%)",
        }}
      />
      <svg
        width="1200"
        height="630"
        style={{ position: "absolute", top: 0, left: 0 }}
        stroke="rgba(232,238,247,0.045)"
        strokeWidth="1"
      >
        {grid}
      </svg>

      {/* The route: it wanders, turns back, and ends at a lit point. */}
      <svg width="1200" height="630" style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient
            id="route"
            x1="640"
            y1="0"
            x2="1140"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={BLUE} stopOpacity="0" />
            <stop offset="0.45" stopColor={BLUE} stopOpacity="0.9" />
            <stop offset="1" stopColor={CYAN} />
          </linearGradient>
        </defs>
        <path
          d="M640 250 C 760 205, 812 200, 846 256 S 900 330, 968 300 S 1040 268, 1070 330 S 1100 420, 1114 452"
          fill="none"
          stroke="url(#route)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="1114" cy="452" r="30" fill={EMERALD} fillOpacity="0.12" />
        <circle
          cx="1114"
          cy="452"
          r="17"
          fill="none"
          stroke={EMERALD}
          strokeOpacity="0.7"
          strokeWidth="2"
        />
        <circle cx="1114" cy="452" r="8" fill={EMERALD} />
      </svg>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "60px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="46" height="46" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12.5" stroke={FG} strokeOpacity="0.5" strokeWidth="1.25" />
            <path
              d="M8.5 18.5V11a3.5 3.5 0 0 1 3.5-3.5h3.5a3.5 3.5 0 0 1 0 7H12l5.5 5.5"
              stroke={FG}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="18.5" cy="20" r="1.75" fill={CYAN} />
          </svg>
          <div style={{ display: "flex", fontSize: 34, color: FG, letterSpacing: -0.5 }}>
            RecoveryOS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 12,
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(232,238,247,0.14)",
              backgroundColor: "rgba(13,20,36,0.7)",
              fontSize: 22,
              color: FG2,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: CYAN }} />
            IEPF claims, prepared with you
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 26,
              fontSize: 78,
              lineHeight: 1.04,
              letterSpacing: -2.6,
              color: FG,
            }}
          >
            <div style={{ display: "flex" }}>
              <span>Find the&nbsp;</span>
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, ${CYAN}, ${BLUE})`,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                path back
              </span>
            </div>
            <div style={{ display: "flex" }}>to your assets.</div>
            <div style={{ display: "flex", color: FG3 }}>See every step.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 34, fontSize: 24, color: FG2 }}>
          <span>No upfront fee</span>
          <span style={{ color: FG3 }}>·</span>
          <span>We never ask for OTPs</span>
          <span style={{ color: FG3 }}>·</span>
          <span>No sign-up to check</span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
