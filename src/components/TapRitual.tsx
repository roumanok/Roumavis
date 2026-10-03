"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type RitualKind = "heart" | "heart-survey" | "glass" | "bonbons" | "sun";

type Config = {
  taps: number;
  /** Caption per number of taps so far (index 0 = before the first tap). */
  lines: string[];
  hint: string;
  full: [string, string];
  /** Heart kinds wait for one more tap once full; the rest continue alone. */
  tapWhenFull: boolean;
  label: string;
};

const FILL_LINES = [
  "Un poquito más…",
  "Eso.",
  "Seguí, seguí.",
  "Casi…",
  "Un último toque",
  "Ya está casi lleno",
];

const CONFIG: Record<RitualKind, Config> = {
  heart: {
    taps: 7,
    lines: ["Tocá el corazón", ...FILL_LINES],
    hint: "para llenarlo",
    full: ["Lleno de nosotros", "tocalo"],
    tapWhenFull: true,
    label: "Tocá para llenar el corazón",
  },
  "heart-survey": {
    taps: 7,
    lines: ["Tocá el corazón", ...FILL_LINES],
    hint: "una vez más",
    full: ["Lleno, como este finde", "tocalo"],
    tapWhenFull: true,
    label: "Tocá para llenar el corazón",
  },
  glass: {
    taps: 7,
    lines: [
      "Tocá la copa",
      "Un poquito más…",
      "Eso.",
      "Seguí, seguí.",
      "Casi…",
      "Un último toque",
      "Ya está casi llena",
    ],
    hint: "y serviime un poco de vino",
    full: ["¡Salud!", ""],
    tapWhenFull: false,
    label: "Tocá para llenar la copa",
  },
  bonbons: {
    taps: 6,
    lines: ["Tocá la caja", "Uno…", "Otro…", "Mmm…", "Uno más", "¡El último!"],
    hint: "y llenala de bombones",
    full: ["¡Llena!", ""],
    tapWhenFull: false,
    label: "Tocá para llenar la caja de bombones",
  },
  sun: {
    taps: 7,
    lines: [
      "Tocá el sol",
      "Buen día…",
      "Un poquito más…",
      "Más luz…",
      "Eso…",
      "Casi…",
      "Un último toque",
    ],
    hint: "y despertalo",
    full: ["¡Buen día!", ""],
    tapWhenFull: false,
    label: "Tocá para despertar el sol",
  },
};

const HEART =
  "M150 262 C 80 212 30 170 30 110 C 30 72 58 46 92 46 C 118 46 138 60 150 82 C 162 60 182 46 208 46 C 242 46 270 72 270 110 C 270 170 220 212 150 262 Z";
const WAVE =
  "M0 0 Q 22 -7 45 0 T 90 0 T 135 0 T 180 0 T 225 0 T 270 0 T 315 0 V 14 H 0 Z";

/** A liquid that rises inside `shape` (clip path) as progress goes 0 → 1. */
function Liquid({
  id,
  shape,
  top,
  bottom,
  p,
  pulse,
}: {
  id: string;
  shape: string;
  top: number;
  bottom: number;
  p: number;
  pulse: number;
}) {
  const y = bottom - (bottom - top) * p;
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={shape} />
        </clipPath>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A2A3D" />
          <stop offset="1" stopColor="#581C2B" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect
          className="ritual-fill"
          x="0"
          y={y}
          width="300"
          height={bottom + 30 - y}
          fill={`url(#${id}-grad)`}
        />
        {p > 0 && p < 1 && (
          <path
            className={`ritual-wave ${pulse % 2 ? "slosh-a" : "slosh-b"}`}
            d={WAVE}
            fill="#7A2A3D"
            transform={`translate(-8 ${y})`}
          />
        )}
      </g>
    </>
  );
}

