import { authenticated } from "@/lib/auth";
import Survey from "@/components/Survey";
import { Locked } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  return (await authenticated()) ? <Survey /> : <Locked />;
}
