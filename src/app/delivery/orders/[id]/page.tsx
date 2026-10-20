import { redirect } from "next/navigation";
import { requireDeliveryBoy } from "@/lib/delivery-auth";
import DeliveryOrderPage from "./delivery-order-page";

export default async function Page() {
  const authenticated = await requireDeliveryBoy();

  if (!authenticated) {
    redirect("/delivery/login");
  }

  return <DeliveryOrderPage />;
}