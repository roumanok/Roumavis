"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadLocal, saveLocal, syncReset } from "@/lib/client";
import { defaults, photoPath, type ContentResponse } from "@/lib/models";
import AudioController, { type AudioHandle } from "./AudioController";
import Counter from "./Counter";
import RegisterMoment from "./RegisterMoment";
import {
  Button,
  ErrorMessage,
  Logo,
  NextButton,
  Ornament,
  PhotoFrame,
  Scene,
} from "./ui";
export default function Story() {
  const [scene, setScene] = useState<number | null>(null),
    [content, setContent] = useState(defaults),
    [error, setError] = useState(""),
    [tested, setTested] = useState(false),
    [hasPhoto, setHasPhoto] = useState(false),
    [direction, setDirection] = useState<"next" | "prev">("next"),
    [selfieCamera, setSelfieCamera] = useState(false);
  const audio = useRef<AudioHandle>(null);
  const known = useCallback((exists: boolean) => setHasPhoto(exists), []);
  const fetchContent = useCallback(async () => {
    try {
      const data = await api<ContentResponse>("/api/content");
      setContent(data.content);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    // Read device-local progress only after hydration, never during server rendering.
    void syncReset().then(() => {
      if (!alive) return;
      const saved = loadLocal<number>("story-progress", 0);
      setScene(
        loadLocal<boolean>("story-complete", false)
          ? -1
          : Number.isInteger(saved) && saved >= 0 && saved <= 29
            ? saved
            : 0,
      );
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchContent();
    return () => {
      alive = false;
    };
  }, [fetchContent]);
  useEffect(() => {
    if (scene === null || scene < 0) return;
    saveLocal("story-progress", scene);
    if (scene >= 4 && scene < 25) {
      const next = new Image();
      next.src = photoPath(2004 + scene - 4 + 1);
    }
    if (scene === 29) {
      saveLocal("story-complete", true);
      const timer = setTimeout(() => audio.current?.fade(), 7000);
      return () => clearTimeout(timer);
    }
  }, [scene]);
  const next = () => {
    setDirection("next");
    setScene((value) => (value ?? 0) + 1);
  };
  const previous = () => {
    setDirection("prev");
    setScene((value) => Math.max(4, (value ?? 4) - 1));
  };
  // Horizontal swipe between history years (vertical scrolling still works).
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || scene === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x,
      dy = t.clientY - start.y;
    if (
      Math.abs(dx) < 45 ||
      Math.abs(dx) < Math.abs(dy) * 1.4 ||
      Date.now() - start.t > 900
    )
      return;
    if (dx < 0) next();
    else if (scene > 4) previous();
  }
  return (
    <main className="experience">
      <AudioController ref={audio} />
      {scene !== null && scene >= 4 && scene <= 26 && (
        <div className="story-topbar" aria-hidden="true">
          <img
            className="corner-logo"
            src="/logo_roumavis.png"
            alt=""
            width={500}
            height={500}
          />
          <p className="eyebrow">Nuestra historia</p>
        </div>
      )}
      {scene === null ? (
        <Scene id="loading">
          <Logo />
          <p className="eyebrow">Un momento…</p>
        </Scene>
      ) : (
        <Scene
          id={scene}
          className={`${
            scene >= 4 && scene <= 25
              ? direction === "next"
                ? "slide-next"
                : "slide-prev"
              : "fade"
          }${scene >= 4 && scene <= 26 ? " history-layout" : ""}`}
        >
          {scene === -1 && (
            <>
              <Logo />
              <Ornament />
              <h1>¿Querés volver a recorrer nuestra historia?</h1>
              <Button
                onClick={() => {
                  void audio.current?.play();
                  setScene(4);
                }}
              >
                VOLVER A VERLA
              </Button>
              <button
                className="text-button"
                onClick={() => {
                  saveLocal("story-complete", false);
                  setTested(false);
                  setScene(0);
                }}
              >
                Revivir la experiencia completa
              </button>
            </>
          )}
          {scene === 0 && (
            <>
              <Logo />
              <Ornament />
              <h1>
                Bienvenida a un finde <em>NUESTRO...</em>
              </h1>
              <p className="emotional">¿Estás lista?</p>
              <Button onClick={next}>¡SÍ!</Button>
            </>
          )}
          {scene === 1 && (
            <>
              <Logo small />
              <p className="emotional">Antes de empezar...</p>
              <Ornament />
              <h1>
                SUBÍ EL
                <br />
                VOLUMEN
              </h1>
              <Button
                className="secondary"
                onClick={async () => {
                  await audio.current?.play();
                  setTested(true);
                }}
              >
                PROBAR
              </Button>
              <Button disabled={!tested} onClick={next}>
                ¡LISTO!
              </Button>
            </>
          )}
          {scene === 2 && (
            <>
              <p className="emotional">Hermosa canción... ¿no?</p>
              <p className="emotional small-text">
                Ideal para disfrutarla juntos... como vamos a disfrutar este
                finde.
                <br />
                <br />Y como venimos disfrutando durante...
              </p>
              <Counter />
              <Button onClick={next}>¡WOW!</Button>
            </>
          )}
          {scene === 3 && (
            <>
              <Logo />
              <p className="emotional">
                Sí, ¡mirá que tenemos historia!
                <br />
                <br />
                ¿Te gustaría repasarla?
              </p>
              <Button onClick={next}>¡OBVIO!</Button>
            </>
          )}
          {scene >= 4 && scene <= 25 && (
            <div
              className="history-swipe"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {scene > 4 && (
                <button
                  className="float-arrow left"
                  aria-label="Año anterior"
                  onClick={previous}
                >
                  ‹
                </button>
              )}
              <button
                className="float-arrow right"
                aria-label="Año siguiente"
                onClick={next}
              >
                ›
              </button>
              <div className="history-photo-wrap">
                <h1 className="year-badge">{2004 + scene - 4}</h1>
                <PhotoFrame
                  fill
                  key={scene}
                  src={photoPath(2004 + scene - 4)}
                  alt={`Nosotros en ${2004 + scene - 4}`}
                />
              </div>
              {content.history[scene - 4]?.caption && (
                <p className="history-caption">
                  {content.history[scene - 4].caption}
                </p>
              )}
              {!tested && (
                <button
                  className="text-button"
                  onClick={() => {
                    void audio.current?.play();
                    setTested(true);
                  }}
                >
                  ♪ Acompañar con música
                </button>
              )}
            </div>
          )}
          {scene === 26 && (
            <>
              <div className="history-photo-wrap">
                <h1 className="year-badge">2026</h1>
                <RegisterMoment
                  slot="historia"
                  initialLabel="📷 ¡SELFIE!"
                  alwaysShow
                  onKnown={known}
                  onCamera={setSelfieCamera}
                  lead={
                    selfieCamera ? null : (
                      <p className="emotional small-text">
                        ¿Te parece sumar este momento a la historia?
                      </p>
                    )
                  }
                />
              </div>
              {hasPhoto && <NextButton onClick={next} />}
            </>
          )}
          {scene === 27 && (
            <>
              <Ornament />
              <p className="emotional closing">
                Y seguimos escribiendo nuestra historia...
              </p>
              <NextButton onClick={next} />
            </>
          )}
          {scene === 28 && (
            <>
              <Logo />
              <p className="emotional">
                Este finde es para nosotros.
                <br />
                Para que sea otro de esos momentos que recordemos siempre.
              </p>
              <p className="emotional">TE AMO ❤️</p>
              <NextButton onClick={next} />
            </>
          )}
          {scene === 29 && (
            <>
              <Logo />
              <p className="emotional small-text">
                Ah, igual esta no es la única sorpresa del finde...
                <br />
                ¡sólo es la primera!
                <br />
                <br />
                Ahora, podés darme la mano, un beso o lo que quieras después
                cuando llegamos... :)
              </p>
            </>
          )}
          {error && (
            <>
              <ErrorMessage>{error}</ErrorMessage>
              <button
                className="text-button"
                onClick={() => void fetchContent()}
              >
                Volver a cargar los textos
              </button>
            </>
          )}
        </Scene>
      )}
    </main>
  );
}
