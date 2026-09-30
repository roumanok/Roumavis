"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api, loadLocal, saveLocal, syncReset } from "@/lib/client";
import { questions, repeats, type SurveyInput } from "@/lib/models";
import RegisterMoment from "./RegisterMoment";
import MomentViewer from "./MomentViewer";
import { Button, ErrorMessage, Logo, Ornament, Scene } from "./ui";
const draftSchema = z.object({
  step: z.number().int().min(0).max(12),
  ratings: z.array(z.number().int().min(0).max(5)).length(9),
  repeatTrip: z.union([z.enum(repeats), z.literal("")]),
  favorite: z.string().max(5000),
  missed: z.string().max(5000),
  message: z.string().max(5000),
  id: z.string().uuid(),
});
type Draft = z.infer<typeof draftSchema>;
const fresh = (): Draft => ({
  step: 0,
  ratings: Array(9).fill(0),
  repeatTrip: "",
  favorite: "",
  missed: "",
  message: "",
  id: crypto.randomUUID(),
});
export default function Survey() {
  const [draft, setDraft] = useState<Draft | null>(null),
    [status, setStatus] = useState<"loading" | "draft" | "done" | "gallery">(
      "loading",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [finalPhoto, setFinalPhoto] = useState(false),
    [choosing, setChoosing] = useState(false),
    [leaving, setLeaving] = useState(false),
    [cameraOpen, setCameraOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    sending = useRef(false),
    choosingRef = useRef(false);
  const known = useCallback((exists: boolean) => setFinalPhoto(exists), []);
  const check = useCallback(async () => {
    try {
      const data = await api<{ submitted: boolean }>("/api/survey");
      setStatus(data.submitted ? "done" : "draft");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    let alive = true;
    void syncReset().then(() => {
      if (!alive) return;
      const parsed = draftSchema.safeParse(loadLocal<unknown>("survey", null));
      setDraft(parsed.success ? parsed.data : fresh());
      void check();
    });
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);
  useEffect(() => {
    if (draft) saveLocal("survey", draft);
  }, [draft]);
  /** Soft transition: fade the current question out, then show the next. */
  function step(n: number, patch: Partial<Draft> = {}) {
    if (timer.current) clearTimeout(timer.current);
    setLeaving(true);
    timer.current = setTimeout(() => {
      choosingRef.current = false;
      setChoosing(false);
      setDraft((d) => (d ? { ...d, ...patch, step: n } : d));
      setLeaving(false);
    }, 280);
  }
  function rate(value: number) {
    if (!draft || choosingRef.current) return;
    choosingRef.current = true;
    setChoosing(true);
    const index = draft.step - 1;
    setDraft({
      ...draft,
      ratings: draft.ratings.map((r, i) => (i === index ? value : r)),
    });
    timer.current = setTimeout(() => step(index + 2), 450);
  }
  async function submit() {
    if (!draft || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          repeatTrip: draft.repeatTrip as SurveyInput["repeatTrip"],
        }),
      });
      saveLocal("survey-complete", true);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (status === "gallery")
    return (
      <main className="experience">
        <MomentViewer />
      </main>
    );
  if (status === "loading" || !draft)
    return (
      <main className="experience">
        <Scene id="loading">
          <Logo />
          <p>Cargando…</p>
          <ErrorMessage>{error}</ErrorMessage>
          {error && (
            <Button onClick={() => void check()}>VOLVER A INTENTAR</Button>
          )}
        </Scene>
      </main>
    );
  if (status === "done")
    return (
      <main className="experience">
        <Scene id="thanks">
          {!cameraOpen && <Logo small />}
          {!cameraOpen && !finalPhoto && (
            <>
              <p className="emotional">
                Gracias por participar.
                <br />
                <br />
                Tu opinión será tenida en cuenta para futuras escapadas juntos.
                <br />
                <br />
                Te amo ❤️
              </p>
            </>
          )}
          <RegisterMoment
            key={finalPhoto ? "with-photo" : "empty"}
            alwaysShow={finalPhoto}
            slot="encuesta"
            initialLabel="📷 REGISTRAR ÚLTIMO MOMENTO"
            onKnown={known}
            onCamera={setCameraOpen}
          />
          {finalPhoto && !cameraOpen && (
            <Button onClick={() => setStatus("gallery")}>
              ❤️ VER NUESTROS MOMENTOS
            </Button>
          )}
        </Scene>
      </main>
    );
  return (
    <main className="experience survey">
      {draft.step >= 1 && draft.step <= 11 && (
        <img
          className="corner-logo"
          src="/logo_roumavis.png"
          alt=""
          aria-hidden="true"
          width={500}
          height={500}
        />
      )}
      <Scene
        id={`survey-${draft.step}`}
        className={leaving ? "soft leaving" : "soft"}
      >
        {draft.step === 0 && (
          <>
            <img
              className="logo survey-logo"
              src="/logo_roumavis.png"
              alt="Roumavis: nosotros dos"
              width={500}
              height={500}
            />
            <p className="emotional">
              El finde llegó a su fin, así que es hora de....
            </p>
            <h1>¡La encuesta de satisfacción!</h1>
            <Ornament />
            <p className="meta meta-lg">
              Fecha: 10–12 de octubre de 2026
              <br />
              Participantes: 2<br />
              Hijas presentes: 0 😂
            </p>
            <Button onClick={() => step(1)}>COMENZAR</Button>
          </>
        )}
        {draft.step >= 1 && draft.step <= 9 && (
          <>
            <p className="eyebrow">La encuesta · {draft.step} de 9</p>
            <div className="progress" aria-hidden="true">
              {questions.map((_, i) => (
                <span className={i < draft.step ? "done" : ""} key={i} />
              ))}
            </div>
            <h1 className="emotional">{questions[draft.step - 1]}</h1>
            <div
              className="hearts"
              role="group"
              aria-label="Elegí de uno a cinco corazones"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className={
                    value <= draft.ratings[draft.step - 1] ? "selected" : ""
                  }
                  aria-label={`${value} ${value === 1 ? "corazón" : "corazones"}`}
                  aria-pressed={value === draft.ratings[draft.step - 1]}
                  disabled={choosing}
                  onClick={() => rate(value)}
                >
                  {value <= draft.ratings[draft.step - 1] ? "♥" : "♡"}
                </button>
              ))}
            </div>
            <p className="meta">
              {draft.ratings[draft.step - 1]
                ? `${draft.ratings[draft.step - 1]} de 5 corazones`
                : "Tocá un corazón"}
            </p>
            {draft.ratings[draft.step - 1] > 0 && !choosing && (
              <Button onClick={() => step(draft.step + 1)}>CONTINUAR</Button>
            )}
          </>
        )}
        {draft.step === 10 && (
          <>
            <Ornament />
            <h1>¿Repetirías este tipo de escapada?</h1>
            <div className="stack">
              {repeats.map((value) => (
                <Button
                  key={value}
                  className={draft.repeatTrip === value ? "" : "secondary"}
                  onClick={() => step(11, { repeatTrip: value })}
                >
                  {value}
                </Button>
              ))}
            </div>
          </>
        )}
        {draft.step === 11 && (
          <>
            <h1>Y ahora, escribí un poco vos... ❤️</h1>
            <div className="form-fields">
              {(
                [
                  [
                    "favorite",
                    "¿Qué fue lo que más te gustó de esta escapada?",
                  ],
                  [
                    "missed",
                    "¿Hubo algo que te hubiera gustado hacer y no hicimos?",
                  ],
                  ["message", "Dejale un mensaje al creador de todo esto...."],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    value={draft[key]}
                    maxLength={5000}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <Button onClick={() => step(12)}>CONTINUAR</Button>
          </>
        )}
        {draft.step === 12 && (
          <>
            <Logo />
            <h1>¡Eso es todo!</h1>
            <p className="emotional">
              Espero que hayas disfrutado tanto como yo.
            </p>
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? "ENVIANDO…" : "ENVIAR EVALUACIÓN"}
            </Button>
            <ErrorMessage>{error}</ErrorMessage>
          </>
        )}
        {draft.step > 0 && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => step(draft.step - 1)}
          >
            Volver
          </button>
        )}
      </Scene>
    </main>
  );
}
