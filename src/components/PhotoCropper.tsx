"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/** Frame aspect (width / height). Matches .photo-inner (4:5). */
export const FRAME_RATIO = 4 / 5;
const OUTPUT_WIDTH = 1440;
const MAX_ZOOM = 4;

export type PhotoCropperHandle = { crop: () => Promise<Blob> };

type View = { zoom: number; x: number; y: number };

/**
 * Shows a photo filling the 4:5 frame (like object-fit: cover) and lets the
 * user drag to reposition and pinch / slider to zoom. `crop()` renders exactly
 * what is visible inside the frame to a JPEG.
 */
const PhotoCropper = forwardRef<PhotoCropperHandle, { src: string }>(
  function PhotoCropper({ src }, ref) {
    const box = useRef<HTMLDivElement>(null);
    const img = useRef<HTMLImageElement | null>(null);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(
      null,
    );
    const [width, setWidth] = useState(0);
    const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{
      view: View;
      cx: number;
      cy: number;
      dist: number;
    } | null>(null);

    useEffect(() => {
      const image = new Image();
      image.src = src;
      let alive = true;
      image
        .decode()
        .then(() => {
          if (!alive) return;
          img.current = image;
          setNatural({ w: image.naturalWidth, h: image.naturalHeight });
          setView({ zoom: 1, x: 0, y: 0 });
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [src]);

    useEffect(() => {
      const el = box.current;
      if (!el) return;
      const update = () => setWidth(el.clientWidth);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const W = width,
      H = width / FRAME_RATIO;
    const baseScale = natural ? Math.max(W / natural.w, H / natural.h) : 1;

    const clamp = useCallback(
      (v: View): View => {
        if (!natural || !W) return v;
        const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
        const s = baseScale * zoom;
        const maxX = Math.max(0, (natural.w * s - W) / 2);
        const maxY = Math.max(0, (natural.h * s - H) / 2);
        return {
          zoom,
          x: Math.min(maxX, Math.max(-maxX, v.x)),
          y: Math.min(maxY, Math.max(-maxY, v.y)),
        };
      },
      [natural, W, H, baseScale],
    );

    function snapshot() {
      const pts = [...pointers.current.values()];
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const dist =
        pts.length > 1
          ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          : 0;
      gesture.current = { view, cx, cy, dist };
    }

    function onPointerDown(e: React.PointerEvent) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      snapshot();
    }
    function onPointerMove(e: React.PointerEvent) {
      if (!pointers.current.has(e.pointerId) || !gesture.current) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      const g = gesture.current;
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      let zoom = g.view.zoom;
      if (pts.length > 1 && g.dist > 0) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        zoom = g.view.zoom * (dist / g.dist);
      }
      // Keep the point under the fingers steady while zooming.
      const ratio = Math.min(MAX_ZOOM, Math.max(1, zoom)) / g.view.zoom;
      const rect = box.current!.getBoundingClientRect();
      const px = g.cx - rect.left - W / 2,
        py = g.cy - rect.top - H / 2;
      setView(
        clamp({
          zoom,
          x: px - (px - g.view.x) * ratio + (cx - g.cx),
          y: py - (py - g.view.y) * ratio + (cy - g.cy),
        }),
      );
    }
    function onPointerUp(e: React.PointerEvent) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size) snapshot();
      else gesture.current = null;
    }
    function onWheel(e: React.WheelEvent) {
      setView((v) =>
        clamp({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 0.93) }),
      );
    }

    useImperativeHandle(
      ref,
      () => ({
        async crop() {
          const image = img.current;
          if (!image || !natural || !W)
            throw new Error("La foto todavía se está cargando.");
          const s = baseScale * view.zoom;
          const left = (W - natural.w * s) / 2 + view.x;
          const top = (H - natural.h * s) / 2 + view.y;
          const sx = -left / s,
            sy = -top / s,
            sw = W / s,
            sh = H / s;
          const outW = Math.round(Math.min(OUTPUT_WIDTH, sw));
          const outH = Math.round(outW / FRAME_RATIO);
          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No pudimos preparar la foto.");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.88),
          );
          if (!blob) throw new Error("No pudimos preparar la foto.");
          return blob;
        },
      }),
      [natural, W, H, baseScale, view],
    );

    const s = baseScale * view.zoom;
    return (
      <div className="cropper-wrap">
        <div
          ref={box}
          className="cropper"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          aria-label="Vista previa: arrastrá para mover, pellizcá para acercar"
          role="img"
        >
          {natural && W > 0 && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: natural.w * s,
                height: natural.h * s,
                transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
              }}
            />
          )}
        </div>
      </div>
    );
  },
);
export default PhotoCropper;
