"use client";
import { useEffect, useRef, useState } from "react";

// The combination: the night it all started.
const CODE = { day: 9, month: 7, year: 2004 };
const WHEELS = [
  { key: "day", label: "Día", min: 1, max: 31, start: 1, pad: 2 },
  { key: "month", label: "Mes", min: 1, max: 12, start: 1, pad: 2 },
  { key: "year", label: "Año", min: 1995, max: 2026, start: 2026, pad: 4 },
] as const;
type Key = (typeof WHEELS)[number]["key"];

function Wheel({
  label,
  value,
  pad,
  dir,
  onStep,
  disabled,
}: {
  label: string;
  value: number;
  pad: number;
  dir: 1 | -1;
  onStep: (d: 1 | -1) => void;
  disabled: boolean;
}) {
  const drag = useRef<{ y: number; acc: number } | null>(null);
  return (
    <div className="lock-wheel">
      <button
        type="button"
        className="lock-step"
        aria-label={`Subir ${label.toLowerCase()}`}
        disabled={disabled}
        onClick={() => onStep(1)}
      >
        ▲
      </button>
      <div
        className={`lock-window${pad === 4 ? " wide" : ""}`}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onStep(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onStep(-1);
          }
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          drag.current = { y: e.clientY, acc: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dy = e.clientY - d.y;
          // Every 26px of vertical drag moves the wheel one notch.
          if (Math.abs(dy) >= 26) {
            onStep(dy < 0 ? 1 : -1);
            d.y = e.clientY;
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <span key={value} className={dir > 0 ? "roll-up" : "roll-down"}>
          {String(value).padStart(pad, "0")}
        </span>
      </div>
      <button
        type="button"
        className="lock-step"
        aria-label={`Bajar ${label.toLowerCase()}`}
        disabled={disabled}
        onClick={() => onStep(-1)}
      >
        ▼
      </button>
      <span className="lock-label">{label}</span>
    </div>
  );
}

/**
 * Opening for the main experience: a padlock that opens with the date it
 * all started (09/07/2004). Calls `onDone` after the unlock animation.
 */
export default function LockRitual({ onDone }: { onDone: () => void }) {
  const [values, setValues] = useState<Record<Key, number>>({
    day: WHEELS[0].start,
    month: WHEELS[1].start,
    year: WHEELS[2].start,
  });
  const [dirs, setDirs] = useState<Record<Key, 1 | -1>>({
    day: 1,
    month: 1,
    year: 1,
  });
  const [phase, setPhase] = useState<"locked" | "open" | "leaving">("locked");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const solved =
    values.day === CODE.day &&
    values.month === CODE.month &&
    values.year === CODE.year;
  const done = useRef(onDone);
  const fired = useRef(false);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!solved || fired.current) return;
    fired.current = true;
    timers.current.push(
      setTimeout(() => setPhase("open"), 350),
      setTimeout(() => setPhase("leaving"), 2300),
      setTimeout(() => done.current(), 2900),
    );
  }, [solved]);

  function step(key: Key, d: 1 | -1) {
    if (phase !== "locked") return;
    const w = WHEELS.find((x) => x.key === key)!;
    setDirs((s) => ({ ...s, [key]: d }));
    setValues((s) => {
      let v = s[key] + d;
      if (v > w.max) v = w.min;
      if (v < w.min) v = w.max;
      return { ...s, [key]: v };
    });
  }

  return (
    <div className={`lock-ritual is-${phase}`}>
      <div className="lock">
        <svg className="lock-shackle" viewBox="0 0 240 220" aria-hidden="true">
          <path
            d="M30 220 V 112 C 30 48 70 14 120 14 C 170 14 210 48 210 112 V 220"
            fill="none"
            stroke="#C8AA7B"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M30 220 V 112 C 30 48 70 14 120 14 C 170 14 210 48 210 112 V 220"
            fill="none"
            stroke="#ffffff55"
            strokeWidth="4"
            strokeLinecap="round"
            transform="translate(-4 0)"
          />
        </svg>
        <div className="lock-body">
          <div className="lock-wheels">
            {WHEELS.map((w) => (
              <Wheel
                key={w.key}
                label={w.label}
                value={values[w.key]}
                pad={w.pad}
                dir={dirs[w.key]}
                disabled={phase !== "locked"}
                onStep={(d) => step(w.key, d)}
              />
            ))}
          </div>
          <svg className="lock-heart" viewBox="0 0 300 300" aria-hidden="true">
            <path
              d="M150 262 C 80 212 30 170 30 110 C 30 72 58 46 92 46 C 118 46 138 60 150 82 C 162 60 182 46 208 46 C 242 46 270 72 270 110 C 270 170 220 212 150 262 Z"
              fill="#C8AA7B"
            />
          </svg>
        </div>
      </div>
      <div className="wine-captions" aria-live="polite">
        <p key={phase} className="wine-caption">
          {phase === "locked" ? "¿Cuándo empezó todo?" : "Ahí empezó todo…"}
        </p>
        <p className="wine-hint">
          {phase === "locked"
            ? "poné la fecha para abrirlo"
            : "9 de julio de 2004 · 03:00"}
        </p>
      </div>
    </div>
  );
}
