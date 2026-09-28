"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, ErrorMessage, Logo, Scene } from "./ui";
export default function AdminLogin() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className="experience">
      <Scene id="login">
        <Logo small />
        <h1>Administración</h1>
        <form
          className="form-fields"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await api("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button disabled={busy}>{busy ? "INGRESANDO…" : "INGRESAR"}</Button>
          <ErrorMessage>{error}</ErrorMessage>
        </form>
      </Scene>
    </main>
  );
}