function HeartArt({
  p,
  pulse,
  full,
}: {
  p: number;
  pulse: number;
  full: boolean;
}) {
  return (
    <svg
      viewBox="0 0 300 300"
      aria-hidden="true"
      className={full ? "beat" : undefined}
    >
      <g className="ritual-beat">
        <path d={HEART} fill="#ffffff66" />
        <Liquid
          id="rh"
          shape={HEART}
          top={46}
          bottom={262}
          p={p}
          pulse={pulse}
        />
        <path
          d={HEART}
          fill="none"
          stroke="#581C2B"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M78 92 C 68 100 62 112 62 126"
          stroke="#ffffff88"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const BOWL = "M98 40 H202 C204 92 196 150 150 170 C104 150 96 92 98 40 Z";
function GlassArt({ p, pulse }: { p: number; pulse: number }) {
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <path d={BOWL} fill="#ffffff66" />
      <Liquid id="rg" shape={BOWL} top={46} bottom={172} p={p} pulse={pulse} />
      <path
        d={BOWL}
        fill="none"
        stroke="#581C2B"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M110 48 C108 85 112 120 134 150"
        stroke="#ffffff77"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
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
  );
}

// Six cups in a heart-shaped box, filled in this order.
const CUPS = [
  [98, 122],
  [150, 136],
  [202, 122],
  [123, 182],
  [177, 182],
  [150, 228],
];
const BOX =
  "M150 262 C 78 214 26 170 26 112 C 26 72 56 44 92 44 C 118 44 138 58 150 80 C 162 58 182 44 208 44 C 244 44 274 72 274 112 C 274 170 222 214 150 262 Z";

function BonbonArt({ filled }: { filled: number }) {
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true">
      {/* Box: wine border, cream inside */}
      <path d={BOX} fill="#581C2B" />
      <path
        d={BOX}
        fill="#fbf4ea"
        transform="translate(150 150) scale(0.9) translate(-150 -150)"
      />
      {CUPS.map(([cx, cy], i) => (
        <g key={i}>
          {/* Paper cup */}
          <circle
            cx={cx}
            cy={cy}
            r="22"
            fill="#f3e6d3"
            stroke="#C8AA7B"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          {i < filled && (
            <g
              className="ritual-bonbon"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              {i % 3 === 1 ? (
                // Heart-shaped bonbon
                <path
                  transform={`translate(${cx} ${cy}) scale(1.1) translate(${-cx} ${-cy})`}
                  d={`M${cx} ${cy + 15} C ${cx - 12} ${cy + 6} ${cx - 19} ${cy} ${cx - 19} ${cy - 7} C ${cx - 19} ${cy - 14} ${cx - 13} ${cy - 18} ${cx - 8} ${cy - 18} C ${cx - 4} ${cy - 18} ${cx - 1} ${cy - 15} ${cx} ${cy - 12} C ${cx + 1} ${cy - 15} ${cx + 4} ${cy - 18} ${cx + 8} ${cy - 18} C ${cx + 13} ${cy - 18} ${cx + 19} ${cy - 14} ${cx + 19} ${cy - 7} C ${cx + 19} ${cy} ${cx + 12} ${cy + 6} ${cx} ${cy + 15} Z`}
                  fill="#7A2A3D"
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r="17"
                  fill={i % 2 ? "#4a2420" : "#581C2B"}
                />
              )}
              {/* Drizzle / shine */}
              <path
                d={`M${cx - 9} ${cy - 3} q 4.5 -5 9 0 t 9 0`}
                stroke="#C8AA7B"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={cx - 6} cy={cy - 8} r="2.5" fill="#ffffff55" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function SunArt({ p }: { p: number }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  const len = 8 + 52 * p;
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <g
        className="ritual-sun-rays"
        style={{ transform: `rotate(${p * 30}deg)` }}
      >
        {rays.map((deg, i) => {
          const r0 = 66;
          const l = i % 2 ? len * 0.72 : len;
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              className="ritual-ray"
              x1={150 + Math.cos(a) * r0}
              y1={150 + Math.sin(a) * r0}
              x2={150 + Math.cos(a) * (r0 + l)}
              y2={150 + Math.sin(a) * (r0 + l)}
              stroke={i % 2 ? "#C8AA7B" : "#581C2B"}
              strokeWidth={i % 2 ? 5 : 6}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle
        cx="150"
        cy="150"
        r="54"
        fill={p >= 1 ? "#E8C98E" : "#f1dcb3"}
        stroke="#581C2B"
        strokeWidth="4"
        className="ritual-sun-disc"
      />
      {/* Soft morning face: closed eyes that open when full */}
      {p >= 1 ? (
        <>
          <circle cx="132" cy="144" r="4.5" fill="#581C2B" />
          <circle cx="168" cy="144" r="4.5" fill="#581C2B" />
        </>
      ) : (
        <>
          <path
            d="M124 145 q 8 6 16 0"
            stroke="#581C2B"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M160 145 q 8 6 16 0"
            stroke="#581C2B"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d="M136 166 q 14 12 28 0"
        stroke="#581C2B"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="122" cy="160" r="6" fill="#C99694" opacity="0.6" />
      <circle cx="178" cy="160" r="6" fill="#C99694" opacity="0.6" />
    </svg>
  );
}

/**
 * Tap-to-fill opening for each surprise. Calls `onDone` when finished; the
 * parent then shows its regular content.
 */
export default function TapRitual({
  kind,
  onDone,
}: {
  kind: RitualKind;
  onDone: () => void;
}) {
  const cfg = CONFIG[kind];
  const [taps, setTaps] = useState(0),
    [pulse, setPulse] = useState(0),
    [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) =>
    timers.current.push(setTimeout(fn, ms));
  const full = taps >= cfg.taps;
  const p = taps / cfg.taps;

  function finish() {
    setLeaving(true);
    later(onDone, 650);
  }
  function tap() {
    if (leaving) return;
    if (full) {
      if (cfg.tapWhenFull) finish();
      return;
    }
    const n = taps + 1;
    setTaps(n);
    setPulse((v) => v + 1);
    if (n >= cfg.taps && !cfg.tapWhenFull) later(finish, 1100);
  }

  const caption = full
    ? cfg.full[0]
    : cfg.lines[Math.min(taps, cfg.lines.length - 1)];
  const hint = full
    ? cfg.full[1]
    : taps === 0
      ? cfg.hint
      : taps === 1
        ? "seguí tocando"
        : "";

  let art: ReactNode;
  if (kind === "glass") art = <GlassArt p={p} pulse={pulse} />;
  else if (kind === "bonbons") art = <BonbonArt filled={taps} />;
  else if (kind === "sun") art = <SunArt p={p} />;
  else art = <HeartArt p={p} pulse={pulse} full={full} />;

  return (
    <div className={`ritual ritual-${kind}${leaving ? " leaving" : ""}`}>
      <div
        className={`ritual-stage${pulse ? (pulse % 2 ? " tap-a" : " tap-b") : ""}${full ? " is-full" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={full ? "Tocalo para seguir" : cfg.label}
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
        {art}
      </div>
      <div className="wine-captions" aria-live="polite">
        <p key={caption} className="wine-caption">
          {caption}
        </p>
        <p className="wine-hint">{hint}</p>
      </div>
    </div>
  );
}
