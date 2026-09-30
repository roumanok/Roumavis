"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ErrorMessage } from "./ui";
import PhotoCropper, { type PhotoCropperHandle } from "./PhotoCropper";
export async function compressImage(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      3200 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos preparar la foto.");
    // Browser decoding applies EXIF orientation before drawing; JPEG output strips metadata.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    if (!result) throw new Error("No pudimos preparar la foto.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function CameraCapture({
  onSave,
  onCancel,
}: {
  onSave: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    active = useRef(true),
    generation = useRef(0),
    busy = useRef(false),
    cropper = useRef<PhotoCropperHandle>(null);
  const [photo, setPhoto] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const stop = useCallback(() => {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setReady(false);
  }, []);
  const start = useCallback(async () => {
    stop();
    setPhoto(null);
    setError("");
    const attempt = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1800 },
          height: { ideal: 1800 },
        },
        audio: false,
      });
      if (!active.current || attempt !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch {
      if (active.current)
        setError(
          "No pudimos abrir la cámara. Podés sacar o elegir una foto desde el botón de abajo.",
        );
    }
  }, [stop]);
  // Camera lifecycle intentionally synchronizes browser media and React state.
  useEffect(() => {
    active.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      active.current = false;
      // This is an async request generation counter, intentionally invalidated on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
      document.removeEventListener("visibilitychange", hide);
    };
  }, [start, stop]);
  // Each object URL is paired with cleanup when the captured Blob changes.
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function choose(blob: Blob) {
    stop();
    try {
      setPhoto(await compressImage(blob));
      setError("");
    } catch {
      setError("No pudimos leer esa foto. Probá otra en formato JPG o PNG.");
    }
  }
  async function capture() {
    if (!video.current?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    canvas.getContext("2d")?.drawImage(video.current, 0, 0);
    stop();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (blob) await choose(blob);
  }
  async function save() {
    if (!photo || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const cropped = cropper.current ? await cropper.current.crop() : photo;
      await onSave(cropped);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Tu foto sigue acá; intentá otra vez.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <div
      className="camera fade"
      role="region"
      aria-label="Registrar nuestro momento"
    >
      <div className="photo-frame camera-frame">
        {photo ? (
          preview && <PhotoCropper ref={cropper} src={preview} />
        ) : (
          <video
            ref={video}
            playsInline
            muted
            autoPlay
            onLoadedData={() => setReady(true)}
          />
        )}
      </div>
      {photo ? (
        <>
          <p className="crop-hint">Arrastrá o pellizcá para acomodarla</p>
          <div className="actions">
            <Button
              className="secondary"
              disabled={saving}
              onClick={() => void start()}
            >
              OTRA
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "GUARDANDO…" : "❤️ GUARDAR"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button
            className="shutter"
            disabled={!ready}
            onClick={() => void capture()}
          >
            📷 SACAR FOTO
          </Button>
          {!ready && (
            <button className="text-button" onClick={() => void start()}>
              Volver a abrir cámara
            </button>
          )}
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <div className="camera-links">
        {!photo ? (
          <label className="file-picker">
            Sacar o elegir una foto
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void choose(file);
              }}
            />
          </label>
        ) : (
          <span />
        )}
        <button
          className="text-button"
          disabled={saving}
          onClick={() => {
            stop();
            onCancel();
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
