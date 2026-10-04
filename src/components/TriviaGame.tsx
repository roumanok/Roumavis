"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadLocal, saveLocal, syncReset } from "@/lib/client";
import { triviaImagePath, triviaTier, type Trivia } from "@/lib/models";
import Confetti from "./Confetti";
import RegisterMoment from "./RegisterMoment";
import TapRitual from "./TapRitual";
import { Button, ErrorMessage, LoadingHeart, NextButton, Scene } from "./ui";

const LETTERS = ["A", "B", "C", "D", "E"];
type Stage = "loading" | "ritual" | "intro" | "play" | "score" | "prize";
type Progress = { answers: number[]; reported?: boolean };

function GiftIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="gift-icon">
      <rect x="6" y="16" width="28" height="20" rx="3" fill="#581C2B" />
      <rect x="4" y="11" width="32" height="8" rx="2.5" fill="#7A2A3D" />
      <rect x="18" y="11" width="4" height="25" fill="#C8AA7B" />
      <path
        d="M20 11 C 14 4 7 6 10 10 C 12 12 17 11 20 11 C 23 11 28 12 30 10 C 33 6 26 4 20 11 Z"
        fill="none"
        stroke="#C8AA7B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Corner logo + progress bar that fills toward the gift with each hit. */
function TriviaBar({ score, total }: { score: number; total: number }) {
  const pct = total ? (score / total) * 100 : 0;
  return (
    <div className="trivia-topbar" aria-hidden="true">
      <img
        className="trivia-topbar-logo"
        src="/logo_roumavis.png"
        alt=""
        width={500}
        height={500}
      />
      <div className="trivia-bar">
        <div className="trivia-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <GiftIcon />
    </div>
  );
}

