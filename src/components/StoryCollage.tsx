"use client";
import { useEffect, useState } from "react";
import { slots, labels, type MomentInfo } from "@/lib/models";
import { api } from "@/lib/client";
import { Button, ErrorMessage } from "./ui";
async function loadImage(url: string) {
  // Same-origin authenticated proxy keeps private photos exportable to canvas.
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok)
    throw new Error("No pudimos cargar una de las fotos. Intentá otra vez.");
  const blob = await response.blob(),
    objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
export async function makeCollage() {
  await document.fonts.ready;
  const photos = await Promise.all(
    slots.map(async (slot) => {
      const info = await api<MomentInfo>(`/api/moments/${slot}?info`);
      return info.exists ? loadImage(`/api/moments/${slot}`) : null;
    }),
  );
  const logo = await loadImage("/logo_roumavis.png");
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no pudo crear el recuerdo.");
  ctx.fillStyle = "#F5EEE6";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = "#C8AA7B";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, 1008, 1848);
  ctx.drawImage(logo, 454, 58, 172, 172);
  ctx.textAlign = "center";
  ctx.fillStyle = "#581C2B";
  ctx.font = '500 66px "Cormorant Garamond", Georgia';
  ctx.fillText("NUESTRO FINDE", 540, 300);
  ctx.font = "24px Manrope, sans-serif";
  ctx.fillText("10 — 12 · OCT · 2026", 540, 349);
  const positions = [
    { x: 80, y: 412, w: 424, h: 402, a: -0.045 },
    { x: 572, y: 428, w: 420, h: 400, a: 0.04 },
    { x: 72, y: 870, w: 426, h: 408, a: 0.028 },
    { x: 574, y: 886, w: 422, h: 402, a: -0.045 },
    { x: 239, y: 1340, w: 602, h: 420, a: 0.012 },
  ];
  positions.forEach((p, i) => {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.a);
    ctx.translate(-p.w / 2, -p.h / 2);
    ctx.shadowColor = "#581c2b22";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = "#fffaf3";
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.shadowColor = "transparent";
    const x = 15,
      y = 15,
      w = p.w - 30,
      h = p.h - 69;
    ctx.fillStyle = "#e9dfd4";
    ctx.fillRect(x, y, w, h);
    const image = photos[i];
    if (image) {
      // Fill the polaroid window (cover), cropping the overflow evenly.
      const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
      const sw = w / scale,
        sh = h / scale;
      ctx.drawImage(
        image,
        (image.naturalWidth - sw) / 2,
        (image.naturalHeight - sh) / 2,
        sw,
        sh,
        x,
        y,
        w,
        h,
      );
    } else {
      ctx.fillStyle = "#C99694";
      ctx.font = "70px Georgia";
      ctx.fillText("♡", p.w / 2, p.h / 2);
    }
    ctx.fillStyle = "#581C2B";
    ctx.font = '26px "Cormorant Garamond", Georgia';
    ctx.fillText(labels[slots[i]].replace(" ❤️", ""), p.w / 2, p.h - 22);
    ctx.restore();
  });
  ctx.fillStyle = "#581C2B";
  ctx.font = "26px Manrope, sans-serif";
  ctx.fillText("#NuestroFinde", 540, 1820);
  ctx.font = "18px Manrope, sans-serif";
  ctx.fillText("San Miguel del Monte · 2026", 540, 1855);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob)
    throw new Error("No pudimos generar el recuerdo. Intentá otra vez.");
  return blob;
}
export default function StoryCollage() {
  const [blob, setBlob] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [share, setShare] = useState(false);
  // External storage / browser resources are synchronized after hydration.
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(url);
    const file = new File([blob], "nuestro-finde.png", { type: "image/png" });
    setShare(!!navigator.canShare?.({ files: [file] }));
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      setBlob(await makeCollage());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {url && (
        <img
          className="collage-preview"
          src={url}
          alt="Nuestro recuerdo en cinco fotos"
          width={1080}
          height={1920}
        />
      )}
      {!blob ? (
        <Button disabled={busy} onClick={() => void create()}>
          {busy ? "CREANDO NUESTRO RECUERDO…" : "CREAR NUESTRO RECUERDO"}
        </Button>
      ) : (
        <>
          <a className="button" href={url} download="nuestro-finde.png">
            DESCARGAR PARA STORY
          </a>
          {share && (
            <Button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.share({
                    files: [
                      new File([blob], "nuestro-finde.png", {
                        type: "image/png",
                      }),
                    ],
                  });
                } catch (e) {
                  if ((e as Error).name !== "AbortError")
                    setError(
                      "No se pudo compartir. Podés descargar la imagen.",
                    );
                }
              }}
            >
              COMPARTIR
            </Button>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void create()}
          >
            Actualizar recuerdo
          </button>
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
