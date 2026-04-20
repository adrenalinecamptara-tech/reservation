"use client";

import { useState } from "react";

interface Segment {
  source: string;
  count: number;
  percent: number;
}

// Fixed colors per source — fallback for unknown sources
const SOURCE_COLORS: Record<string, string> = {
  Instagram: "#e1306c",
  YouTube: "#e8503a",
  TikTok: "#a78bfa",
  Facebook: "#3b82f6",
  "Google pretraga": "#16a34a",
  "Naš sajt": "#38bdf8",
  "Booking.com / Airbnb": "#0ea5e9",
  "Preporuka prijatelja": "#f472b6",
  "AI pretraga (ChatGPT, Gemini...)": "#94a3b8",
  "Ponovo dolazim": "#3aaa70",
  Nepoznato: "#4a5568",
  Drugo: "#e8a030",
};
const FALLBACK_COLORS = ["#4f9bbf", "#9b6bd9", "#c44a5a", "#3a9090", "#d4a017"];

function getColor(source: string, idx: number): string {
  return SOURCE_COLORS[source] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegment(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, endAngle);
  const is = polarToCartesian(cx, cy, innerR, startAngle);
  const ie = polarToCartesian(cx, cy, innerR, endAngle);
  const la = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${os.x.toFixed(3)} ${os.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${la} 1 ${oe.x.toFixed(3)} ${oe.y.toFixed(3)}`,
    `L ${ie.x.toFixed(3)} ${ie.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${la} 0 ${is.x.toFixed(3)} ${is.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export function ReferralWheel({ stats }: { stats: Segment[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = stats.reduce((s, x) => s + x.count, 0);

  const CX = 100,
    CY = 100,
    OUTER = 76,
    INNER = 50,
    OUTER_ACTIVE = 82;
  const GAP = 1.8;

  let angle = 0;
  const segments = stats.map((s, i) => {
    const sweep = (s.count / total) * 360;
    const start = angle + GAP / 2;
    const end = angle + sweep - GAP / 2;
    angle += sweep;
    return { ...s, start, end, color: getColor(s.source, i) };
  });

  const active = activeIdx !== null ? segments[activeIdx] : null;

  if (total === 0) {
    return (
      <p
        style={{
          color: "rgba(168,213,213,0.4)",
          fontSize: 13,
          textAlign: "center",
          padding: "24px 0",
        }}
      >
        Nema podataka
      </p>
    );
  }

  return (
    <>
      <div className="rw-wrap">
        {/* SVG donut */}
        <div className="rw-chart-wrap">
          <svg viewBox="0 0 200 200" className="rw-svg">
            {segments.map((seg, i) => {
              if (seg.end <= seg.start) return null;
              const isActive = activeIdx === i;
              const outerR = isActive ? OUTER_ACTIVE : OUTER;
              return (
                <path
                  key={seg.source}
                  d={donutSegment(CX, CY, outerR, INNER, seg.start, seg.end)}
                  fill={seg.color}
                  opacity={activeIdx !== null && !isActive ? 0.35 : 1}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                />
              );
            })}

            {/* Center text */}
            {active ? (
              <>
                <text
                  x="100"
                  y="93"
                  textAnchor="middle"
                  fill={active.color}
                  fontSize="24"
                  fontWeight="700"
                  fontFamily="Cormorant Garamond, serif"
                >
                  {active.count}
                </text>
                <text
                  x="100"
                  y="109"
                  textAnchor="middle"
                  fill="rgba(168,213,213,0.6)"
                  fontSize="10"
                >
                  {active.percent}%
                </text>
              </>
            ) : (
              <>
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  fill="#e8f5f5"
                  fontSize="28"
                  fontWeight="700"
                  fontFamily="Cormorant Garamond, serif"
                >
                  {total}
                </text>
                <text
                  x="100"
                  y="111"
                  textAnchor="middle"
                  fill="rgba(168,213,213,0.4)"
                  fontSize="8.5"
                  letterSpacing="0.09em"
                >
                  REZERVACIJA
                </text>
              </>
            )}
          </svg>

          {/* Tooltip pill below chart */}
          <div className={`rw-tooltip${active ? " rw-tooltip--visible" : ""}`}>
            {active && (
              <>
                <span
                  className="rw-tip-dot"
                  style={{ background: active.color }}
                />
                <span className="rw-tip-name">{active.source}</span>
                <span className="rw-tip-count">{active.count} rez.</span>
                <span className="rw-tip-pct">{active.percent}%</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="rw-legend">
          {segments.map((seg, i) => (
            <div
              key={seg.source}
              className={`rw-leg-row${activeIdx === i ? " rw-leg-row--active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            >
              <span className="rw-leg-dot" style={{ background: seg.color }} />
              <span className="rw-leg-label">{seg.source}</span>
              <span className="rw-leg-count" style={{ color: seg.color }}>
                {seg.count}
              </span>
              <span className="rw-leg-pct">{seg.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .rw-wrap {
          display: flex;
          gap: 32px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .rw-chart-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .rw-svg {
          width: 200px;
          height: 200px;
          overflow: visible;
        }
        .rw-tooltip {
          height: 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          background: rgba(10,25,25,0.95);
          border: 1px solid rgba(62,140,140,0.2);
          border-radius: 20px;
          font-size: 12px;
          color: #e8f5f5;
          opacity: 0;
          transition: opacity 0.15s;
          white-space: nowrap;
          min-width: 180px;
          justify-content: center;
        }
        .rw-tooltip--visible { opacity: 1; }
        .rw-tip-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .rw-tip-name { font-weight: 600; flex: 1; }
        .rw-tip-count { color: rgba(168,213,213,0.7); }
        .rw-tip-pct { font-weight: 600; }

        .rw-legend {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 200px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .rw-leg-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s, opacity 0.12s;
          border: 1px solid transparent;
        }
        .rw-leg-row:hover { background: rgba(62,140,140,0.08); border-color: rgba(62,140,140,0.15); }
        .rw-leg-row--active { background: rgba(62,140,140,0.1); border-color: rgba(62,140,140,0.2); }
        .rw-leg-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .rw-leg-label {
          font-size: 13px;
          color: rgba(232,245,245,0.85);
          flex: 1;
        }
        .rw-leg-count {
          font-size: 13px;
          font-weight: 700;
          font-family: 'Cormorant Garamond', serif;
        }
        .rw-leg-pct {
          font-size: 11px;
          color: rgba(168,213,213,0.45);
          min-width: 30px;
          text-align: right;
        }
        @media (max-width: 600px) {
          .rw-wrap { justify-content: center; }
          .rw-legend { max-height: none; min-width: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
