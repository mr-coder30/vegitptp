"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useLanguage } from "@/components/language/language-provider";
import { formatTranslation, type TranslationDictionary } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

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
  nameEn: string;
  nameTe: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

type DeliverySlot = {
  id?: string | null;
  label?: string | null;
  startTime?: string | null;
  endTime?: string | null;
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

  deliverySlot?: DeliverySlot | string | null;
  deliverySlotId?: string | null;
  deliverySlotLabel?: string | null;
  deliverySlotStartTime?: string | null;
  deliverySlotEndTime?: string | null;

  createdAt: string;
  items: OrderItem[];
};

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function PackageIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 7 8-4 8 4v10l-8 4-8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M12 11v10" />
    </svg>
  );
}

function TruckIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="6"
        width="18"
        height="12"
        rx="2.5"
      />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="16"
        rx="2.5"
      />
      <path d="M7 3v4M17 3v4M3.5 9h17" />
    </svg>
  );
}

/*
 * Dynamic delivery slots are returned from the database.
 *
 * Prefer deliverySlotLabel.
 * The older slot-ID mapping remains only as a fallback so
 * older orders/responses do not break.
 */
function formatDeliverySlot(order: Order) {
  // New API relation object
  if (
    order.deliverySlot &&
    typeof order.deliverySlot === "object"
  ) {
    if (order.deliverySlot.label?.trim()) {
      return order.deliverySlot.label.trim();
    }

    if (
      order.deliverySlot.startTime &&
      order.deliverySlot.endTime
    ) {
      return `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}`;
    }

    if (order.deliverySlot.startTime) {
      return order.deliverySlot.startTime;
    }
  }

  // Flattened API fields
  if (order.deliverySlotLabel?.trim()) {
    return order.deliverySlotLabel.trim();
  }

  if (
    order.deliverySlotStartTime &&
    order.deliverySlotEndTime
  ) {
    return `${order.deliverySlotStartTime} – ${order.deliverySlotEndTime}`;
  }

  if (order.deliverySlotStartTime) {
    return order.deliverySlotStartTime;
  }

  // Legacy string fallback
  const slot =
    typeof order.deliverySlot === "string"
      ? order.deliverySlot
      : order.deliverySlotId ?? "";

  const legacySlots: Record<string, string> = {
    MORNING_0630: "6:30 AM",
    MORNING_0800: "8:00 AM",
    MORNING_1000: "10:00 AM",
    EVENING_1800: "6:00 PM",
    EVENING_2000: "8:00 PM",
  };

  return legacySlots[slot] ?? slot;
}

function formatQuantity(
  quantity: string,
  gram: string,
  kilogram: string
) {
  const value = Number(quantity);

  if (!Number.isFinite(value)) {
    return quantity;
  }

  if (value < 1) {
    return `${value * 1000} ${gram}`;
  }

  return `${value} ${kilogram}`;
}

function formatOrderDate(date: string, language: "en" | "te") {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusMessage(
  status: OrderStatus,
  labels: TranslationDictionary["status"],
  orderText: TranslationDictionary["orderSuccess"]
) {
  switch (status) {
    case "PENDING":
      return {
        label: labels.pending,
        description: orderText.receivedDescription,
      };

    case "CONFIRMED":
      return {
        label: labels.confirmed,
        description: labels.confirmedDescription,
      };

    case "OUT_FOR_DELIVERY":
      return {
        label: labels.outForDelivery,
        description: labels.outForDeliveryDescription,
      };

    case "DELIVERED":
      return {
        label: labels.delivered,
        description: labels.deliveredDescription,
      };

    case "CANCELLED":
      return {
        label: labels.cancelled,
        description: labels.cancelledDescription,
      };

    default:
      return {
        label: labels.pending,
        description: labels.pendingDescription,
      };
  }
}

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case "DELIVERED":
      return {
        wrapper:
          "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        icon:
          "bg-[var(--brand-primary)] text-white",
        text: "text-[var(--brand-primary)]",
        subtext: "text-[var(--text-muted)]",
        badge:
          "bg-[var(--brand-border)] text-[var(--brand-primary)]",
      };

    case "OUT_FOR_DELIVERY":
      return {
        wrapper:
          "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        icon:
          "bg-[var(--brand-primary)] text-white",
        text: "text-[var(--brand-primary)]",
        subtext: "text-[var(--text-muted)]",
        badge:
          "bg-[var(--brand-border)] text-[var(--brand-primary)]",
      };

    case "CANCELLED":
      return {
        wrapper:
          "border-[var(--danger-border)] bg-[var(--danger-soft)]",
        icon:
          "bg-[var(--danger)] text-white",
        text: "text-[var(--danger-text)]",
        subtext: "text-[var(--danger-text)]",
        badge:
          "bg-[var(--danger-border)] text-[var(--danger-text)]",
      };

    case "PENDING":
    case "CONFIRMED":
    default:
      return {
        wrapper:
          "border-[var(--gold-border)] bg-[var(--app-background)]",
        icon:
          "bg-[var(--gold)] text-white",
        text: "text-[var(--gold)]",
        subtext: "text-[var(--gold)]",
        badge:
          "bg-[var(--gold-soft)] text-[var(--gold)]",
      };
  }
}

