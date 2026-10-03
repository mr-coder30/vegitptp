export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export function getOrderStatusMessage(status: OrderStatus) {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return {
        te: "మీ ఆర్డర్ ప్యాక్ చేయబడుతోంది",
        en: "Your order is being packed",
      };

    case "OUT_FOR_DELIVERY":
      return {
        te: "మీ ఆర్డర్ డెలివరీకి బయలుదేరింది",
        en: "Your order is out for delivery",
      };

    case "DELIVERED":
      return {
        te: "మీ ఆర్డర్ డెలివర్ చేయబడింది",
        en: "Your order has been delivered",
      };

    case "CANCELLED":
      return {
        te: "మీ ఆర్డర్ రద్దు చేయబడింది",
        en: "Your order has been cancelled",
      };

    default:
      return {
        te: "మీ ఆర్డర్ ప్రాసెస్ చేయబడుతోంది",
        en: "Your order is being processed",
      };
  }
}