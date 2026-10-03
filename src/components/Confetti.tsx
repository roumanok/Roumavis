"use client";
import { useMemo } from "react";

const COLORS = ["#581C2B", "#7A2A3D", "#C99694", "#C8AA7B", "#E8C98E"];

/** A short burst of hearts and paper bits falling from the top. */
/** Small deterministic PRNG so each burst is varied but render stays pure. */
function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Confetti({
  seed = 1,
  pieces = 42,
}: {
  seed?: number;
  pieces?: number;
}) {
  const bits = useMemo(() => {
    const random = rng(seed * 9973);
    return Array.from({ length: pieces }, (_, i) => ({
      left: random() * 100,
      delay: random() * 0.25,
      duration: 1.1 + random() * 0.9,
      drift: (random() - 0.5) * 120,
      spin: (random() - 0.5) * 720,
      size: 8 + random() * 10,
      color: COLORS[i % COLORS.length],
      heart: i % 3 === 0,
    }));
  }, [seed, pieces]);
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={b.heart ? "confetti-heart" : "confetti-bit"}
          style={
            {
              left: `${b.left}%`,
              color: b.color,
              background: b.heart ? "none" : b.color,
              fontSize: `${b.size * 1.6}px`,
              width: b.heart ? undefined : `${b.size * 0.6}px`,
              height: b.heart ? undefined : `${b.size}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              "--drift": `${b.drift}px`,
              "--spin": `${b.spin}deg`,
            } as React.CSSProperties
          }
        >
          {b.heart ? "♥" : null}
        </span>
      ))}
    </div>
  );
}
