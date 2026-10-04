import { authenticated } from "@/lib/auth";
import TriviaGame from "@/components/TriviaGame";
import { Locked } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  return (await authenticated()) ? <TriviaGame /> : <Locked />;
}
