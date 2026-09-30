"use client";
import { useEffect, useRef, useState } from "react";
import { slots, labels, type MomentSlot, type MomentInfo } from "@/lib/models";
import { api } from "@/lib/client";
import StoryCollage from "./StoryCollage";
import { ErrorMessage, Logo, PhotoFrame, Scene } from "./ui";
export default function MomentViewer() {
  const [available, setAvailable] = useState<MomentSlot[] | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [collage, setCollage] = useState(false),
    [direction, setDirection] = useState<"next" | "prev">("next");
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const go = (to: number) => {
    setDirection(to > index ? "next" : "prev");
    setIndex(to);
  };
  async function load() {
    try {
      const found = await Promise.all(
        slots.map(async (slot) =>
          (await api<MomentInfo>(`/api/moments/${slot}?info`)).exists
            ? slot
            : null,
        ),
      );
      setAvailable(found.filter((s): s is MomentSlot => s !== null));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  if (!available)
    return (
      <Scene id="moments-loading">
        <p>Cargando nuestros momentos…</p>
        <ErrorMessage>{error}</ErrorMessage>
        {error && (
          <button className="text-button" onClick={() => void load()}>
            Volver a intentar
          </button>
        )}
      </Scene>
    );
  const slot = available[index];
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x,
      dy = t.clientY - start.y;
    if (
      Math.abs(dx) < 45 ||
      Math.abs(dx) < Math.abs(dy) * 1.4 ||
      Date.now() - start.t > 900
    )
      return;
    if (dx < 0) go(index + 1);
    else if (index > 0) go(index - 1);
  }
  return (
    <Scene
      id={`moment-${index}${collage ? "-collage" : ""}`}
      className={
        slot ? (direction === "next" ? "slide-next" : "slide-prev") : "fade"
      }
    >
      {slot ? (
        <div
          className="history-swipe"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {index > 0 && (
            <button
              className="float-arrow left"
              aria-label="Momento anterior"
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
          )}
          <button
            className="float-arrow right"
            aria-label="Momento siguiente"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
          <p className="eyebrow">
            Nuestros momentos · {index + 1} / {available.length}
          </p>
          <h1>{labels[slot]}</h1>
          <PhotoFrame
            fill
            key={slot}
            src={`/api/moments/${slot}`}
            alt={labels[slot]}
          />
        </div>
      ) : collage ? (
        <StoryCollage autoStart />
      ) : (
        <>
          <Logo />
          <p className="emotional">
            Bueno, ahora a planear juntos nuestra próxima historia
            <br />
            <br />
            Te amo ❤️
          </p>
          <StoryCollage
            onStart={() => {
              setCollage(true);
              window.scrollTo({ top: 0 });
            }}
          />
          {available.length > 0 && (
            <button className="text-button" onClick={() => go(0)}>
              Volver a ver nuestros momentos
            </button>
          )}
        </>
      )}
    </Scene>
  );
}
