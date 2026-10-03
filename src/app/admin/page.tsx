import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import AdminDashboard from "./admin-dashboard";

export default async function AdminDashboardPage() {
  const isAdmin = await requireAdmin();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}