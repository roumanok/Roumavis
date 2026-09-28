"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { photoPath, type MomentInfo } from "@/lib/models";
import { compressImage } from "./CameraCapture";
import PhotoCropper, { type PhotoCropperHandle } from "./PhotoCropper";
import { Button, ErrorMessage, PhotoFrame } from "./ui";
/** Upload / reframe / remove the photo for one history year (admin only). */
export default function AdminHistoryPhoto({ year }: { year: number }) {
  const [info, setInfo] = useState<MomentInfo | null>(null),
    [editing, setEditing] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cropper = useRef<PhotoCropperHandle>(null);
  const refresh = useCallback(async () => {
    try {
      setInfo(await api<MomentInfo>(`/api/history/${year}?info`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [year]);
  // External storage is synchronized after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!editing) return;
    return () => URL.revokeObjectURL(editing);
  }, [editing]);
  async function pick(file: File) {
    setError("");
    try {
      setEditing(URL.createObjectURL(await compressImage(file)));
    } catch {
      setError("No pudimos leer esa foto. Probá otra en formato JPG o PNG.");
    }
  }
  async function save() {
    if (!cropper.current || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("photo", await cropper.current.crop(), `${year}.jpg`);
      if (info?.version) form.append("version", info.version);
      setInfo(
        await api<MomentInfo>(`/api/history/${year}`, {
          method: "PUT",
          body: form,
        }),
      );
      setEditing("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!info?.version || busy) return;
    if (!confirm(`¿Quitar la foto de ${year}? No se puede deshacer.`)) return;
    setBusy(true);
    setError("");
    try {
      setInfo(
        await api<MomentInfo>(`/api/history/${year}`, {
          method: "DELETE",
          headers: { "If-Match": info.version },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (editing)
    return (
      <div className="history-editor">
        <div className="photo-frame camera-frame">
          <PhotoCropper ref={cropper} src={editing} />
        </div>
        <p className="crop-hint">Arrastrá o pellizcá para acomodarla</p>
        <div className="actions">
          <Button
            className="secondary"
            disabled={busy}
            onClick={() => setEditing("")}
          >
            CANCELAR
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "GUARDANDO…" : "GUARDAR FOTO"}
          </Button>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    );
  return (
    <div className="history-photo">
      <PhotoFrame
        fill
        key={info?.version ?? "none"}
        src={info ? photoPath(year, info.version) : undefined}
        alt={`Foto de ${year}`}
      />
      <div className="history-photo-actions">
        <label className="file-picker">
          {info?.exists ? "Cambiar foto" : "📷 Subir foto"}
          <input
            type="file"
            accept="image/*"
            disabled={busy || !info}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pick(file);
            }}
          />
        </label>
        {info?.exists && (
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
