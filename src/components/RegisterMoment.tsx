"use client";
import { useCallback, useEffect, useState } from "react";
import type { MomentInfo, MomentSlot } from "@/lib/models";
import { api } from "@/lib/client";
import CameraCapture from "./CameraCapture";
import { Button, ErrorMessage, PhotoFrame } from "./ui";
export default function RegisterMoment({
  slot,
  initialLabel = "📷 REGISTRAR MOMENTO",
  alwaysShow = false,
  onSaved,
  onKnown,
  onCamera,
  lead,
  hideChange = false,
}: {
  slot: MomentSlot;
  initialLabel?: string;
  alwaysShow?: boolean;
  onSaved?: () => void;
  onKnown?: (exists: boolean) => void;
  /** Notified when the camera opens/closes (to hide surrounding content). */
  onCamera?: (open: boolean) => void;
  /** Optional content shown between the photo and the buttons. */
  lead?: React.ReactNode;
  /** Hide "Cambiar foto" once a photo exists. */
  hideChange?: boolean;
}) {
  const [info, setInfo] = useState<MomentInfo | null>(null),
    [camera, setCamera] = useState(false),
    [open, setOpen] = useState(alwaysShow),
    [error, setError] = useState("");
  useEffect(() => {
    onCamera?.(camera);
  }, [camera, onCamera]);
  const refresh = useCallback(async () => {
    try {
      const data = await api<MomentInfo>(`/api/moments/${slot}?info`);
      setInfo(data);
      onKnown?.(data.exists);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slot, onKnown]);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function save(blob: Blob) {
    const form = new FormData();
    form.append("photo", blob, `${slot}.jpg`);
    form.append("version", info?.version ?? "");
    const data = await api<MomentInfo>(`/api/moments/${slot}`, {
      method: "PUT",
      body: form,
    });
    setInfo(data);
    setCamera(false);
    setOpen(true);
    onKnown?.(true);
    onSaved?.();
  }
  return (
    <div className="register-moment">
      <ErrorMessage>{error}</ErrorMessage>
      {error && (
        <button className="text-button" onClick={() => void refresh()}>
          Volver a cargar
        </button>
      )}
      {camera ? (
        <CameraCapture onSave={save} onCancel={() => setCamera(false)} />
      ) : (
        <>
          {open && (
            <div className="frame-with-action">
              <PhotoFrame
                fill
                key={info?.version ?? "empty"}
                src={
                  info?.exists
                    ? `/api/moments/${slot}?v=${encodeURIComponent(info.version ?? "")}`
                    : undefined
                }
                alt="Nuestro momento juntos"
              />
              {!info?.exists && (
                <Button
                  className="in-frame"
                  disabled={!info}
                  onClick={() => setCamera(true)}
                >
                  {!info && !error ? "CARGANDO…" : initialLabel}
                </Button>
              )}
            </div>
          )}
          {lead}
          {info?.exists ? (
            <>
              {!open && (
                <Button className="secondary" onClick={() => setOpen(true)}>
                  Ver nuestro momento ❤️
                </Button>
              )}
              {!hideChange && (
                <button className="text-button" onClick={() => setCamera(true)}>
                  Cambiar foto
                </button>
              )}
            </>
          ) : open ? null : (
            <Button
              className="secondary"
              disabled={!info}
              onClick={() => setCamera(true)}
            >
              {!info && !error ? "CARGANDO…" : initialLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
