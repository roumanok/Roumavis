"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { buildCardsPdf, type Card } from "@/lib/cards-pdf";
import { Button, ErrorMessage } from "./ui";
export default function AdminCards() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cards, setCards] = useState<Card[] | null>(null);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ cards: Card[] }>("/api/tarjetas");
      setCards(data.cards);
      const blob = await buildCardsPdf(data.cards);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "roumavis-tarjetas-qr.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-card">
      <h2>Tarjetas QR</h2>
      <p>
        PDF A4 con las cinco tarjetas listas para imprimir (tamaño tarjeta
        personal). Los QR son estáticos: apuntan directo a esta web y no vencen.
      </p>
      <Button disabled={busy} onClick={() => void download()}>
        {busy ? "GENERANDO…" : "DESCARGAR PDF"}
      </Button>
      <ErrorMessage>{error}</ErrorMessage>
      {cards && (
        <ul className="card-links">
          {cards.map((card) => (
            <li key={card.id}>
              <strong>{card.label}</strong>
              <a href={card.url} target="_blank" rel="noreferrer">
                Probar enlace
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
