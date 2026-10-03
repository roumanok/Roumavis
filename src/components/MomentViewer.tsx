"use client";
import { useEffect, useState } from "react";
import { slots, labels, type MomentSlot, type MomentInfo } from "@/lib/models";
import { api } from "@/lib/client";
import StoryCollage from "./StoryCollage";
import Carousel from "./Carousel";
import { ErrorMessage, Logo, PhotoFrame, Scene, LoadingHeart } from "./ui";
export default function MomentViewer() {
  const [available, setAvailable] = useState<MomentSlot[] | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [collage, setCollage] = useState(false);
  const go = (to: number) => setIndex(to);
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
        <LoadingHeart label="Cargando nuestros momentos…" />
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
    <Scene
      id={slot ? "moments" : collage ? "moments-collage" : "moments-end"}
      className="fade"
    >
      {slot ? (
        <Carousel
          label="Nuestros momentos"
          prevLabel="Momento anterior"
          nextLabel="Momento siguiente"
          index={index}
          count={available.length}
          onIndex={go}
          onEnd={() => go(available.length)}
          render={(i) => (
            <div className="history-slide">
              <p className="eyebrow">
                Nuestros momentos · {i + 1} / {available.length}
              </p>
              <h1>{labels[available[i]]}</h1>
              <PhotoFrame
                fill
                src={`/api/moments/${available[i]}`}
                alt={labels[available[i]]}
              />
            </div>
          )}
        />
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
