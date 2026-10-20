import { redirect } from "next/navigation";

import { requireDeliveryBoy } from "@/lib/delivery-auth";

export default async function DeliveryPage() {
  const authenticated =
    await requireDeliveryBoy();

  if (!authenticated) {
    redirect("/delivery/login");
  }

  return <DeliveryDashboard />;
}

async function DeliveryDashboard() {
  const Dashboard = (
    await import("./delivery-dashboard")
  ).default;

  return <Dashboard />;
}