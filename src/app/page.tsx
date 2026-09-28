import { authenticated } from "@/lib/auth";
import Story from "@/components/Story";
import { Locked } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Home() {
  return (await authenticated()) ? <Story /> : <Locked />;
}
