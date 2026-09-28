"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import {
  slots,
  photoPath,
  questions,
  type ContentResponse,
  type Survey,
  type MomentSlot,
  type MomentInfo,
} from "@/lib/models";
import RegisterMoment from "./RegisterMoment";
import { Button, ErrorMessage, Logo, PhotoFrame } from "./ui";
const sections = ["Historia", "Mensajes", "Momentos", "Encuesta"] as const;
function AdminMoment({ slot }: { slot: MomentSlot }) {
  const [version, setVersion] = useState(0),
    [exists, setExists] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const known = useCallback((value: boolean) => setExists(value), []);
  async function remove() {
    if (!confirm("¿Eliminar esta foto? Esta acción no se puede deshacer."))
      return;
    setBusy(true);
    setError("");
    try {
      const info = await api<MomentInfo>(`/api/moments/${slot}?info`);
      await api(`/api/moments/${slot}`, {
        method: "DELETE",
        headers: { "If-Match": info.version ?? "" },
      });
      setExists(false);
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-card">
      <h2>{slot}</h2>
      <RegisterMoment key={version} slot={slot} alwaysShow onKnown={known} />
      {exists && (
        <>
          <a
            className="text-button"
            href={`/api/moments/${slot}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver foto completa
          </a>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "Eliminando…" : "Eliminar foto"}
          </button>
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </section>
  );
}
export default function AdminPanel() {
  const [tab, setTab] = useState<(typeof sections)[number]>("Historia"),
    [data, setData] = useState<ContentResponse | null>(null),
    [survey, setSurvey] = useState<Survey | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const router = useRouter();
  const load = useCallback(async () => {
    try {
      const [content, result] = await Promise.all([
        api<ContentResponse>("/api/content"),
        api<{ survey: Survey | null }>("/api/survey"),
      ]);
      setData(content);
      setSurvey(result.survey);
      setDirty(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (!data || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await api<{ version: string }>("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setData({ ...data, version: result.version });
      setDirty(false);
      setMessage("Cambios guardados.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Roumavis</p>
          <h1>Administración</h1>
        </div>
        <Logo small />
      </header>
      <div className="actions">
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              confirm("Hay cambios sin guardar. ¿Descartarlos y actualizar?")
            )
              void load();
          }}
        >
          Actualizar datos
        </button>
        <button
          className="text-button"
          onClick={async () => {
            if (
              dirty &&
              !confirm("Hay cambios sin guardar. ¿Salir igualmente?")
            )
              return;
            try {
              await api("/api/logout", { method: "POST" });
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Cerrar sesión
        </button>
      </div>
      <nav className="admin-nav" aria-label="Secciones de administración">
        {sections.map((section) => (
          <Button
            key={section}
            className={tab === section ? "" : "secondary"}
            aria-pressed={tab === section}
            onClick={() => {
              setTab(section);
              setMessage("");
            }}
          >
            {section}
          </Button>
        ))}
      </nav>
      <ErrorMessage>{error}</ErrorMessage>
      <p className="admin-status" role="status">
        {message}
      </p>
      {!data && <p>Cargando contenido…</p>}
      {data && tab === "Historia" && (
        <div className="admin-grid">
          {data.content.history.map((entry, i) => (
            <section className="admin-card" key={entry.year}>
              <h2>{entry.year}</h2>
              <PhotoFrame
                src={photoPath(entry.year)}
                alt={`Foto de ${entry.year}`}
              />
              <label className="form-fields">
                Frase de {entry.year}
                <textarea
                  disabled={busy}
                  maxLength={1500}
                  value={entry.caption}
                  onChange={(e) => {
                    setData({
                      ...data,
                      content: {
                        ...data.content,
                        history: data.content.history.map((item, index) =>
                          index === i
                            ? { ...item, caption: e.target.value }
                            : item,
                        ),
                      },
                    });
                    setDirty(true);
                    setMessage("");
                  }}
                />
              </label>
            </section>
          ))}
        </div>
      )}
      {data && tab === "Mensajes" && (
        <div className="form-fields">
          {(["vista", "cama", "mesita"] as const).map((slot) => (
            <label key={slot}>
              /{slot}
              <textarea
                disabled={busy}
                rows={6}
                maxLength={3000}
                value={data.content[slot].text}
                onChange={(e) => {
                  setData({
                    ...data,
                    content: {
                      ...data.content,
                      [slot]: { text: e.target.value },
                    },
                  });
                  setDirty(true);
                  setMessage("");
                }}
              />
            </label>
          ))}
        </div>
      )}
      {data && (tab === "Historia" || tab === "Mensajes") && (
        <div className="admin-save">
          <Button disabled={busy || !dirty} onClick={() => void save()}>
            {busy ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
          </Button>
        </div>
      )}
      {tab === "Momentos" && (
        <div className="admin-grid">
          {slots.map((slot) => (
            <AdminMoment key={slot} slot={slot} />
          ))}
        </div>
      )}
      {tab === "Encuesta" &&
        (survey ? (
          <section>
            <p className="meta">
              Enviada el{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(survey.submittedAt))}
            </p>
            {questions.map((question, i) => (
              <div className="survey-answer" key={question}>
                <h3>{question}</h3>
                <p aria-label={`${survey.ratings[i]} de 5 corazones`}>
                  {"♥".repeat(survey.ratings[i])}
                  {"♡".repeat(5 - survey.ratings[i])} · {survey.ratings[i]}/5
                </p>
              </div>
            ))}
            {(
              [
                ["¿Repetirías este tipo de escapada?", survey.repeatTrip],
                ["¿Qué fue lo que más te gustó?", survey.favorite],
                ["¿Qué te hubiera gustado hacer?", survey.missed],
                ["Mensaje al creador", survey.message],
              ] as const
            ).map(([label, value]) => (
              <div className="survey-answer" key={label}>
                <h3>{label}</h3>
                <p>{value || "Sin respuesta escrita."}</p>
              </div>
            ))}
          </section>
        ) : (
          <p>Todavía no fue enviada.</p>
        ))}
    </main>
  );
}
