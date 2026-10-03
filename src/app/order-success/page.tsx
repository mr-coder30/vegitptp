"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  vegetableId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: string;
  status: OrderStatus;
  deliverySlot: string;
  createdAt: string;
  items: OrderItem[];
};

function formatDeliverySlot(slot: string) {
  const slots: Record<string, string> = {
    MORNING_0630: "6:30 AM",
    MORNING_0800: "8:00 AM",
    MORNING_1000: "10:00 AM",
    EVENING_1800: "6:00 PM",
    EVENING_2000: "8:00 PM",
  };

  return slots[slot] ?? slot;
}

function formatQuantity(quantity: string) {
  const value = Number(quantity);

  if (value < 1) {
    return `${value * 1000} g`;
  }

  return `${value} kg`;
}

function getStatusMessage(status: OrderStatus) {
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

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case "DELIVERED":
      return {
        wrapper: "bg-green-50",
        icon: "bg-green-100 text-green-700",
        text: "text-green-800",
        subtext: "text-green-700",
      };

    case "OUT_FOR_DELIVERY":
      return {
        wrapper: "bg-blue-50",
        icon: "bg-blue-100 text-blue-700",
        text: "text-blue-800",
        subtext: "text-blue-700",
      };

    case "CANCELLED":
      return {
        wrapper: "bg-red-50",
        icon: "bg-red-100 text-red-700",
        text: "text-red-800",
        subtext: "text-red-700",
      };

    case "PENDING":
    case "CONFIRMED":
    default:
      return {
        wrapper: "bg-yellow-50",
        icon: "bg-yellow-100 text-yellow-700",
        text: "text-yellow-800",
        subtext: "text-yellow-700",
      };
  }
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();

  const orderNumber: string | null =
    searchParams.get("order");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!orderNumber) {
      setError("Order number not found.");
      setLoading(false);
      return;
    }

    const currentOrderNumber = orderNumber;

    async function fetchOrder() {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(
            currentOrderNumber
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load order."
          );
        }

        setOrder(data.order);
      } catch (error) {
        console.error(
          "ORDER_LOAD_ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load order."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <main className="min-h-[80vh] px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <p className="mt-4 text-sm text-gray-500">
              Loading your order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-[80vh] px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl">
              !
            </div>

            <h1 className="mt-5 text-xl font-bold">
              Unable to load order
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error ||
                "We couldn't find this order."}
            </p>

            <Link
              href="/"
              className="mt-6 block rounded-2xl bg-green-600 py-3.5 font-bold text-white"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const statusMessage =
    getStatusMessage(order.status);

  const statusStyle =
    getStatusStyle(order.status);

  return (
    <main className="min-h-[80vh] px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">
        {/* Success */}
        <div className="rounded-3xl border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-bold">
            Order placed!
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your order has been received successfully.
          </p>

          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Order number
            </p>

            <p className="mt-1 break-all text-lg font-bold">
              {order.orderNumber}
            </p>
          </div>
        </div>

        {/* Status */}
        <div
          className={`rounded-3xl p-5 ${statusStyle.wrapper}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${statusStyle.icon}`}
            >
              {order.status === "DELIVERED"
                ? "✓"
                : order.status ===
                  "OUT_FOR_DELIVERY"
                ? "🚚"
                : order.status ===
                  "CANCELLED"
                ? "!"
                : "📦"}
            </div>

            <div>
              <p
                className={`text-base font-bold ${statusStyle.text}`}
              >
                {statusMessage.te}
              </p>

              <p
                className={`mt-1 text-sm ${statusStyle.subtext}`}
              >
                {statusMessage.en}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Your vegetables
          </h2>

          <div className="mt-4 space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatQuantity(
                      item.quantity
                    )}{" "}
                    × ₹{item.unitPrice}
                  </p>
                </div>

                <p className="font-semibold">
                  ₹{item.total}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Bill details
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">
                Subtotal
              </span>

              <span>
                ₹{order.subtotal}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">
                Delivery
              </span>

              <span>
                {Number(
                  order.deliveryCharge
                ) === 0
                  ? "FREE"
                  : `₹${order.deliveryCharge}`}
              </span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>

                <span>
                  ₹{order.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Delivery details
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">
                Delivery slot
              </p>

              <p className="mt-1 font-medium">
                {formatDeliverySlot(
                  order.deliverySlot
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Address
              </p>

              <p className="mt-1 font-medium">
                {order.address}
              </p>
            </div>

            {order.landmark && (
              <div>
                <p className="text-xs text-gray-500">
                  Landmark
                </p>

                <p className="mt-1 font-medium">
                  {order.landmark}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-3xl bg-green-50 p-5">
          <p className="font-semibold text-green-800">
            💵 Cash on delivery
          </p>

          <p className="mt-1 text-sm text-green-700">
            Please keep ₹{order.total} ready
            when your order arrives.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-6">
          <Link
            href="/orders"
            className="block w-full rounded-2xl border border-green-600 py-3.5 text-center font-bold text-green-700"
          >
            View my orders
          </Link>

          <Link
            href="/"
            className="block w-full rounded-2xl bg-green-600 py-3.5 text-center font-bold text-white"
          >
            Continue shopping
          </Link>
        </div>

        <p className="pb-4 text-center text-xs text-gray-400">
          Thank you for choosing VegItPTP.
        </p>
      </div>
    </main>
  );
}