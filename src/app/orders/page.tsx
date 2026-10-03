"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  deliverySlot: string;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
};

function formatDeliverySlot(slot: string): string {
  const slots: Record<string, string> = {
    MORNING_0630: "6:30 AM",
    MORNING_0800: "8:00 AM",
    MORNING_1000: "10:00 AM",
    EVENING_1800: "6:00 PM",
    EVENING_2000: "8:00 PM",
  };

  return slots[slot] ?? slot;
}

function formatQuantity(quantity: string): string {
  const value = Number(quantity);

  if (value < 1) {
    return `${value * 1000} g`;
  }

  return `${value} kg`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";

    case "OUT_FOR_DELIVERY":
      return "bg-orange-100 text-orange-700";

    case "DELIVERED":
      return "bg-green-100 text-green-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedCustomer = localStorage.getItem(
      "vegitptp-customer"
    );

    if (!savedCustomer) {
      setLoading(false);
      return;
    }

    let customer: {
      phone?: string;
    };

    try {
      customer = JSON.parse(savedCustomer);
    } catch {
      setError("Unable to read customer details.");
      setLoading(false);
      return;
    }

    const phone =
      typeof customer.phone === "string"
        ? customer.phone.trim()
        : "";

    if (!phone) {
      setLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        const response = await fetch(
          `/api/orders/customer?phone=${encodeURIComponent(
            phone
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load orders."
          );
        }

        setOrders(data.orders ?? []);
      } catch (err) {
        console.error("ORDERS_LOAD_ERROR:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load orders."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return (
      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <p className="mt-4 text-sm text-gray-500">
              Loading your orders...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border bg-white p-7 text-center shadow-sm">
            <h1 className="text-xl font-bold">
              Unable to load orders
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-2xl bg-green-600 px-6 py-3 font-bold text-white"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">
          My orders
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View your recent VegItPTP orders.
        </p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-3xl border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
              🥬
            </div>

            <h2 className="mt-5 text-lg font-bold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Your placed orders will appear here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-2xl bg-green-600 px-6 py-3 font-bold text-white"
            >
              Shop vegetables
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/order-success?order=${encodeURIComponent(
                  order.orderNumber
                )}`}
                className="block rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Order number
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {order.orderNumber}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  {formatDate(order.createdAt)}
                </p>

                <div className="mt-4 border-t pt-4">
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-600">
                          {item.name} ×{" "}
                          {formatQuantity(item.quantity)}
                        </span>

                        <span className="font-medium">
                          ₹{item.total}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.items.length > 3 && (
                    <p className="mt-2 text-xs text-gray-400">
                      + {order.items.length - 3} more item
                      {order.items.length - 3 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-gray-500">
                    Delivery
                  </span>

                  <span className="font-medium">
                    {formatDeliverySlot(order.deliverySlot)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-lg font-bold">
                    ₹{order.total}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}