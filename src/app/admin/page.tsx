import { authenticated } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";
export const dynamic = "force-dynamic";
export default async function Admin() {
  return (await authenticated("admin")) ? <AdminPanel /> : <AdminLogin />;
}
