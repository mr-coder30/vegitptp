import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await requireAdmin();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return children;
}