export default function TriviaGame() {
  const [trivia, setTrivia] = useState<Trivia | null>(null),
    [stage, setStage] = useState<Stage>("loading"),
    [progress, setProgress] = useState<Progress>({ answers: [] }),
    [picked, setPicked] = useState<number | null>(null),
    [burst, setBurst] = useState(0),
    [error, setError] = useState(""),
    [cameraOpen, setCameraOpen] = useState(false);
  const reporting = useRef(false);

  const load = useCallback(async () => {
    try {
      await syncReset();
      const data = await api<{ trivia: Trivia }>("/api/trivia");
      const total = data.trivia.questions.length;
      let saved = loadLocal<Progress>("trivia-progress", { answers: [] });
      if (!Array.isArray(saved.answers) || saved.answers.length > total)
        saved = { answers: [] };
      setTrivia(data.trivia);
      setProgress(saved);
      setError("");
      if (!loadLocal<boolean>("ritual-trivia", false)) setStage("ritual");
      else if (saved.answers.length === 0) setStage("intro");
      else if (saved.answers.length < total) setStage("play");
      else
        setStage(loadLocal<boolean>("trivia-prize", false) ? "prize" : "score");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const total = trivia?.questions.length ?? 0;
  const score = trivia
    ? progress.answers.filter((a, i) => trivia.questions[i]?.correct === a)
        .length
    : 0;

  function save(next: Progress) {
    setProgress(next);
    saveLocal("trivia-progress", next);
  }
  // Report the final score once (admin sees it); retried on later visits.
  useEffect(() => {
    if (!trivia || reporting.current || progress.reported) return;
    if (total === 0 || progress.answers.length !== total) return;
    reporting.current = true;
    api("/api/trivia/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: progress.answers, score, total }),
    })
      .then(() => save({ ...progress, reported: true }))
      .catch(() => {})
      .finally(() => (reporting.current = false));
     
  }, [trivia, progress, score, total]);

  if (error)
    return (
      <main className="experience">
        <Scene id="trivia-error">
          <LoadingHeart label="No pudimos cargar la trivia" />
          <ErrorMessage>{error}</ErrorMessage>
          <Button onClick={() => void load()}>VOLVER A INTENTAR</Button>
        </Scene>
      </main>
    );
  if (stage === "loading" || !trivia)
    return (
      <main className="experience">
        <Scene id="trivia-loading">
          <LoadingHeart />
        </Scene>
      </main>
    );
  if (total === 0)
    return (
      <main className="experience">
        <Scene id="trivia-empty">
          <LoadingHeart label="Muy pronto…" />
        </Scene>
      </main>
    );

  if (stage === "ritual")
    return (
      <main className="experience">
        <Scene id="trivia-ritual">
          <TapRitual
            kind="question"
            onDone={() => {
              saveLocal("ritual-trivia", true);
              setStage("intro");
            }}
          />
        </Scene>
      </main>
    );

  if (stage === "intro")
    return (
      <main className="experience">
        <Scene id="trivia-intro">
          <img
            className="logo survey-logo"
            src="/logo_roumavis.png"
            alt="Roumavis: nosotros dos"
            width={500}
            height={500}
          />
          <h1 className="emotional">¡Llegó la hora de nuestra trivia!</h1>
          <p className="emotional small-text">¿Estás lista?</p>
          <Button onClick={() => setStage("play")}>¡OBVIO!</Button>
        </Scene>
      </main>
    );

  if (stage === "play") {
    const i = progress.answers.length;
    const q = trivia.questions[i];
    const answered = picked !== null;
    const right = answered && picked === q.correct;
    return (
      <main className="experience trivia">
        <TriviaBar score={score + (right ? 1 : 0)} total={total} />
        {answered && right && <Confetti key={burst} seed={burst} />}
        <Scene id={`trivia-q-${i}`} className="soft trivia-layout">
          <p className="eyebrow">
            Pregunta {i + 1} de {total}
          </p>
          {q.text && <h1 className="trivia-question">{q.text}</h1>}
          {q.image && (
            <figure className="trivia-image">
              { }
              <img src={triviaImagePath(q.id)} alt="" />
            </figure>
          )}
          <div className="trivia-answers" role="group" aria-label="Opciones">
            {q.options.map((opt, k) => {
              const state = !answered
                ? ""
                : k === q.correct
                  ? " is-correct"
                  : k === picked
                    ? " is-wrong"
                    : " is-dim";
              return (
                <button
                  key={k}
                  className={`trivia-answer${state}`}
                  disabled={answered}
                  onClick={() => {
                    setPicked(k);
                    if (k === q.correct) setBurst((b) => b + 1);
                  }}
                >
                  <span className="trivia-letter">{LETTERS[k]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="trivia-feedback" role="status">
              <p className={`emotional small-text${right ? "" : " ouch"}`}>
                {right ? "¡Correcto!" : "Ouch! No era esa"}
              </p>
              <NextButton
                label={i + 1 === total ? "Ver resultado" : "Siguiente pregunta"}
                onClick={() => {
                  if (picked === null) return;
                  const next = { answers: [...progress.answers, picked] };
                  save(next);
                  setPicked(null);
                  if (next.answers.length === total) setStage("score");
                }}
              />
            </div>
          )}
        </Scene>
      </main>
    );
  }

  if (stage === "score")
    return (
      <main className="experience trivia">
        <TriviaBar score={score} total={total} />
        {score === total && <Confetti seed={99} />}
        <Scene id="trivia-score" className="fade trivia-layout">
          <p className="eyebrow">Puntaje final</p>
          <p className="trivia-score">
            {score}
            <span> / {total}</span>
          </p>
          <p className="emotional small-text">
            {trivia.phrases[triviaTier(score, total)]}
          </p>
          <Button
            onClick={() => {
              saveLocal("trivia-prize", true);
              setStage("prize");
            }}
          >
            ¡VER EL PREMIO!
          </Button>
        </Scene>
      </main>
    );

  return (
    <main className="experience trivia">
      <TriviaBar score={score} total={total} />
      <Scene id="trivia-prize" className="fade trivia-layout">
        {!cameraOpen && (
          <>
            <p className="eyebrow">Tu premio</p>
            {trivia.prize.title && (
              <h1 className="emotional">{trivia.prize.title}</h1>
            )}
            {trivia.prize.image && (
              <figure className="trivia-image prize">
                { }
                <img src={triviaImagePath("premio")} alt="El premio" />
              </figure>
            )}
            {trivia.prize.text && (
              <p className="trivia-prize-text">{trivia.prize.text}</p>
            )}
          </>
        )}
        <RegisterMoment slot="trivia" onCamera={setCameraOpen} />
      </Scene>
    </main>
  );
}