function StatusIcon({
  status,
}: {
  status: OrderStatus;
}) {
  if (status === "DELIVERED") {
    return <CheckIcon />;
  }

  if (status === "OUT_FOR_DELIVERY") {
    return <TruckIcon />;
  }

  if (status === "CANCELLED") {
    return (
      <span className="text-xl font-bold">
        ×
      </span>
    );
  }

  return <PackageIcon />;
}

function getStatusSteps(
  status: OrderStatus,
  labels: TranslationDictionary["orders"]
) {
  if (status === "CANCELLED") {
    return [];
  }

  const steps: {
    key: OrderStatus;
    label: string;
  }[] = [
    {
      key: "PENDING",
      label: labels.stepPlaced,
    },
    {
      key: "CONFIRMED",
      label: labels.stepConfirmed,
    },
    {
      key: "OUT_FOR_DELIVERY",
      label: labels.stepDelivery,
    },
    {
      key: "DELIVERED",
      label: labels.stepDone,
    },
  ];

  const currentIndex = steps.findIndex(
    (step) => step.key === status
  );

  return steps.map((step, index) => ({
    ...step,
    complete:
      status === "DELIVERED" ||
      index < currentIndex,
    current: index === currentIndex,
  }));
}

export default function OrderSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const t = useTranslations();

  const orderNumber =
    searchParams.get("order");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<"notFound" | "loadError" | "">("");

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/orders");
  }

  useEffect(() => {
    if (!orderNumber) {
      queueMicrotask(() => {
        setError("notFound");
        setLoading(false);
      });
      return;
    }

    const currentOrderNumber =
      orderNumber;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/orders/${encodeURIComponent(
            currentOrderNumber
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            response.status === 404 ? "notFound" : "loadError"
          );
          return;
        }

        setOrder(data.order);
      } catch (error) {
        console.error(
          "ORDER_LOAD_ERROR:",
          error
        );

        setError("loadError");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="flex h-11 w-11 animate-pulse rounded-[15px] bg-[var(--brand-border)]" />

          <div className="mt-5 overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-white p-6 text-center shadow-[0_18px_50px_rgba(37,51,43,0.07)]">
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-[var(--brand-border)]" />

            <div className="mx-auto mt-6 h-8 w-48 animate-pulse rounded-xl bg-[var(--border-default)]" />

            <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded-lg bg-[var(--surface-warm)]" />

            <div className="mt-7 h-20 animate-pulse rounded-[22px] bg-[var(--surface-warm)]" />
          </div>

          <div className="mt-4 h-28 animate-pulse rounded-[28px] bg-white" />

          <div className="mt-4 h-56 animate-pulse rounded-[28px] bg-white" />

          <div className="mt-4 h-48 animate-pulse rounded-[28px] bg-white" />
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
          >
            <ArrowLeftIcon />
          </button>

          <section className="mt-5 rounded-[30px] border border-[var(--border-default)] bg-white p-7 text-center shadow-[0_18px_50px_rgba(37,51,43,0.08)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-soft)] text-2xl font-bold text-[var(--danger-text)]">
              !
            </div>

            <h1 className="mt-5 text-[24px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
              {t.orderSuccess.loadError}
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {error === "notFound"
                ? t.orderSuccess.notFound
                : t.orderSuccess.loadError}
            </p>

            <Link
              href="/orders"
              className="mt-6 flex min-h-[54px] items-center justify-between rounded-[19px] bg-[var(--brand-primary)] px-5 font-bold text-white shadow-[0_12px_28px_rgba(40,90,67,0.20)] transition active:scale-[0.985]"
            >
              <span>{t.orderSuccess.viewOrders}</span>
              <ArrowRightIcon />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const statusMessage =
    getStatusMessage(
      order.status,
      t.status,
      t.orderSuccess
    );

  const statusStyle =
    getStatusStyle(order.status);

  const statusSteps =
    getStatusSteps(order.status, t.orders);

  const isCancelled =
    order.status === "CANCELLED";

  const deliverySlot =
    formatDeliverySlot(order);

  return (
    <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-6">
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          aria-label={t.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
        >
          <ArrowLeftIcon />
        </button>

        {/* Success hero */}
        <section className="mt-5 overflow-hidden rounded-[30px] border border-[var(--brand-border)] bg-white shadow-[0_20px_55px_rgba(37,51,43,0.09)]">
          <div className="px-6 pb-6 pt-7 text-center">
            <div className="mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[var(--brand-soft)] shadow-[inset_0_0_0_8px_var(--surface-soft)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_10px_24px_rgba(40,90,67,0.22)]">
                <CheckIcon className="h-7 w-7" />
              </div>
            </div>

            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
              VegItPTP
            </p>

            <h1 className="mt-1 text-[30px] font-bold tracking-[-0.045em] text-[var(--app-foreground)]">
              {t.orderSuccess.placedTitle}
            </h1>

            <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-[var(--text-muted)]">
              {t.orderSuccess.placedDescription}
            </p>

            <div className="mt-6 rounded-[22px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 py-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--tone-light)]">
                {t.orderSuccess.orderNumber}
              </p>

              <p className="mt-1.5 break-all text-[17px] font-bold tracking-[0.01em] text-[var(--brand-primary)]">
                {order.orderNumber}
              </p>
            </div>

            {order.createdAt && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--tone-light)]">
                <CalendarIcon />
                {formatOrderDate(order.createdAt, language)}
              </div>
            )}
          </div>
        </section>

        {/* Current status */}
        <section
          className={`mt-4 rounded-[28px] border p-5 shadow-[0_12px_32px_rgba(37,51,43,0.05)] ${statusStyle.wrapper}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${statusStyle.icon}`}
            >
              <StatusIcon
                status={order.status}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-[16px] font-bold ${statusStyle.text}`}
              >
                {statusMessage.label}
              </p>

              <p
                className={`mt-1 text-sm ${statusStyle.subtext}`}
              >
                {statusMessage.description}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${statusStyle.badge}`}
            >
              {order.status ===
              "OUT_FOR_DELIVERY"
                ? t.orderSuccess.onTheWay
                : order.status ===
                    "DELIVERED"
                  ? t.orderSuccess.complete
                  : order.status ===
                      "CANCELLED"
                    ? t.status.cancelled
                    : t.status.pending}
            </span>
          </div>
        </section>

        {/* Progress */}
        {!isCancelled &&
          statusSteps.length > 0 && (
            <section className="mt-4 rounded-[28px] border border-[var(--border-default)] bg-white p-5 shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
              <div className="mb-5">
                <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
                  {t.orderSuccess.progress}
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t.orderSuccess.progressDescription}
                </p>
              </div>

              <div className="space-y-0">
                {statusSteps.map(
                  (step, index) => {
                    const last =
                      index ===
                      statusSteps.length - 1;

                    return (
                      <div
                        key={step.key}
                        className="flex gap-3"
                      >
                        <div className="flex w-8 flex-col items-center">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              step.complete ||
                              step.current
                                ? "bg-[var(--brand-primary)] text-white"
                                : "border border-[var(--brand-border)] bg-white text-[var(--tone-placeholder)]"
                            }`}
                          >
                            {step.complete ||
                            step.current ? (
                              <CheckIcon className="h-4 w-4" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-current" />
                            )}
                          </div>

                          {!last && (
                            <div
                              className={`my-1 h-8 w-px ${
                                step.complete
                                  ? "bg-[var(--brand-primary)]"
                                  : "bg-[var(--border-default)]"
                              }`}
                            />
                          )}
                        </div>

                        <div
                          className={`${
                            last
                              ? "pb-0"
                              : "pb-5"
                          }`}
                        >
                          <p
                            className={`text-sm font-bold ${
                              step.current ||
                              step.complete
                                ? "text-[var(--brand-primary)]"
                                : "text-[var(--tone-light)]"
                            }`}
                          >
                            {step.label}
                          </p>

                          <p className="mt-0.5 text-[11px] text-[var(--tone-light)]">
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

        {/* Items */}
        <section className="mt-4 overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-white shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
          <div className="border-b border-[var(--surface-warm)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
                  {t.orderSuccess.vegetables}
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {order.items.length}{" "}
                  {order.items.length === 1
                    ? t.common.item
                    : t.common.items}{" "}
                  {t.orderSuccess.inOrder}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <PackageIcon />
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              {order.items.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--surface-warm)] text-[var(--tone-light)]">
                        <PackageIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--app-foreground)]">
                          {language === "te"
                            ? item.nameTe || item.nameEn || item.name
                            : item.nameEn || item.nameTe || item.name}
                        </p>

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {formatQuantity(
                            item.quantity,
                            t.common.gram,
                            t.common.kilogram
                          )}{" "}
                          × ₹
                          {item.unitPrice}
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-[var(--app-foreground)]">
                      ₹{item.total}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Bill */}
        <section className="mt-4 rounded-[28px] border border-[var(--border-default)] bg-white p-5 shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
          <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
            {t.orderSuccess.bill}
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                {t.common.subtotal}
              </span>

              <span className="font-semibold text-[var(--app-foreground)]">
                ₹{order.subtotal}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                {t.common.delivery}
              </span>

              <span className="font-semibold text-[var(--app-foreground)]">
                ₹{order.deliveryCharge}
              </span>
            </div>

            <div className="my-4 h-px bg-[var(--surface-warm)]" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {t.common.total}
                </p>

                <p className="mt-1 text-[25px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
                  ₹{order.total}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <CashIcon />
              </div>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="mt-4 overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-white shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
          <div className="border-b border-[var(--surface-warm)] px-5 py-4">
            <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
              {t.orderSuccess.deliveryDetails}
            </h2>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {t.orderSuccess.selectedDelivery}
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <ClockIcon />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--tone-light)]">
                  {t.common.deliverySlot}
                </p>

                <p className="mt-1 text-sm font-bold text-[var(--app-foreground)]">
                  {deliverySlot}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <LocationIcon />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--tone-light)]">
                  {t.common.deliveryAddress}
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-foreground)]">
                  {order.address}
                </p>

                {order.locality && (
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    {order.locality}
                  </p>
                )}

                {order.landmark && (
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    {t.orderSuccess.near} {order.landmark}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="mt-4 rounded-[28px] border border-[var(--brand-border)] bg-[var(--brand-soft)] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--brand-primary)] shadow-sm">
              <CashIcon />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--brand-primary)]">
                {t.orderSuccess.payment}
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {formatTranslation(t.orderSuccess.paymentDescription, {
                  total: order.total,
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="mt-5 space-y-3 pb-3">
          <Link
            href="/orders"
            className="flex min-h-[55px] w-full items-center justify-between rounded-[19px] border border-[var(--brand-primary)] bg-white px-5 font-bold text-[var(--brand-primary)] transition active:scale-[0.985]"
          >
            <span>{t.orderSuccess.viewOrders}</span>
            <ArrowRightIcon />
          </Link>

          <Link
            href="/"
            className="flex min-h-[58px] w-full items-center justify-between rounded-[20px] bg-[var(--brand-primary)] px-5 font-bold text-white shadow-[0_14px_32px_rgba(40,90,67,0.22)] transition active:scale-[0.985] active:bg-[var(--brand-primary)]"
          >
            <span>{t.orderSuccess.continueShopping}</span>

            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <ArrowRightIcon />
            </span>
          </Link>
        </div>

        <p className="pb-4 pt-2 text-center text-xs text-[var(--tone-placeholder)]">
          {t.orderSuccess.thankYou}
        </p>
      </div>
    </main>
  );
}