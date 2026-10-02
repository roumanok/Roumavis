/** Builds the printable A4 PDF with the five QR cards (runs in the browser). */
export type Card = { id: string; label: string; url: string };
const MM = 72 / 25.4;
// Card artwork is 1050×600 px (≈ 90 × 51.4 mm, business-card size).
const CARD_W = 90,
  CARD_H = (90 * 600) / 1050,
  PX = 90 / 1050;
// Where the QR goes inside the artwork, in artwork pixels.
const QR = { x: 340, y: 85, size: 352 };
// Same placement as the original sheet: two columns, three rows.
const SLOTS = [
  [10.4, 26],
  [101.6, 26],
  [10.4, 79.4],
  [101.6, 79.4],
  [10.4, 132.8],
];
async function bytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No pudimos cargar el diseño de las tarjetas.");
  return new Uint8Array(await res.arrayBuffer());
}
export async function buildCardsPdf(cards: Card[]) {
  const [{ PDFDocument, rgb }, QRCode] = await Promise.all([
    import("pdf-lib"),
    import("qrcode"),
  ]);
  const pdf = await PDFDocument.create();
  pdf.setTitle("Roumavis · Tarjetas QR");
  const page = pdf.addPage([210 * MM, 297 * MM]);
  const background = await pdf.embedPng(await bytes("/tarjetas/fondo.png"));
  const wine = rgb(124 / 255, 21 / 255, 33 / 255);
  for (const [i, card] of cards.entries()) {
    const [left, top] = SLOTS[i];
    const x0 = left * MM,
      yTop = (297 - top) * MM; // pdf-lib's origin is bottom-left
    page.drawImage(background, {
      x: x0,
      y: yTop - CARD_H * MM,
      width: CARD_W * MM,
      height: CARD_H * MM,
    });
    const icon = await pdf.embedPng(
      await bytes(`/tarjetas/icono-${card.id}.png`),
    );
    page.drawImage(icon, {
      x: x0,
      y: yTop - CARD_H * MM,
      width: 70 * PX * MM,
      height: 52 * PX * MM,
    });
    // Static QR, drawn as vector rectangles (merged horizontal runs).
    const qr = QRCode.create(card.url, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const cell = (QR.size / n) * PX * MM;
    const qx = x0 + QR.x * PX * MM,
      qyTop = yTop - QR.y * PX * MM;
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.modules.get(r, c)) {
          c++;
          continue;
        }
        const start = c;
        while (c < n && qr.modules.get(r, c)) c++;
        page.drawRectangle({
          x: qx + start * cell,
          y: qyTop - (r + 1) * cell - 0.02,
          width: (c - start) * cell + 0.02,
          height: cell + 0.04,
          color: wine,
        });
      }
    }
  }
  const out = await pdf.save();
  return new Blob([out.slice().buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}
