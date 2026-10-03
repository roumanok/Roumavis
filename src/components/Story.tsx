"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadLocal, saveLocal, syncReset } from "@/lib/client";
import { defaults, photoPath, type ContentResponse } from "@/lib/models";
import AudioController, { type AudioHandle } from "./AudioController";
import Counter from "./Counter";
import RegisterMoment from "./RegisterMoment";
import TapRitual from "./TapRitual";
import Carousel from "./Carousel";
import {
  Button,
  ErrorMessage,
  Logo,
  NextButton,
  Ornament,
  PhotoFrame,
  Scene,
  LoadingHeart,
} from "./ui";
export default function Story() {
  const [scene, setScene] = useState<number | null>(null),
    [content, setContent] = useState(defaults),
    [error, setError] = useState(""),
    [tested, setTested] = useState(false),
    [hasPhoto, setHasPhoto] = useState(false),
    [selfieCamera, setSelfieCamera] = useState(false),
    [introDone, setIntroDone] = useState(false);
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
  const next = () => setScene((value) => (value ?? 0) + 1);
  return (
    <main className="experience">
      <AudioController ref={audio} idleButton={scene !== null && scene >= 2} />
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
          <LoadingHeart />
        </Scene>
      ) : (
        <Scene
          id={scene >= 4 && scene <= 25 ? "history" : scene}
          className={`fade${scene >= 4 && scene <= 26 ? " history-layout" : ""}`}
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
                  setIntroDone(false);
                  setScene(0);
                }}
              >
                Revivir la experiencia completa
              </button>
            </>
          )}
          {scene === 0 &&
            (introDone ? (
              <div className="wine-welcome">
                <Logo />
                <h1>
                  Bienvenida a un finde <em>NUESTRO...</em>
                </h1>
                <p className="emotional">¿Estás lista?</p>
                <Button onClick={next}>¡SÍ!</Button>
              </div>
            ) : (
              <TapRitual kind="heart" onDone={() => setIntroDone(true)} />
            ))}
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
            <Carousel
              label="Nuestra historia año por año"
              prevLabel="Año anterior"
              nextLabel="Año siguiente"
              index={scene - 4}
              count={22}
              onIndex={(i) => setScene(4 + i)}
              onEnd={next}
              render={(i) => (
                <div className="history-slide">
                  <div className="history-photo-wrap">
                    <h1 className="year-badge">{2004 + i}</h1>
                    <PhotoFrame
                      fill
                      src={photoPath(2004 + i)}
                      alt={`Nosotros en ${2004 + i}`}
                    />
                  </div>
                  {content.history[i]?.caption && (
                    <p className="history-caption">
                      {content.history[i].caption}
                    </p>
                  )}
                </div>
              )}
            />
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
                  hideChange
                  lead={
                    selfieCamera || hasPhoto ? null : (
                      <p className="emotional small-text">
                        ¿Te parece sumar este momento a la historia?
                      </p>
                    )
                  }
                />
              </div>
              {hasPhoto && !selfieCamera && (
                <Button onClick={next}>¡LISTO!</Button>
              )}
            </>
          )}
          {scene === 27 && (
            <>
              <Logo />
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
                cuando llegamos... 😉
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
