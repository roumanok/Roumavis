"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type {
  MomentInfo,
  MomentSlot,
  ResetScope,
  TriviaResult,
} from "@/lib/models";
import { ErrorMessage } from "./ui";

type Card = { id: string; url: string };
type Status = {
  moments: Partial<Record<MomentSlot, boolean>>;
  survey: boolean | null;
  trivia: TriviaResult | null | undefined;
  cards: Record<string, string>;
};

const EXPERIENCES: {
  id: ResetScope;
  path: string;
  title: string;
  detail: string;
  slot: MomentSlot;
}[] = [
  {
    id: "historia",
    path: "/",
    title: "Nuestra historia",
    detail: "Candado, contador, 2004–2025 y selfie 2026",
    slot: "historia",
  },
  {
    id: "vista",
    path: "/vista",
    title: "La vista",
    detail: "Copa que se llena + mensaje",
    slot: "vista",
  },
  {
    id: "cama",
    path: "/cama",
    title: "Los bombones",
    detail: "Caja de bombones + mensaje",
    slot: "cama",
  },
  {
    id: "mesita",
    path: "/mesita",
    title: "Buen día",
    detail: "Sol + mensaje de la mañana",
    slot: "mesita",
  },
  {
    id: "trivia",
    path: "/trivia",
    title: "La trivia",
    detail: "Preguntas, puntaje y premio",
    slot: "trivia",
  },
  {
    id: "encuesta",
    path: "/encuesta",
    title: "La encuesta",
    detail: "Encuesta, momentos y recuerdo final",
    slot: "encuesta",
  },
];

/** Admin landing: every experience with its link and current state. */
export default function AdminSummary() {
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(""),
    [resetting, setResetting] = useState("");
  const load = useCallback(async () => {
    try {
      const [moments, survey, trivia, cards] = await Promise.all([
        Promise.all(
          EXPERIENCES.map(async (e) => [
            e.slot,
            (await api<MomentInfo>(`/api/moments/${e.slot}?info`)).exists,
          ]),
        ),
        api<{ submitted: boolean }>("/api/survey").catch(() => null),
        api<{ result: TriviaResult | null }>("/api/trivia").catch(() => null),
        api<{ cards: Card[] }>("/api/tarjetas").catch(() => null),
      ]);
      setStatus({
        moments: Object.fromEntries(moments),
        survey: survey ? survey.submitted : null,
        trivia: trivia ? trivia.result : undefined,
        cards: Object.fromEntries(
          (cards?.cards ?? []).map((c) => [c.id, c.url]),
        ),
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  // External storage is synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function copy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      window.prompt("Copiá el enlace:", url);
    }
  }

  async function reset(e: (typeof EXPERIENCES)[number]) {
    const extra =
      e.id === "encuesta"
        ? ", las respuestas de la encuesta"
        : e.id === "trivia"
          ? ", el resultado de la trivia"
          : "";
    if (
      !confirm(
        `¿Reiniciar "${e.title}"?\n\nSe borra su foto${extra} y el progreso guardado en el celular. Las demás experiencias no se tocan.`,
      )
    )
      return;
    setResetting(e.id);
    setError("");
    try {
      await api("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: e.id }),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting("");
    }
  }

  return (
    <div className="admin-summary">
      <ErrorMessage>{error}</ErrorMessage>
      {EXPERIENCES.map((e, n) => {
        const photo = status?.moments[e.slot];
        const extra =
          e.id === "encuesta" && status
            ? status.survey
              ? "Encuesta enviada"
              : "Encuesta sin enviar"
            : e.id === "trivia" && status
              ? status.trivia
                ? `Sacó ${status.trivia.score} de ${status.trivia.total}`
                : "Todavía no la jugó"
              : null;
        const card = status?.cards[e.id];
        return (
          <section className="summary-card" key={e.id}>
            <span className="summary-n" aria-hidden="true">
              {n + 1}
            </span>
            <div className="summary-body">
              <h2>{e.title}</h2>
              <p className="summary-detail">{e.detail}</p>
              <div className="summary-chips">
                <span className={`chip${photo ? " ok" : ""}`}>
                  {status ? (photo ? "📷 Foto registrada" : "Sin foto") : "…"}
                </span>
                {extra && (
                  <span
                    className={`chip${
                      (e.id === "encuesta" && status?.survey) ||
                      (e.id === "trivia" && status?.trivia)
                        ? " ok"
                        : ""
                    }`}
                  >
                    {extra}
                  </span>
                )}
              </div>
              <div className="summary-actions">
                <a
                  className="button summary-open"
                  href={e.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  ABRIR
                </a>
                {card && (
                  <button
                    className="text-button"
                    onClick={() => void copy(e.id, card)}
                  >
                    {copied === e.id
                      ? "¡Copiado!"
                      : "Copiar link de la tarjeta"}
                  </button>
                )}
                <button
                  className="text-button danger-text summary-reset"
                  disabled={!!resetting}
                  onClick={() => void reset(e)}
                >
                  {resetting === e.id ? "Reiniciando…" : "Reiniciar"}
                </button>
              </div>
            </div>
          </section>
        );
      })}
      <button className="text-button" onClick={() => void load()}>
        Actualizar estado
      </button>
    </div>
  );
}
