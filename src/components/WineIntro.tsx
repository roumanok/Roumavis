"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const TAPS_TO_FILL = 7;
// Wine level range inside the bowl (SVG viewBox units).
const LEVEL_TOP = 48,
  LEVEL_BOTTOM = 172;
const LINES = [
  "Tocá la copa",
  "Un poquito más…",
  "Eso.",
  "Seguí, seguí.",
  "Casi…",
  "Un último toque",
  "Ya está casi llena",
];
const BOWL = "M98 40 H202 C204 92 196 150 150 170 C104 150 96 92 98 40 Z";
const HEART =
  "M150 262 C 80 212 30 170 30 110 C 30 72 58 46 92 46 C 118 46 138 60 150 82 C 162 60 182 46 208 46 C 242 46 270 72 270 110 C 270 170 220 212 150 262 Z";

type Phase = "glass" | "to-heart" | "heart" | "to-logo" | "logo";

/**
 * Opening ritual: tap an empty glass until it fills with wine, it turns into
 * a beating heart, and tapping the heart reveals the logo and `children`.
 */
export default function WineIntro({ children }: { children: ReactNode }) {
  const [taps, setTaps] = useState(0),
    [phase, setPhase] = useState<Phase>("glass"),
    [pulse, setPulse] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) =>
    timers.current.push(setTimeout(fn, ms));

  function tap() {
    if (phase === "glass") {
      const n = Math.min(TAPS_TO_FILL, taps + 1);
      setTaps(n);
      setPulse((p) => p + 1);
      if (n >= TAPS_TO_FILL) {
        later(() => setPhase("to-heart"), 420);
        later(() => setPhase("heart"), 1300);
      }
    } else if (phase === "heart") {
      setPhase("to-logo");
      later(() => setPhase("logo"), 700);
    }
  }

  const y = LEVEL_BOTTOM - ((LEVEL_BOTTOM - LEVEL_TOP) * taps) / TAPS_TO_FILL;
  const showGlass = phase === "glass" || phase === "to-heart";
  const showHeart = phase === "heart" || phase === "to-logo";
  const done = phase === "logo";

  const caption =
    phase === "glass"
      ? LINES[Math.min(taps, LINES.length - 1)]
      : phase === "to-heart"
        ? "Llena de vino…"
        : phase === "heart"
          ? "Tocá el corazón"
          : "";
  const hint =
    phase === "glass"
      ? taps === 0
        ? "y serviime un poco de vino"
        : taps === 1
          ? "seguí tocando"
          : ""
      : phase === "to-heart"
        ? "y de nosotros"
        : "";

  return (
    <div className="wine-intro">
      <div
        className={`wine-stage${done ? " is-done" : ""}`}
        role={done ? undefined : "button"}
        tabIndex={done ? -1 : 0}
        aria-label={
          phase === "glass"
            ? "Tocá para llenar la copa"
            : phase === "heart"
              ? "Tocá el corazón"
              : undefined
        }
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tap();
          }
        }}
      >
        {showGlass && (
          <svg
            className={`wine-layer wine-glass${pulse ? (pulse % 2 ? " tap-a" : " tap-b") : ""}${phase === "to-heart" ? " leaving" : ""}`}
            viewBox="0 0 300 300"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="wine-bowl">
                <path d={BOWL} />
              </clipPath>
              <linearGradient id="wine-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7A2A3D" />
                <stop offset="1" stopColor="#581C2B" />
              </linearGradient>
            </defs>
            <path
              d={BOWL}
              fill="#ffffff55"
              stroke="#581C2B"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g clipPath="url(#wine-bowl)">
              <rect
                className="wine-fill"
                x="60"
                y={y}
                width="180"
                height={LEVEL_BOTTOM + 20 - y}
                fill="url(#wine-grad)"
              />
              {taps > 0 && (
                <path
                  className={`wine-wave ${pulse % 2 ? "slosh-a" : "slosh-b"}`}
                  d="M60 0 Q 82 -7 105 0 T 150 0 T 195 0 T 240 0 V 12 H 60 Z"
                  fill="#7A2A3D"
                  transform={`translate(0 ${y})`}
                />
              )}
              <path
                d="M110 48 C108 85 112 120 134 150"
                stroke="#ffffff66"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
            <path
              d="M150 170 V 238"
              stroke="#581C2B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M112 246 C120 236 180 236 188 246 Q150 254 112 246 Z"
              fill="#581C2B"
            />
          </svg>
        )}
        {showHeart && (
          <svg
            className={`wine-layer wine-heart${phase === "to-logo" ? " leaving" : " beat"}`}
            viewBox="0 0 300 300"
            aria-hidden="true"
          >
            <path d={HEART} fill="#581C2B" />
            <path
              d="M78 92 C 68 100 62 112 62 126"
              stroke="#ffffff66"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
        {done && (
          <img
            className="wine-layer wine-logo"
            src="/logo_roumavis.png"
            alt="Roumavis: nosotros dos"
            width={500}
            height={500}
          />
        )}
      </div>
      {done ? (
        <div className="wine-welcome">{children}</div>
      ) : (
        <div className="wine-captions" aria-live="polite">
          <p key={caption} className="wine-caption">
            {caption}
          </p>
          <p className="wine-hint">{hint}</p>
        </div>
      )}
    </div>
  );
}
