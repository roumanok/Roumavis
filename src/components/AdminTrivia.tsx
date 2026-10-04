"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  triviaImagePath,
  type Trivia,
  type TriviaQuestion,
  type TriviaResult,
} from "@/lib/models";
import { compressImage } from "./CameraCapture";
import { Button, ErrorMessage } from "./ui";

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const LETTERS = ["A", "B", "C", "D", "E"];
const TIERS = [
  ["perfect", "Todas bien"],
  ["high", "70 % o más"],
  ["mid", "Entre 40 % y 69 %"],
  ["low", "Menos de 40 %"],
] as const;

/** Upload / replace / remove the photo of a question or of the prize. */
function TriviaPhoto({
  id,
  has,
  version,
  onChange,
}: {
  id: string;
  has: boolean;
  version: number;
  onChange: (has: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("photo", await compressImage(file), `${id}.jpg`);
      await api(`/api/trivia/image/${id}`, { method: "PUT", body: form });
      await onChange(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("¿Quitar esta foto?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/trivia/image/${id}`, { method: "DELETE" });
      await onChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="trivia-photo">
      {has && <img src={`${triviaImagePath(id)}?v=${version}`} alt="" />}
      <div className="history-photo-actions">
        <label className="file-picker">
          {busy ? "Subiendo…" : has ? "Cambiar foto" : "📷 Agregar foto"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {has && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void remove()}
          >
            Quitar foto
          </button>
        )}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}

export default function AdminTrivia() {
  const [trivia, setTrivia] = useState<Trivia | null>(null),
    [result, setResult] = useState<TriviaResult | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [photoVersion, setPhotoVersion] = useState(1);
  const load = useCallback(async () => {
    try {
      const data = await api<{ trivia: Trivia; result: TriviaResult | null }>(
        "/api/trivia",
      );
      setTrivia(data.trivia);
      setResult(data.result);
      setPhotoVersion(Date.now());
      setDirty(false);
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

  function update(next: Trivia) {
    setTrivia(next);
    setDirty(true);
    setMessage("");
  }
  function updateQuestion(i: number, patch: Partial<TriviaQuestion>) {
    if (!trivia) return;
    update({
      ...trivia,
      questions: trivia.questions.map((q, j) =>
        j === i ? { ...q, ...patch } : q,
      ),
    });
  }
  function validate(t: Trivia) {
    for (const [i, q] of t.questions.entries()) {
      if (!q.text.trim() && !q.image)
        return `La pregunta ${i + 1} no tiene texto ni foto.`;
      if (q.options.some((o) => !o.trim()))
        return `La pregunta ${i + 1} tiene una opción vacía.`;
    }
    return "";
  }
  async function save(next: Trivia | null = trivia, check = true) {
    if (!next || busy) return;
    const problem = check ? validate(next) : "";
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/trivia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setDirty(false);
      setMessage("Trivia guardada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Photo changes are saved right away so the flag never gets out of sync. */
  async function photoChanged(next: Trivia) {
    setTrivia(next);
    setPhotoVersion(Date.now());
    await save(next, false);
  }

  if (!trivia)
    return (
      <section className="admin-card">
        <p>Cargando la trivia…</p>
        <ErrorMessage>{error}</ErrorMessage>
      </section>
    );

  return (
    <div className="admin-trivia">
      <section className="admin-card">
        <h2>Resultado</h2>
        {result ? (
          <p>
            <strong>
              {result.score} de {result.total}
            </strong>{" "}
            correctas ·{" "}
            {new Date(result.finishedAt).toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : (
          <p className="meta">Todavía no la jugó.</p>
        )}
        <a className="text-button" href="/trivia" target="_blank">
          Ver la trivia
        </a>
      </section>

      {trivia.questions.map((q, i) => (
        <section className="admin-card trivia-q" key={q.id}>
          <div className="trivia-q-head">
            <h2>Pregunta {i + 1}</h2>
            <div className="trivia-q-tools">
              <button
                className="text-button"
                aria-label="Subir pregunta"
                disabled={i === 0}
                onClick={() => {
                  const qs = [...trivia.questions];
                  [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
                  update({ ...trivia, questions: qs });
                }}
              >
                ↑
              </button>
              <button
                className="text-button"
                aria-label="Bajar pregunta"
                disabled={i === trivia.questions.length - 1}
                onClick={() => {
                  const qs = [...trivia.questions];
                  [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
                  update({ ...trivia, questions: qs });
                }}
              >
                ↓
              </button>
              <button
                className="text-button danger-text"
                onClick={() => {
                  if (!confirm(`¿Eliminar la pregunta ${i + 1}?`)) return;
                  if (q.image)
                    void api(`/api/trivia/image/${q.id}`, {
                      method: "DELETE",
                    }).catch(() => {});
                  update({
                    ...trivia,
                    questions: trivia.questions.filter((_, j) => j !== i),
                  });
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
          <label className="form-fields">
            Pregunta
            <textarea
              value={q.text}
              maxLength={1000}
              onChange={(e) => updateQuestion(i, { text: e.target.value })}
            />
          </label>
          <TriviaPhoto
            id={q.id}
            has={q.image}
            version={photoVersion}
            onChange={(has) =>
              photoChanged({
                ...trivia,
                questions: trivia.questions.map((x, j) =>
                  j === i ? { ...x, image: has } : x,
                ),
              })
            }
          />
          <fieldset className="trivia-options">
            <legend>Opciones (marcá la correcta)</legend>
            {q.options.map((opt, k) => (
              <div className="trivia-option" key={k}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  aria-label={`Opción ${LETTERS[k]} es la correcta`}
                  checked={q.correct === k}
                  onChange={() => updateQuestion(i, { correct: k })}
                />
                <span className="trivia-letter">{LETTERS[k]}</span>
                <input
                  type="text"
                  value={opt}
                  maxLength={300}
                  aria-label={`Opción ${LETTERS[k]}`}
                  onChange={(e) =>
                    updateQuestion(i, {
                      options: q.options.map((o, m) =>
                        m === k ? e.target.value : o,
                      ),
                    })
                  }
                />
                {q.options.length > 2 && (
                  <button
                    className="text-button"
                    aria-label={`Quitar opción ${LETTERS[k]}`}
                    onClick={() => {
                      const options = q.options.filter((_, m) => m !== k);
                      const correct =
                        q.correct === k
                          ? 0
                          : q.correct > k
                            ? q.correct - 1
                            : q.correct;
                      updateQuestion(i, { options, correct });
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {q.options.length < 5 && (
              <button
                className="text-button"
                onClick={() =>
                  updateQuestion(i, { options: [...q.options, ""] })
                }
              >
                + Agregar opción
              </button>
            )}
          </fieldset>
        </section>
      ))}

      <Button
        className="secondary"
        onClick={() =>
          update({
            ...trivia,
            questions: [
              ...trivia.questions,
              {
                id: newId(),
                text: "",
                image: false,
                options: ["", ""],
                correct: 0,
              },
            ],
          })
        }
      >
        + AGREGAR PREGUNTA
      </Button>

      <section className="admin-card">
        <h2>Premio</h2>
        <label className="form-fields">
          Título
          <input
            type="text"
            value={trivia.prize.title}
            maxLength={200}
            onChange={(e) =>
              update({
                ...trivia,
                prize: { ...trivia.prize, title: e.target.value },
              })
            }
          />
        </label>
        <label className="form-fields">
          Texto
          <textarea
            value={trivia.prize.text}
            maxLength={3000}
            onChange={(e) =>
              update({
                ...trivia,
                prize: { ...trivia.prize, text: e.target.value },
              })
            }
          />
        </label>
        <TriviaPhoto
          id="premio"
          has={trivia.prize.image}
          version={photoVersion}
          onChange={(has) =>
            photoChanged({ ...trivia, prize: { ...trivia.prize, image: has } })
          }
        />
      </section>

      <section className="admin-card">
        <h2>Frases del final</h2>
        {TIERS.map(([key, label]) => (
          <label className="form-fields" key={key}>
            {label}
            <textarea
              value={trivia.phrases[key]}
              maxLength={500}
              onChange={(e) =>
                update({
                  ...trivia,
                  phrases: { ...trivia.phrases, [key]: e.target.value },
                })
              }
            />
          </label>
        ))}
      </section>

      <ErrorMessage>{error}</ErrorMessage>
      {message && (
        <p className="meta" role="status">
          {message}
        </p>
      )}
      <div className="admin-save">
        <Button disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? "GUARDANDO…" : "GUARDAR TRIVIA"}
        </Button>
      </div>
    </div>
  );
}
