"use client";
import { useEffect, useState } from "react";
import { slots, labels, type MomentSlot, type MomentInfo } from "@/lib/models";
import { api } from "@/lib/client";
import StoryCollage from "./StoryCollage";
import { ErrorMessage, NextButton, Ornament, PhotoFrame, Scene } from "./ui";
export default function MomentViewer() {
  const [available, setAvailable] = useState<MomentSlot[] | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState("");
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
  return (
    <Scene id={`moment-${index}`}>
      {slot ? (
        <>
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
          <NextButton onClick={() => setIndex(index + 1)} />
          {index > 0 && (
            <button className="text-button" onClick={() => setIndex(index - 1)}>
              Anterior
            </button>
          )}
        </>
      ) : (
        <>
          <Ornament />
          <p className="emotional">
            Un finde más para nuestra historia.
            <br />
            <br />Y muchos más por vivir.
            <br />
            <br />
            Te amo ❤️
          </p>
          <StoryCollage />
          {available.length > 0 && (
            <button className="text-button" onClick={() => setIndex(0)}>
              Volver a ver nuestros momentos
            </button>
          )}
        </>
      )}
    </Scene>
  );
}
