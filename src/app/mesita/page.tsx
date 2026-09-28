import { authenticated } from "@/lib/auth";
import Surprise from "@/components/Surprise";
import { Locked } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  return (await authenticated()) ? <Surprise slot="mesita" /> : <Locked />;
}
