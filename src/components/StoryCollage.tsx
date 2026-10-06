"use client";
import { useEffect, useState } from "react";
import { slots, type MomentInfo } from "@/lib/models";
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
/** Small heart (with a soft shadow and highlight) centred on cx, cy. */
function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rot: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const s = size / 240;
  ctx.scale(s, s);
  ctx.translate(-150, -154);
  const path = new Path2D(
    "M150 262 C 80 212 30 170 30 110 C 30 72 58 46 92 46 C 118 46 138 60 150 82 C 162 60 182 46 208 46 C 242 46 270 72 270 110 C 270 170 220 212 150 262 Z",
  );
  ctx.shadowColor = "#581c2b40";
  ctx.shadowBlur = 10 / s;
  ctx.shadowOffsetY = 3 / s;
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#fffaf3";
  ctx.lineWidth = 14;
  ctx.stroke(path);
  ctx.strokeStyle = "#ffffff66";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(78, 92);
  ctx.bezierCurveTo(68, 100, 62, 112, 62, 126);
  ctx.stroke();
  ctx.restore();
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
  ctx.drawImage(logo, 425, 44, 230, 230);
  ctx.textAlign = "center";
  // Polaroids whose photo window is 4:5, same as the captured selfies.
  // Album of six: two per row, in chronological order, slightly scattered.
  const polaroid = (x: number, y: number, w: number, a: number) => ({
    x,
    y,
    w,
    h: Math.round((w - 30) * 1.25) + 50,
    a,
  });
  const positions = [
    polaroid(112, 322, 392, -0.04),
    polaroid(568, 334, 392, 0.035),
    polaroid(124, 816, 392, 0.03),
    polaroid(556, 804, 392, -0.04),
    polaroid(108, 1300, 392, -0.025),
    polaroid(572, 1288, 392, 0.04),
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
      h = p.h - 50;
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
    // Little hearts resting on two opposite corners (alternating per photo).
    const colors = ["#581C2B", "#C99694", "#7A2A3D", "#C8AA7B"];
    const corners =
      i % 2 === 0
        ? [
            [6, 8, -0.35],
            [p.w - 6, p.h - 8, 0.3],
          ]
        : [
            [p.w - 6, 8, 0.35],
            [6, p.h - 8, -0.3],
          ];
    corners.forEach(([cx, cy, rot], k) =>
      drawHeart(ctx, cx, cy, k ? 34 : 42, rot, colors[(i + k * 2) % 4]),
    );
    ctx.restore();
  });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob)
    throw new Error("No pudimos generar el recuerdo. Intentá otra vez.");
  return blob;
}
export default function StoryCollage({
  onStart,
  autoStart = false,
}: {
  /** If set, the create button hands off to the parent instead. */
  onStart?: () => void;
  autoStart?: boolean;
} = {}) {
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
  useEffect(() => {
    if (autoStart) void create();
  }, [autoStart]);
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
          alt="Nuestro recuerdo en seis fotos"
          width={1080}
          height={1920}
        />
      )}
      {!blob ? (
        <Button
          disabled={busy}
          onClick={() => (onStart ? onStart() : void create())}
        >
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
