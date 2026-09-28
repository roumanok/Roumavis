"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { defaults, type ContentResponse } from "@/lib/models";
import RegisterMoment from "./RegisterMoment";
import { ErrorMessage, Logo, Ornament, Scene } from "./ui";
export default function Surprise({
  slot,
}: {
  slot: "vista" | "cama" | "mesita";
}) {
  const [text, setText] = useState(defaults[slot].text),
    [error, setError] = useState("");
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
  return (
    <main className="experience">
      <Scene id={slot}>
        <Logo small />
        <Ornament />
        <h1 className="emotional">{text}</h1>
        <div className="reveal" style={{ width: "100%", marginTop: 28 }}>
          <RegisterMoment slot={slot} />
        </div>
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
