import { Logo, Scene } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="experience">
      <Scene id="not-found">
        <Logo />
        <p className="emotional">Este momento no está acá.</p>
        <p>Volvé a abrir el enlace de tu tarjeta.</p>
      </Scene>
    </main>
  );
}
