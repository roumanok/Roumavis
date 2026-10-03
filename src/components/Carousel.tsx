"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const SLIDE_MS = 340;
const GAP = 28; // space between slides while they move

/**
 * Swipeable slider: the current slide follows the finger and, on release or
 * arrow tap, slides out while the neighbour slides in from the other side.
 * Neighbours stay mounted off-screen so their photos are already loaded.
 */
export default function Carousel({
  index,
  count,
  onIndex,
  onEnd,
  render,
  label,
  prevLabel = "Anterior",
  nextLabel = "Siguiente",
}: {
  index: number;
  count: number;
  onIndex: (i: number) => void;
  /** Called when moving forward past the last slide. */
  onEnd?: () => void;
  render: (i: number) => ReactNode;
  label: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0),
    [animating, setAnimating] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    t: number;
    axis: "x" | "y" | null;
    id: number;
  } | null>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const width = () => (viewport.current?.clientWidth ?? 360) + GAP;
  const reduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function go(dir: 1 | -1) {
    if (busy.current) return;
    const target = index + dir;
    if (target < 0) return settle();
    if (target >= count) {
      settle();
      onEnd?.();
      return;
    }
    if (reduced()) {
      setDx(0);
      onIndex(target);
      return;
    }
    busy.current = true;
    setAnimating(true);
    setDx(-dir * width());
    timer.current = setTimeout(() => {
      // Swap to the new slide in place without animating back.
      setAnimating(false);
      setDx(0);
      onIndex(target);
      busy.current = false;
    }, SLIDE_MS);
  }
  function settle() {
    setAnimating(true);
    setDx(0);
    timer.current = setTimeout(() => setAnimating(false), SLIDE_MS);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (busy.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      axis: null,
      id: e.pointerId,
    };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x,
      my = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      d.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (d.axis === "x")
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
    if (d.axis !== "x") return;
    // Resist at the edges.
    const edge =
      (mx > 0 && index === 0) || (mx < 0 && index === count - 1 && !onEnd);
    setAnimating(false);
    setDx(edge ? mx * 0.3 : mx);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return;
    const mx = e.clientX - d.x;
    const fast = Math.abs(mx) > 30 && Date.now() - d.t < 250;
    if (Math.abs(mx) > width() * 0.22 || fast) go(mx < 0 ? 1 : -1);
    else settle();
  }

  const neighbours = [index - 1, index, index + 1].filter(
    (i) => i >= 0 && i < count,
  );
  return (
    <div
      className="carousel"
      aria-roledescription="carrusel"
      aria-label={label}
    >
      {index > 0 && (
        <button
          className="float-arrow left"
          aria-label={prevLabel}
          onClick={() => go(-1)}
        >
          ‹
        </button>
      )}
      <button
        className="float-arrow right"
        aria-label={nextLabel}
        onClick={() => go(1)}
      >
        ›
      </button>
      <div
        ref={viewport}
        className="carousel-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {neighbours.map((i) => (
          <div
            key={i}
            className="carousel-slide"
            aria-hidden={i !== index}
            style={{
              transform: `translate3d(calc(${(i - index) * 100}% + ${(i - index) * GAP + dx}px), 0, 0)`,
              transition: animating
                ? `transform ${SLIDE_MS}ms cubic-bezier(.22,.7,.2,1)`
                : "none",
            }}
          >
            {render(i)}
          </div>
        ))}
      </div>
    </div>
  );
}
