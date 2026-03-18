import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminQrPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return <AdminDashboard tab="qr" />;
}
