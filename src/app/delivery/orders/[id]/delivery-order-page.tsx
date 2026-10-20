"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type OrderStatus =
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

type PaymentMethod = "CASH" | "QR";

type OrderItem = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
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
    name: string;
    phone: string;
    address: string;
    landmark: string | null;
    locality: string | null;
  };

  delivery: {
    slot: string;
    startTime: string;
    endTime: string | null;
    status: OrderStatus;
  };

  items: OrderItem[];

  pricing: {
    subtotal: string;
    deliveryCharge: string;
    total: string;
  };

  payment: {
    method: PaymentMethod;
    accountId: string | null;
    accountName: string | null;
    collected: boolean;
    collectedAt: string | null;
    account: PaymentAccount | null;
  };

  notes: string | null;

  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success?: boolean;
  order?: Order;
  error?: string;
};

function formatAmount(value: string) {
  const amount = Number(value);

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/*
 * Quantities below 1 kg are stored in kg,
 * but displayed to the delivery boy in grams.
 *
 * 0.25 → 250 g
 * 0.5  → 500 g
 * 0.75 → 750 g
 * 1    → 1 kg
 * 1.5  → 1.5 kg
 */
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "phone"
    | "location"
    | "clock"
    | "note"
    | "check"
    | "cash"
    | "qr"
    | "chevron";
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
        <path d="M15 18l-6-6 6-6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "note") {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
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

  if (name === "cash") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01M17 15h.01" />
      </svg>
    );
  }

  if (name === "qr") {
    return (
      <svg {...common}>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
        <path d="M14 14h3v3h-3zM18 18h2v2h-2zM17 14h3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#FFF7E8]">
      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="flex h-16 items-center">
          <div className="h-9 w-9 animate-pulse rounded-full bg-[#E5DED2]" />
        </div>

        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-[28px] bg-white" />
          <div className="h-36 animate-pulse rounded-[28px] bg-white" />
          <div className="h-64 animate-pulse rounded-[28px] bg-white" />
        </div>
      </div>
    </main>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#FFF7E8] px-4">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-[#E5DED2] bg-white p-6 text-center shadow-[0_12px_35px_rgba(36,51,45,0.07)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9D8DF] text-[#D98296]">
            !
          </div>

          <h1 className="text-lg font-bold text-[#24332D]">
            Unable to load order
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6B756F]">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-5 h-12 w-full rounded-2xl bg-[#315C4C] text-sm font-semibold text-white active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const styles = {
    CONFIRMED:
      "bg-[#EEF5F0] text-[#315C4C]",
    OUT_FOR_DELIVERY:
      "bg-[#F9D8DF] text-[#8D4E61]",
    DELIVERED:
      "bg-[#D9E8DF] text-[#24483B]",
  };

  const labels = {
    CONFIRMED: "Confirmed",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PaymentStatus({
  collected,
}: {
  collected: boolean;
}) {
  if (collected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D9E8DF] px-3 py-1.5 text-xs font-semibold text-[#24483B]">
        <Icon name="check" size={14} />
        Collected
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#F9D8DF] px-3 py-1.5 text-xs font-semibold text-[#8D4E61]">
      Pending
    </span>
  );
}

export default function DeliveryOrderPage() {
  const params = useParams();
  const router = useRouter();

  const orderId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [paymentChoice, setPaymentChoice] =
    useState<PaymentMethod | null>(null);

  const [qrAccounts, setQrAccounts] =
    useState<PaymentAccount[]>([]);

  const [selectedQrAccount, setSelectedQrAccount] =
    useState<string | null>(null);

  const [showPayment, setShowPayment] =
    useState(false);

  const [showQr, setShowQr] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/delivery/orders/${orderId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load order."
        );
      }

      if (!data.order) {
        throw new Error(
          "Order information is unavailable."
        );
      }

      setOrder(data.order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load order."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function startDelivery() {
    if (!order) return;

    try {
      setActionLoading(true);
      setActionError("");

      const response = await fetch(
        `/api/delivery/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: "OUT_FOR_DELIVERY",
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to start delivery."
        );
      }

      await loadOrder();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to start delivery."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function loadQrAccounts() {
    /*
     * The delivery screen only needs active accounts.
     * These come from the same PaymentAccount records
     * managed by the admin.
     */
    try {
      const response = await fetch(
        "/api/delivery/payment-accounts",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load QR accounts."
        );
      }

      const accounts: PaymentAccount[] =
        data.accounts || [];

      setQrAccounts(accounts);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to load QR accounts."
      );
    }
  }

  async function openPayment() {
    setActionError("");
    setPaymentChoice(null);
    setSelectedQrAccount(null);

    await loadQrAccounts();

    setShowPayment(true);
  }

  async function collectCash() {
    if (!order) return;

    try {
      setActionLoading(true);
      setActionError("");

      const response = await fetch(
        `/api/delivery/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            paymentMethod: "CASH",
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to record cash payment."
        );
      }

      setShowPayment(false);
      await loadOrder();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to record cash payment."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function collectQrPayment() {
    if (!order || !selectedQrAccount) {
      setActionError(
        "Select a QR receiving account."
      );
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      const response = await fetch(
        `/api/delivery/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            paymentMethod: "QR",
            paymentAccountId:
              selectedQrAccount,
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to record QR payment."
        );
      }

      setShowQr(false);
      setShowPayment(false);

      await loadOrder();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to record QR payment."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function markDelivered() {
    if (!order) return;

    if (!order.payment.collected) {
      setActionError(
        "Collect payment before marking the order delivered."
      );
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      const response = await fetch(
        `/api/delivery/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: "DELIVERED",
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to mark order delivered."
        );
      }

      await loadOrder();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to mark order delivered."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !order) {
    return (
      <ErrorState
        message={
          error ||
          "Order information is unavailable."
        }
        onRetry={loadOrder}
      />
    );
  }

  const canStartDelivery =
    order.delivery.status === "CONFIRMED";

  const canCollectPayment =
    order.delivery.status ===
      "OUT_FOR_DELIVERY" &&
    !order.payment.collected;

  const canDeliver =
    order.delivery.status ===
      "OUT_FOR_DELIVERY" &&
    order.payment.collected;

  const selectedAccount =
    qrAccounts.find(
      (account) =>
        account.id === selectedQrAccount
    );

  return (
    <main className="min-h-screen bg-[#FFF7E8]">
      <div className="mx-auto max-w-2xl px-4 pb-36">

        {/* Header */}
        <header className="flex h-16 items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.08)]"
            aria-label="Go back"
          >
            <Icon name="back" size={21} />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B756F]">
              Delivery
            </p>

            <h1 className="text-sm font-bold text-[#24332D]">
              {order.orderNumber}
            </h1>
          </div>

          <div className="w-10" />
        </header>

        {/* Order summary */}
        <section className="rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_14px_40px_rgba(36,51,45,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#6B756F]">
                Customer
              </p>

              <h2 className="mt-1 text-xl font-bold text-[#24332D]">
                {order.customer.name}
              </h2>
            </div>

            <StatusBadge
              status={order.delivery.status}
            />
          </div>

          <a
            href={`tel:${order.customer.phone}`}
            className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl bg-[#EEF5F0] px-4 text-sm font-semibold text-[#315C4C]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
              <Icon name="phone" size={17} />
            </span>

            {order.customer.phone}
          </a>
        </section>

        {/* Delivery information */}
        <section className="mt-4 rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
          <h2 className="text-base font-bold text-[#24332D]">
            Delivery details
          </h2>

          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F0] text-[#315C4C]">
                <Icon name="location" size={18} />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6B756F]">
                  Address
                </p>

                <p className="mt-1 text-sm font-semibold leading-5 text-[#24332D]">
                  {order.customer.address}
                </p>

                {order.customer.locality && (
                  <p className="mt-1 text-xs text-[#6B756F]">
                    {order.customer.locality}
                  </p>
                )}

                {order.customer.landmark && (
                  <p className="mt-1 text-xs text-[#6B756F]">
                    Landmark:{" "}
                    {order.customer.landmark}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F9D8DF] text-[#8D4E61]">
                <Icon name="clock" size={18} />
              </span>

              <div>
                <p className="text-xs font-medium text-[#6B756F]">
                  Delivery slot
                </p>

                <p className="mt-1 text-sm font-semibold text-[#24332D]">
                  {order.delivery.slot}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="mt-4 rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#24332D]">
              Order items
            </h2>

            <span className="text-xs font-medium text-[#6B756F]">
              {order.items.length}{" "}
              {order.items.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <div className="mt-4 divide-y divide-[#E5DED2]">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#24332D]">
                    {item.name}
                  </p>

                  <p className="mt-1 text-xs text-[#6B756F]">
                    {formatQuantity(
                      item.quantity
                    )}{" "}
                    ×{" "}
                    {formatAmount(
                      item.unitPrice
                    )}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold text-[#24332D]">
                  {formatAmount(item.total)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-4 rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
          <h2 className="text-base font-bold text-[#24332D]">
            Payment summary
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between text-[#6B756F]">
              <span>Subtotal</span>

              <span>
                {formatAmount(
                  order.pricing.subtotal
                )}
              </span>
            </div>

            <div className="flex justify-between text-[#6B756F]">
              <span>Delivery</span>

              <span>
                {formatAmount(
                  order.pricing.deliveryCharge
                )}
              </span>
            </div>

            <div className="my-3 border-t border-[#E5DED2]" />

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#24332D]">
                Total to collect
              </span>

              <span className="text-xl font-extrabold text-[#315C4C]">
                {formatAmount(
                  order.pricing.total
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Payment state */}
        <section className="mt-4 rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#24332D]">
              Collection
            </h2>

            <PaymentStatus
              collected={
                order.payment.collected
              }
            />
          </div>

          {order.payment.collected ? (
            <div className="mt-4 rounded-2xl bg-[#EEF5F0] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6B756F]">
                  Payment method
                </span>

                <span className="text-sm font-bold text-[#315C4C]">
                  {order.payment.method ===
                  "QR"
                    ? "QR"
                    : "CASH"}
                </span>
              </div>

              {order.payment.accountName && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6B756F]">
                    QR account
                  </span>

                  <span className="text-sm font-semibold text-[#24332D]">
                    {order.payment.accountName}
                  </span>
                </div>
              )}

              {order.payment.collectedAt && (
                <p className="mt-3 text-xs text-[#6B756F]">
                  Collected{" "}
                  {formatDate(
                    order.payment
                      .collectedAt
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[#F9D8DF] p-4">
              <p className="text-sm font-semibold text-[#8D4E61]">
                Payment has not been collected.
              </p>

              <p className="mt-1 text-xs leading-5 text-[#8D4E61]">
                Collect the full order amount before
                completing delivery.
              </p>
            </div>
          )}
        </section>

        {/* Notes */}
        {order.notes && (
          <section className="mt-4 rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F0] text-[#315C4C]">
                <Icon name="note" size={18} />
              </span>

              <div>
                <h2 className="text-sm font-bold text-[#24332D]">
                  Customer note
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#6B756F]">
                  {order.notes}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {actionError && (
          <div className="mt-4 rounded-2xl border border-[#F2A7B5] bg-[#F9D8DF] px-4 py-3 text-sm font-medium text-[#8D4E61]">
            {actionError}
          </div>
        )}
      </div>

      {/* Bottom action */}
      {order.delivery.status !==
        "DELIVERED" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5DED2] bg-[#FFF7E8]/95 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto max-w-2xl">
            {canStartDelivery && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={startDelivery}
                className="flex h-14 w-full items-center justify-center rounded-[20px] bg-[#315C4C] text-sm font-bold text-white shadow-[0_10px_25px_rgba(49,92,76,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading
                  ? "Starting..."
                  : "Start Delivery"}
              </button>
            )}

            {canCollectPayment && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={openPayment}
                className="flex h-14 w-full items-center justify-center rounded-[20px] bg-[#315C4C] text-sm font-bold text-white shadow-[0_10px_25px_rgba(49,92,76,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading
                  ? "Please wait..."
                  : `Collect ${formatAmount(
                      order.pricing.total
                    )}`}
              </button>
            )}

            {canDeliver && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={markDelivered}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#315C4C] text-sm font-bold text-white shadow-[0_10px_25px_rgba(49,92,76,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="check" size={19} />
                {actionLoading
                  ? "Completing..."
                  : "Mark Delivered"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment sheet */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#24332D]/30 px-0 backdrop-blur-[2px]">
          <div className="mx-auto w-full max-w-2xl rounded-t-[32px] bg-[#FFF7E8] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-15px_50px_rgba(36,51,45,0.2)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#D9D0C2]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B756F]">
                  Collect payment
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-[#24332D]">
                  {formatAmount(
                    order.pricing.total
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPayment(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6B756F]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {!paymentChoice && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentChoice("CASH")
                  }
                  className="flex min-h-32 flex-col items-center justify-center rounded-[24px] border border-[#E5DED2] bg-white p-4 text-center shadow-[0_8px_25px_rgba(36,51,45,0.05)] active:scale-[0.98]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#315C4C]">
                    <Icon
                      name="cash"
                      size={27}
                    />
                  </span>

                  <span className="mt-3 text-sm font-bold text-[#24332D]">
                    CASH
                  </span>

                  <span className="mt-1 text-xs text-[#6B756F]">
                    Customer pays cash
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentChoice("QR")
                  }
                  className="flex min-h-32 flex-col items-center justify-center rounded-[24px] border border-[#E5DED2] bg-white p-4 text-center shadow-[0_8px_25px_rgba(36,51,45,0.05)] active:scale-[0.98]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9D8DF] text-[#8D4E61]">
                    <Icon
                      name="qr"
                      size={27}
                    />
                  </span>

                  <span className="mt-3 text-sm font-bold text-[#24332D]">
                    QR
                  </span>

                  <span className="mt-1 text-xs text-[#6B756F]">
                    Customer pays by QR
                  </span>
                </button>
              </div>
            )}

            {paymentChoice === "CASH" && (
              <div className="mt-6">
                <div className="rounded-[24px] bg-white p-5 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#315C4C]">
                    <Icon
                      name="cash"
                      size={30}
                    />
                  </span>

                  <h3 className="mt-4 text-lg font-bold text-[#24332D]">
                    Confirm cash received
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#6B756F]">
                    Confirm that you physically
                    received{" "}
                    <strong className="text-[#24332D]">
                      {formatAmount(
                        order.pricing.total
                      )}
                    </strong>{" "}
                    from the customer.
                  </p>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={collectCash}
                    className="mt-5 h-13 w-full rounded-2xl bg-[#315C4C] text-sm font-bold text-white disabled:opacity-60"
                  >
                    {actionLoading
                      ? "Recording..."
                      : "Confirm Cash Received"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentChoice(null)
                    }
                    className="mt-3 h-11 w-full rounded-2xl text-sm font-semibold text-[#315C4C]"
                  >
                    Choose another method
                  </button>
                </div>
              </div>
            )}

            {paymentChoice === "QR" && (
              <div className="mt-6">
                {qrAccounts.length === 0 ? (
                  <div className="rounded-[24px] bg-white p-5 text-center">
                    <p className="text-sm font-semibold text-[#24332D]">
                      No active QR accounts
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#6B756F]">
                      Ask the admin to add an active
                      QR receiving account before
                      accepting QR payments.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentChoice(null)
                      }
                      className="mt-4 h-11 w-full rounded-2xl bg-[#EEF5F0] text-sm font-semibold text-[#315C4C]"
                    >
                      Go back
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#24332D]">
                      Select receiving account
                    </p>

                    <div className="mt-3 space-y-3">
                      {qrAccounts.map(
                        (account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() =>
                              setSelectedQrAccount(
                                account.id
                              )
                            }
                            className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left transition ${
                              selectedQrAccount ===
                              account.id
                                ? "border-[#315C4C] bg-[#EEF5F0]"
                                : "border-[#E5DED2] bg-white"
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                selectedQrAccount ===
                                account.id
                                  ? "bg-[#315C4C] text-white"
                                  : "bg-[#F2A7B5] text-[#8D4E61]"
                              }`}
                            >
                              <Icon
                                name="qr"
                                size={19}
                              />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-[#24332D]">
                                {account.name}
                              </span>

                              <span className="mt-0.5 block text-xs text-[#6B756F]">
                                Active receiving account
                              </span>
                            </span>

                            {selectedQrAccount ===
                              account.id && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#315C4C] text-white">
                                <Icon
                                  name="check"
                                  size={14}
                                />
                              </span>
                            )}
                          </button>
                        )
                      )}
                    </div>

                    {selectedAccount && (
                      <div className="mt-4 rounded-[24px] bg-white p-4">
                        <p className="text-center text-xs font-medium text-[#6B756F]">
                          Ask the customer to scan
                          this QR
                        </p>

                        <div className="mx-auto mt-4 flex aspect-square max-w-[250px] items-center justify-center overflow-hidden rounded-2xl border border-[#E5DED2] bg-white">
                          {selectedAccount.qrImageUrl ? (
                            <img
                              src={
                                selectedAccount.qrImageUrl
                              }
                              alt={`${selectedAccount.name} QR`}
                              className="h-full w-full object-contain p-3"
                            />
                          ) : (
                            <span className="text-sm text-[#6B756F]">
                              QR unavailable
                            </span>
                          )}
                        </div>

                        <div className="mt-4 rounded-2xl bg-[#EEF5F0] p-3 text-center">
                          <p className="text-xs text-[#6B756F]">
                            Amount to pay
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-[#315C4C]">
                            {formatAmount(
                              order.pricing.total
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            setShowQr(true)
                          }
                          className="mt-4 h-13 w-full rounded-2xl bg-[#315C4C] text-sm font-bold text-white disabled:opacity-60"
                        >
                          Customer Has Paid
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentChoice(null)
                      }
                      className="mt-3 h-11 w-full rounded-2xl text-sm font-semibold text-[#315C4C]"
                    >
                      Choose another method
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR verification confirmation */}
      {showQr && selectedAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#24332D]/40 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] bg-[#FFF7E8] p-5 shadow-[0_20px_60px_rgba(36,51,45,0.25)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D9E8DF] text-[#315C4C]">
              <Icon
                name="check"
                size={27}
              />
            </div>

            <h2 className="mt-4 text-center text-lg font-extrabold text-[#24332D]">
              Confirm payment received
            </h2>

            <p className="mt-2 text-center text-sm leading-6 text-[#6B756F]">
              Verify the customer's payment in
              your payment app before confirming.
            </p>

            <div className="mt-5 rounded-2xl bg-white p-4 text-center">
              <p className="text-xs text-[#6B756F]">
                Amount
              </p>

              <p className="mt-1 text-2xl font-extrabold text-[#315C4C]">
                {formatAmount(
                  order.pricing.total
                )}
              </p>

              <p className="mt-2 text-xs font-medium text-[#6B756F]">
                {selectedAccount.name}
              </p>
            </div>

            <button
              type="button"
              disabled={actionLoading}
              onClick={collectQrPayment}
              className="mt-5 h-13 w-full rounded-2xl bg-[#315C4C] text-sm font-bold text-white disabled:opacity-60"
            >
              {actionLoading
                ? "Recording..."
                : "Yes, Payment Received"}
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setShowQr(false)}
              className="mt-2 h-11 w-full rounded-2xl text-sm font-semibold text-[#6B756F]"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </main>
  );
}