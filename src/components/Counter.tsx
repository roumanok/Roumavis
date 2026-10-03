"use client";
import { useEffect, useRef, useState } from "react";
import { relationshipDuration } from "@/lib/time";

const FLIP_MS = 620;

/** One flip-clock card: the old number falls away to reveal the new one. */
function FlipCard({ value }: { value: string }) {
  const [shown, setShown] = useState({ current: value, previous: value, n: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Value changes come from the parent clock; start a flip for each one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown((s) =>
      s.current === value
        ? s
        : { current: value, previous: s.current, n: s.n + 1 },
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setShown((s) => ({ ...s, previous: s.current })),
      FLIP_MS,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);
  const flipping = shown.previous !== shown.current;
  return (
    <div className="flip" aria-hidden="true">
      <div className="flip-half flip-top">
        <span>{shown.current}</span>
      </div>
      <div className="flip-half flip-bottom">
        <span>{shown.previous}</span>
      </div>
      {flipping && (
        <>
          <div key={`a${shown.n}`} className="flip-half flip-top flap-out">
            <span>{shown.previous}</span>
          </div>
          <div key={`b${shown.n}`} className="flip-half flip-bottom flap-in">
            <span>{shown.current}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function Counter() {
  const [duration, setDuration] = useState<ReturnType<
    typeof relationshipDuration
  > | null>(null);
  useEffect(() => {
    const update = () => setDuration(relationshipDuration());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  if (!duration)
    return (
      <div className="counter" aria-label="Calculando nuestro tiempo juntos" />
    );
  const parts = [
    [duration.years, "años"],
    [duration.months, "meses"],
    [duration.days, "días"],
    [duration.hours, "horas"],
    [duration.minutes, "minutos"],
    [duration.seconds, "segundos"],
  ] as const;
  return (
    <div
      className="counter"
      role="img"
      aria-label={`Tiempo juntos: ${parts.map(([v, u]) => `${v} ${u}`).join(", ")}`}
    >
      {parts.map(([value, unit]) => (
        <div key={unit} className="counter-cell">
          <FlipCard value={String(value).padStart(2, "0")} />
          <span>{unit}</span>
        </div>
      ))}
    </div>
  );
}
