"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadLocal, saveLocal, syncReset } from "@/lib/client";
import { defaults, type ContentResponse } from "@/lib/models";
import RegisterMoment from "./RegisterMoment";
import TapRitual, { type RitualKind } from "./TapRitual";
import { Button, ErrorMessage, Scene } from "./ui";
type Stage = "intro" | "moment" | "bye";
const RITUAL: Record<"vista" | "cama" | "mesita", RitualKind> = {
  vista: "bottle",
  cama: "bonbons",
  mesita: "sun",
};
export default function Surprise({
  slot,
}: {
  slot: "vista" | "cama" | "mesita";
}) {
  const [text, setText] = useState(defaults[slot].text),
    [error, setError] = useState(""),
    [stage, setStage] = useState<Stage>("intro"),
    [saved, setSaved] = useState(false),
    [ritual, setRitual] = useState<"pending" | "show" | "done">("pending");
  const savedRef = useRef(false);
  const load = useCallback(async () => {
    try {
      const data = await api<ContentResponse>("/api/content");
      setText(data.content[slot].text);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slot]);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  // The tap ritual is shown once per device (until the admin resets).
  // A reset from the admin clears this device's progress first.
  useEffect(() => {
    let alive = true;
    void syncReset().then(() => {
      if (alive)
        setRitual(
          loadLocal<boolean>(`ritual-${slot}`, false) ? "done" : "show",
        );
    });
    return () => {
      alive = false;
    };
  }, [slot]);
  // Opening the camera hides the message; cancelling without saving restores it.
  const onCamera = useCallback((open: boolean) => {
    if (open) setStage("moment");
    else if (!savedRef.current) setStage("intro");
  }, []);
  const onSaved = useCallback(() => {
    savedRef.current = true;
    setSaved(true);
  }, []);
  const logo = (
    <img
      className="corner-logo"
      src="/logo_roumavis.png"
      alt=""
      aria-hidden="true"
      width={500}
      height={500}
    />
  );
  if (ritual !== "done")
    return (
      <main className="experience">
        <Scene id={`${slot}-ritual`}>
          {ritual === "show" && (
            <TapRitual
              kind={RITUAL[slot]}
              onDone={() => {
                saveLocal(`ritual-${slot}`, true);
                setRitual("done");
              }}
            />
          )}
        </Scene>
      </main>
    );
  if (stage === "bye")
    return (
      <main className="experience">
        <Scene id={`${slot}-bye`}>
          <img
            className="logo survey-logo"
            src="/logo_roumavis.png"
            alt="Roumavis: nosotros dos"
            width={500}
            height={500}
          />
          <p className="emotional">
            ¡Hasta la próxima sorpresa!
            <br />
            <br />
            TE AMO ❤️
          </p>
        </Scene>
      </main>
    );
  return (
    <main className="experience">
      {stage === "moment" && logo}
      <Scene
        id={slot}
        className={stage === "moment" ? "fade history-layout" : "fade"}
      >
        {stage === "intro" && (
          <>
            <img
              className="logo survey-logo"
              src="/logo_roumavis.png"
              alt="Roumavis: nosotros dos"
              width={500}
              height={500}
            />
            <h1 className="emotional">{text}</h1>
          </>
        )}
        <div
          className={stage === "intro" ? "reveal" : undefined}
          style={{ width: "100%", marginTop: stage === "intro" ? 12 : 0 }}
        >
          <RegisterMoment
            slot={slot}
            onCamera={onCamera}
            onSaved={onSaved}
            hideChange={saved}
          />
        </div>
        {saved && stage === "moment" && (
          <Button onClick={() => setStage("bye")}>¡LISTO!</Button>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        {error && (
          <button className="text-button" onClick={() => void load()}>
            Volver a cargar
          </button>
        )}
      </Scene>
    </main>
  );
}
