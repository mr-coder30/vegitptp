"use client";

import { useEffect, useState } from "react";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

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
  customerName: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
  notes: string | null;
  deliverySlot: string;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
};

const statusOptions: {
  value: OrderStatus;
  label: string;
}[] = [
  {
    value: "PENDING",
    label: "Packing",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

function getSlotLabel(slot: string) {
  switch (slot) {
    case "MORNING_0630":
      return "6:30 AM";

    case "MORNING_0800":
      return "8:00 AM";

    case "MORNING_1000":
      return "10:00 AM";

    case "EVENING_1800":
      return "6:00 PM";

    case "EVENING_2000":
      return "8:00 PM";

    default:
      return slot;
  }
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Packing";

    case "CONFIRMED":
      return "Confirmed";

    case "OUT_FOR_DELIVERY":
      return "Out for delivery";

    case "DELIVERED":
      return "Delivered";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  async function loadOrders() {
    try {
      setError("");

      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load orders."
        );
      }

      setOrders(data.orders || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(
    order: Order,
    status: OrderStatus
  ) {
    if (order.status === status) {
      return;
    }

    setUpdatingId(order.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update order status."
        );
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: data.order.status,
              }
            : item
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <a
            href="/admin"
            className="text-sm font-medium text-green-600"
          >
            ← Back to dashboard
          </a>

          <h1 className="mt-3 text-3xl font-bold">
            Orders
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage customer orders and delivery status.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-center">
            <p className="font-semibold">
              No orders yet.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              New customer orders will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border bg-white p-5 shadow-sm"
              >
                {/* Order header */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Order
                    </p>

                    <h2 className="mt-1 font-bold">
                      {order.orderNumber}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(
                        order.createdAt
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-sm font-bold">
                      ₹{order.total}
                    </span>

                    <span className="text-xs font-medium text-gray-500">
                      {order.paymentMethod ===
                      "CASH_ON_DELIVERY"
                        ? "Cash on Delivery"
                        : order.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Customer */}
                <div className="grid gap-5 py-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Customer
                    </p>

                    <p className="mt-1 font-semibold">
                      {order.customerName}
                    </p>

                    <p className="text-sm text-gray-600">
                      {order.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Delivery
                    </p>

                    <p className="mt-1 font-semibold">
                      {getSlotLabel(
                        order.deliverySlot
                      )}
                    </p>

                    <p className="text-sm text-gray-600">
                      {order.address}
                    </p>

                    {order.locality && (
                      <p className="text-sm text-gray-600">
                        {order.locality}
                      </p>
                    )}

                    {order.landmark && (
                      <p className="text-sm text-gray-600">
                        Near {order.landmark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-bold">
                    Items
                  </p>

                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {item.name}
                          </span>

                          <span className="ml-2 text-gray-500">
                            {item.quantity} kg
                          </span>
                        </div>

                        <span className="font-semibold">
                          ₹{item.total}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t pt-3 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>

                      <span>
                        ₹{order.subtotal}
                      </span>
                    </div>

                    <div className="mt-1 flex justify-between">
                      <span>Delivery</span>

                      <span>
                        {Number(
                          order.deliveryCharge
                        ) === 0
                          ? "Free"
                          : `₹${order.deliveryCharge}`}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between font-bold">
                      <span>Total</span>

                      <span>
                        ₹{order.total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="mt-4 rounded-2xl bg-yellow-50 p-4">
                    <p className="text-xs font-bold text-yellow-800">
                      Customer note
                    </p>

                    <p className="mt-1 text-sm text-yellow-900">
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div className="mt-5 border-t pt-5">
                  <p className="text-sm font-bold">
                    Order Status
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={
                          updatingId === order.id
                        }
                        onClick={() =>
                          updateStatus(
                            order,
                            option.value
                          )
                        }
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          order.status ===
                          option.value
                            ? "bg-green-600 text-white"
                            : "border bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {updatingId === order.id &&
                        order.status !==
                          option.value
                          ? "Updating..."
                          : option.label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Current status:{" "}
                    <span className="font-semibold">
                      {getStatusLabel(
                        order.status
                      )}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}