import { authenticated } from "@/lib/auth";
import { LoadingHeart, Locked, Scene } from "@/components/ui";
export const dynamic = "force-dynamic";
// Placeholder until the trivia experience is defined; the printed QR already
// points here.
export default async function Page() {
  if (!(await authenticated())) return <Locked />;
  return (
    <main className="experience">
      <Scene id="trivia">
        <LoadingHeart label="Muy pronto…" />
      </Scene>
    </main>
  );
}
