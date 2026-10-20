"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
};

type PaymentAccount = {
  id: string;
  name: string;
  qrImageUrl: string | null;
  isActive: boolean;
};

type Order = {
  id: string;
  orderNumber: string;

  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    landmark: string | null;
    locality: string | null;
  };

  notes: string | null;

  deliverySlot: DeliverySlot;

  pricing: {
    subtotal: string;
    deliveryCharge: string;
    total: string;
  };

  payment: {
    method: "CASH" | "QR" | string;
    collected: boolean;
    collectedAt: string | null;
    accountId: string | null;
    accountName: string | null;
    account: PaymentAccount | null;
  };

  status: OrderStatus;

  createdAt: string;
  updatedAt: string;

  items: OrderItem[];
};

const statusOptions: {
  value: OrderStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "PENDING",
    label: "Packing",
    description: "Order is being prepared",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    description: "Order has been confirmed",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    description: "Order is with the delivery team",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    description: "Order has been delivered",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Order has been cancelled",
  },
];

function getStatusLabel(status: OrderStatus) {
  return (
    statusOptions.find(
      (option) => option.value === status
    )?.label || status
  );
}

function getStatusClasses(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "bg-[#FFF3D8] text-[#8A641C]";

    case "CONFIRMED":
      return "bg-[#EEF5F0] text-[#315C4C]";

    case "OUT_FOR_DELIVERY":
      return "bg-[#F9D8DF] text-[#A24F63]";

    case "DELIVERED":
      return "bg-[#D9E8DF] text-[#315C4C]";

    case "CANCELLED":
      return "bg-[#F1EEE8] text-[#777E79]";

    default:
      return "bg-[#F1EEE8] text-[#777E79]";
  }
}

function canTransitionTo(
  current: OrderStatus,
  next: OrderStatus
) {
  if (current === next) {
    return true;
  }

  if (current === "PENDING") {
    return (
      next === "CONFIRMED" ||
      next === "CANCELLED"
    );
  }

  if (current === "CONFIRMED") {
    return (
      next === "OUT_FOR_DELIVERY" ||
      next === "CANCELLED"
    );
  }

  if (current === "OUT_FOR_DELIVERY") {
    return next === "DELIVERED";
  }

  return false;
}

function getPaymentLabel(method: string) {
  if (method === "CASH") return "Cash";
  if (method === "QR") return "QR";
  return method;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDeliverySlot(slot: DeliverySlot) {
  if (!slot) {
    return "—";
  }

  if (slot.label) {
    return slot.label;
  }

  if (slot.startTime && slot.endTime) {
    return `${slot.startTime} – ${slot.endTime}`;
  }

  return slot.startTime || "—";
}

function formatQuantity(value: string) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "—";
  }

  if (quantity < 1) {
    const grams = Math.round(quantity * 1000);
    return `${grams} g`;
  }

  if (Number.isInteger(quantity)) {
    return `${quantity} kg`;
  }

  return `${quantity
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "")} kg`;
}

function formatAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toFixed(2)}`;
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "refresh"
    | "orders"
    | "customer"
    | "location"
    | "calendar"
    | "payment"
    | "note"
    | "chevron"
    | "check"
    | "phone"
    | "box";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "back") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14-5l-2 2" />
        <path d="M4 5v4h4" />
        <path d="M4 13a8 8 0 0 0 14 5l2-2" />
        <path d="M20 19v-4h-4" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg {...common}>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (name === "customer") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.6-3.5 2.9-5.5 7-5.5s6.4 2 7 5.5" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (name === "payment") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h3" />
      </svg>
    );
  }

  if (name === "note") {
    return (
      <svg {...common}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h5" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M6.5 3.5 9 3l2 5-2 1.5a14 14 0 0 0 5.5 5.5L16 13l5 2-.5 2.5C20.2 19.5 18.7 21 16.7 21 9.2 20.4 3.6 14.8 3 7.3 3 5.3 4.5 3.8 6.5 3.5Z" />
      </svg>
    );
  }

  if (name === "box") {
    return (
      <svg {...common}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus | null>(null);

  const [statusMessage, setStatusMessage] =
    useState("");

  async function loadOrder() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");
      setStatusMessage("");

      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to load order."
        );
      }

      if (!data?.order) {
        throw new Error(
          "Invalid order response."
        );
      }

      setOrder(data.order);
      setSelectedStatus(data.order.status);
    } catch (error) {
      console.error(
        "ADMIN_ORDER_DETAIL_ERROR:",
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

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function updateStatus(
    status: OrderStatus
  ) {
    if (!order || updatingStatus) {
      return;
    }

    if (status === order.status) {
      return;
    }

    if (
      !canTransitionTo(
        order.status,
        status
      )
    ) {
      setError(
        `Cannot change order from ${getStatusLabel(
          order.status
        )} to ${getStatusLabel(status)}.`
      );

      setSelectedStatus(order.status);
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");
      setStatusMessage("");

      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(
          order.id
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to update order status."
        );
      }

      /*
       * The PATCH endpoint intentionally returns
       * only the updated status metadata.
       *
       * Re-fetch the complete order instead of
       * replacing the full order object with the
       * smaller PATCH response.
       */
      await loadOrder();

      setStatusMessage(
        `Order marked as ${getStatusLabel(
          status
        ).toLowerCase()}.`
      );
    } catch (error) {
      console.error(
        "ADMIN_ORDER_STATUS_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update order status."
      );

      setSelectedStatus(order.status);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const totalItems = useMemo(() => {
    if (!order) return 0;

    return order.items.reduce(
      (sum, item) =>
        sum + Number(item.quantity),
      0
    );
  }, [order]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF7E8] text-[#24332D]">
        <header className="sticky top-0 z-40 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4">
            <Link
              href="/admin/orders"
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C]"
            >
              <Icon
                name="back"
                size={20}
              />
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Order
              </p>

              <div className="mt-1 h-5 w-32 animate-pulse rounded bg-[#E8E2D7]" />
            </div>
          </div>
        </header>

        <div className="space-y-3 px-4 pt-5">
          <Skeleton height="170px" />
          <Skeleton height="150px" />
          <Skeleton height="210px" />
          <Skeleton height="190px" />
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="min-h-screen bg-[#FFF7E8] px-4 text-[#24332D]">
        <header className="flex h-[68px] items-center gap-3">
          <Link
            href="/admin/orders"
            aria-label="Back to orders"
            className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)]"
          >
            <Icon
              name="back"
              size={20}
            />
          </Link>

          <h1 className="text-[19px] font-bold text-[#24483B]">
            Order
          </h1>
        </header>

        <div className="mt-10 rounded-[27px] border border-[#E5DED2] bg-white p-7 text-center shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#FFF3F3] text-[#9B5252]">
            !
          </div>

          <h2 className="mt-4 text-[15px] font-bold text-[#24332D]">
            Unable to load order
          </h2>

          <p className="mt-2 text-[11px] leading-5 text-[#6B756F]">
            {error}
          </p>

          <button
            type="button"
            onClick={loadOrder}
            className="mt-5 rounded-[15px] bg-[#315C4C] px-5 py-3 text-[11px] font-bold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-8 text-[#24332D]">
      <header className="sticky top-0 z-40 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/orders"
              aria-label="Back to orders"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] active:scale-95"
            >
              <Icon
                name="back"
                size={20}
              />
            </Link>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Order details
              </p>

              <h1 className="truncate text-[18px] font-bold tracking-tight text-[#24483B]">
                {order.orderNumber}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadOrder}
            disabled={loading || updatingStatus}
            aria-label="Refresh order"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] disabled:opacity-50 active:scale-95"
          >
            <Icon
              name="refresh"
              size={19}
            />
          </button>
        </div>
      </header>

      <div className="px-4 pt-5">
        {error && (
          <div className="mb-4 rounded-[21px] border border-[#E7CACA] bg-[#FFF3F3] px-4 py-3">
            <p className="text-[11px] font-bold text-[#9B5252]">
              {error}
            </p>
          </div>
        )}

        <section className="rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_32px_rgba(36,51,45,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                Order total
              </p>

              <p className="mt-1 text-[30px] font-bold tracking-tight text-[#24483B]">
                {formatAmount(
                  order.pricing.total
                )}
              </p>

              <p className="mt-1 text-[10px] text-[#8A928D]">
                Placed{" "}
                {formatDateTime(
                  order.createdAt
                )}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold ${getStatusClasses(
                order.status
              )}`}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <InfoTile
              icon="box"
              label="Items"
              value={`${totalItems} ${
                totalItems === 1
                  ? "item"
                  : "items"
              }`}
            />

            <InfoTile
              icon="calendar"
              label="Delivery"
              value={formatDeliverySlot(
                order.deliverySlot
              )}
            />
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
          <SectionTitle
            icon="customer"
            title="Customer"
          />

          <div className="mt-4">
            <p className="text-[16px] font-bold text-[#24332D]">
              {order.customer.name}
            </p>

            <a
              href={`tel:${order.customer.phone}`}
              className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-[#315C4C]"
            >
              <Icon
                name="phone"
                size={14}
              />

              {order.customer.phone}
            </a>
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
          <SectionTitle
            icon="location"
            title="Delivery"
          />

          <div className="mt-4 rounded-[19px] bg-[#EEF5F0] p-4">
            <p className="text-[12px] font-bold leading-5 text-[#315C4C]">
              {order.customer.address}
            </p>

            {order.customer.locality && (
              <p className="mt-1 text-[10px] text-[#6B756F]">
                {order.customer.locality}
              </p>
            )}

            {order.customer.landmark && (
              <p className="mt-1 text-[10px] text-[#6B756F]">
                Landmark:{" "}
                {order.customer.landmark}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[18px] bg-[#F8F6F0] px-4 py-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A928D]">
                Delivery slot
              </p>

              <p className="mt-1 text-[12px] font-bold text-[#24332D]">
                {formatDeliverySlot(
                  order.deliverySlot
                )}
              </p>
            </div>

            <Icon
              name="calendar"
              size={18}
            />
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
          <SectionTitle
            icon="box"
            title="Order items"
          />

          <div className="mt-4 divide-y divide-[#EEE9DF]">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-[#24332D]">
                    {item.name}
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A928D]">
                    {formatQuantity(
                      item.quantity
                    )}{" "}
                    ×{" "}
                    {formatAmount(
                      item.unitPrice
                    )}
                  </p>
                </div>

                <p className="shrink-0 text-[12px] font-bold text-[#24483B]">
                  {formatAmount(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-[#EEE9DF] pt-4">
            <PriceRow
              label="Subtotal"
              value={formatAmount(
                order.pricing.subtotal
              )}
            />

            <PriceRow
              label="Delivery charge"
              value={formatAmount(
                order.pricing.deliveryCharge
              )}
            />

            <div className="mt-3 flex items-center justify-between rounded-[18px] bg-[#EEF5F0] px-4 py-3">
              <p className="text-[12px] font-bold text-[#315C4C]">
                Total
              </p>

              <p className="text-[17px] font-bold text-[#24483B]">
                {formatAmount(
                  order.pricing.total
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
          <SectionTitle
            icon="payment"
            title="Payment"
          />

          <div className="mt-4 rounded-[20px] bg-[#F8F6F0] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A928D]">
                  Method
                </p>

                <p className="mt-1 text-[14px] font-bold text-[#24332D]">
                  {getPaymentLabel(
                    order.payment.method
                  )}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${
                  order.payment.collected
                    ? "bg-[#D9E8DF] text-[#315C4C]"
                    : "bg-[#FFF3D8] text-[#8A641C]"
                }`}
              >
                {order.payment.collected
                  ? "Collected"
                  : "Pending"}
              </span>
            </div>

            {order.payment.accountName && (
              <div className="mt-4 border-t border-[#E5DED2] pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A928D]">
                  QR account
                </p>

                <p className="mt-1 text-[11px] font-bold text-[#24332D]">
                  {order.payment.accountName}
                </p>
              </div>
            )}

            {order.payment.collectedAt && (
              <div className="mt-4 border-t border-[#E5DED2] pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A928D]">
                  Collected at
                </p>

                <p className="mt-1 text-[11px] font-bold text-[#24332D]">
                  {formatDateTime(
                    order.payment.collectedAt
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {order.notes && (
          <section className="mt-4 rounded-[26px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
            <SectionTitle
              icon="note"
              title="Customer note"
            />

            <div className="mt-4 rounded-[19px] bg-[#FFF7E8] p-4">
              <p className="text-[11px] leading-5 text-[#6B756F]">
                {order.notes}
              </p>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_32px_rgba(36,51,45,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                Management
              </p>

              <h2 className="mt-1 text-[18px] font-bold tracking-tight text-[#24483B]">
                Order status
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${getStatusClasses(
                order.status
              )}`}
            >
              Current
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {statusOptions.map(
              (option) => {
                const active =
                  selectedStatus ===
                  option.value;

                const transitionAllowed =
                  canTransitionTo(
                    order.status,
                    option.value
                  );

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={
                      updatingStatus ||
                      !transitionAllowed
                    }
                    onClick={() =>
                      updateStatus(
                        option.value
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-[19px] border p-3.5 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 ${
                      active
                        ? "border-[#315C4C] bg-[#EEF5F0]"
                        : "border-[#E5DED2] bg-[#FFFDF8]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${
                        active
                          ? "bg-[#315C4C] text-white"
                          : "bg-[#F1EEE8] text-[#8A928D]"
                      }`}
                    >
                      {active ? (
                        <Icon
                          name="check"
                          size={17}
                        />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[12px] font-bold ${
                          active
                            ? "text-[#315C4C]"
                            : "text-[#24332D]"
                        }`}
                      >
                        {option.label}
                      </span>

                      <span className="mt-0.5 block text-[9px] leading-4 text-[#8A928D]">
                        {option.description}
                      </span>
                    </span>

                    {active && (
                      <span className="shrink-0 text-[9px] font-bold text-[#315C4C]">
                        Active
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {statusMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-[17px] bg-[#EEF5F0] px-3 py-2.5 text-[10px] font-semibold text-[#315C4C]">
              <Icon
                name="check"
                size={14}
              />

              {statusMessage}
            </div>
          )}

          {updatingStatus && (
            <div className="mt-3 rounded-[17px] bg-[#F8F6F0] px-3 py-2.5 text-[10px] font-semibold text-[#6B756F]">
              Updating order status…
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[24px] border border-[#E5DED2] bg-white p-5 shadow-[0_8px_25px_rgba(36,51,45,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
            Order information
          </p>

          <div className="mt-4 space-y-3">
            <MetaRow
              label="Order number"
              value={order.orderNumber}
            />

            <MetaRow
              label="Order date"
              value={formatDate(
                order.createdAt
              )}
            />

            <MetaRow
              label="Placed at"
              value={formatTime(
                order.createdAt
              )}
            />

            <MetaRow
              label="Last updated"
              value={formatDateTime(
                order.updatedAt
              )}
            />
          </div>
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Skeleton({
  height,
}: {
  height: string;
}) {
  return (
    <div
      className="animate-pulse rounded-[27px] bg-white"
      style={{ height }}
    />
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon:
    | "customer"
    | "location"
    | "box"
    | "payment"
    | "note";
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon
          name={icon}
          size={17}
        />
      </div>

      <h2 className="text-[15px] font-bold text-[#24483B]">
        {title}
      </h2>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: "box" | "calendar";
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] bg-[#F8F6F0] px-3 py-3">
      <div className="flex items-center gap-1.5 text-[#315C4C]">
        <Icon
          name={icon}
          size={13}
        />

        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
          {label}
        </p>
      </div>

      <p className="mt-1.5 truncate text-[11px] font-bold text-[#24332D]">
        {value}
      </p>
    </div>
  );
}

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-[10px] text-[#6B756F]">
        {label}
      </p>

      <p className="text-[11px] font-semibold text-[#24332D]">
        {value}
      </p>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[10px] text-[#8A928D]">
        {label}
      </p>

      <p className="text-right text-[10px] font-semibold text-[#24332D]">
        {value}
      </p>
    </div>
  );
}