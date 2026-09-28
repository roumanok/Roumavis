"use client";
import { Button, Logo, Scene } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="experience">
      <Scene id="error">
        <Logo />
        <p className="emotional">No pudimos abrir este momento.</p>
        <Button onClick={reset}>VOLVER A INTENTAR</Button>
      </Scene>
    </main>
  );
}
