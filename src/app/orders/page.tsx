"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  status: OrderStatus;

  deliverySlot?: DeliverySlot | string | null;
  deliverySlotId?: string | null;
  deliverySlotLabel?: string | null;
  deliverySlotStartTime?: string | null;
  deliverySlotEndTime?: string | null;

  subtotal: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: string;
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.5 7.5 4 7.5-4" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="1.7" />
      <circle cx="18" cy="19" r="1.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 7" />
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
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function XIcon() {
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
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </svg>
  );
}

/*
 * Dynamic delivery-slot formatting.
 *
 * Priority:
 * 1. deliverySlotLabel from the database
 * 2. start/end time
 * 3. start time
 * 4. legacy deliverySlot / deliverySlotId
 * 5. old hardcoded mapping as final fallback
 */
function formatDeliverySlot(order: Order) {
  /*
   * New API shape:
   *
   * deliverySlot: {
   *   id,
   *   label,
   *   startTime,
   *   endTime
   * }
   */

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

  /*
   * Flattened fields, if the API provides them.
   */
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

  /*
   * Old API/string fallback.
   */
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

function formatQuantity(quantity: string, gram: string, kilogram: string) {
  const value = Number(quantity);

  if (!Number.isFinite(value)) {
    return quantity;
  }

  if (value < 1) {
    return `${value * 1000} ${gram}`;
  }

  return `${value} ${kilogram}`;
}

function formatDate(date: string, language: "en" | "te") {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(date: string, language: "en" | "te") {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "te" ? "te-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getStatusDetails(
  status: OrderStatus,
  labels: TranslationDictionary["status"]
) {
  switch (status) {
    case "CONFIRMED":
      return {
        label: labels.confirmed,
        description: labels.confirmedDescription,
        badge:
          "bg-[var(--brand-border)] text-[var(--brand-primary)]",
        wrapper:
          "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        iconBg:
          "bg-[var(--brand-primary)] text-white",
        type: "confirmed",
      };

    case "OUT_FOR_DELIVERY":
      return {
        label: labels.outForDelivery,
        description: labels.outForDeliveryDescription,
        badge:
          "bg-[var(--brand-border)] text-[var(--brand-primary)]",
        wrapper:
          "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        iconBg:
          "bg-[var(--brand-primary)] text-white",
        type: "delivery",
      };

    case "DELIVERED":
      return {
        label: labels.delivered,
        description: labels.deliveredDescription,
        badge:
          "bg-[var(--brand-primary)] text-white",
        wrapper:
          "border-[var(--brand-border)] bg-[var(--brand-soft)]",
        iconBg:
          "bg-[var(--brand-primary)] text-white",
        type: "delivered",
      };

    case "CANCELLED":
      return {
        label: labels.cancelled,
        description: labels.cancelledDescription,
        badge:
          "bg-[var(--danger-soft)] text-[var(--danger-text)]",
        wrapper:
          "border-[var(--danger-border)] bg-[var(--danger-soft)]",
        iconBg:
          "bg-[var(--danger)] text-white",
        type: "cancelled",
      };

    case "PENDING":
    default:
      return {
        label: labels.pending,
        description: labels.pendingDescription,
        badge:
          "bg-[var(--gold)] text-white",
        wrapper:
          "border-[var(--gold-border)] bg-[var(--app-background)]",
        iconBg:
          "bg-[var(--gold)] text-white",
        type: "pending",
      };
  }
}

function StatusIcon({
  type,
}: {
  type: string;
}) {
  if (type === "delivery") {
    return <TruckIcon />;
  }

  if (type === "delivered") {
    return <CheckIcon />;
  }

  if (type === "cancelled") {
    return <XIcon />;
  }

  if (type === "pending") {
    return <ClockIcon />;
  }

  return <PackageIcon />;
}

function getProgress(status: OrderStatus) {
  switch (status) {
    case "CONFIRMED":
      return 50;

    case "OUT_FOR_DELIVERY":
      return 75;

    case "DELIVERED":
      return 100;

    case "CANCELLED":
      return 0;

    case "PENDING":
    default:
      return 25;
  }
}

function isRunningOrder(status: OrderStatus) {
  return (
    status === "PENDING" ||
    status === "CONFIRMED" ||
    status === "OUT_FOR_DELIVERY"
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-[var(--surface-warm)]" />

      <div className="rounded-[28px] border border-[var(--border-default)] bg-white p-5 shadow-[0_12px_32px_rgba(37,51,43,0.06)]">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-warm)]" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--surface-warm)]" />
        </div>

        <div className="mt-5 h-5 w-36 animate-pulse rounded bg-[var(--surface-warm)]" />

        <div className="mt-3 h-3 w-48 animate-pulse rounded bg-[var(--surface-warm)]" />

        <div className="mt-6 h-2 rounded-full bg-[var(--surface-warm)]" />

        <div className="mt-6 h-14 animate-pulse rounded-[18px] bg-[var(--surface-warm)]" />
      </div>

      <div className="h-6 w-36 animate-pulse rounded-lg bg-[var(--surface-warm)]" />

      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-[24px] border border-[var(--border-default)] bg-white"
        />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { language } = useLanguage();
  const t = useTranslations();
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [authenticated, setAuthenticated] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/orders/customer",
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          setAuthenticated(false);
          setOrders([]);
          return;
        }

        if (!response.ok) {
          throw new Error(t.orders.loadError);
        }

        setAuthenticated(true);
        setOrders(data.orders ?? []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "CUSTOMER_ORDERS_PAGE_ERROR:",
          error
        );

        setError(t.orders.loadError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [language, t.orders.loadError]);

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </button>

          <OrderSkeleton />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </button>

          <div className="mt-10 rounded-[30px] border border-[var(--border-default)] bg-white p-6 text-center shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
              <PackageIcon />
            </div>

            <h1 className="mt-5 text-[22px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
              {t.orders.title}
            </h1>

            <p className="mt-2 text-[14px] font-medium text-[var(--brand-primary)]">
              {t.orders.title}
            </p>

            <p className="mx-auto mt-4 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
              {t.orders.signInDescription}
            </p>

            <Link
              href="/login"
              className="mt-6 flex h-12 items-center justify-center rounded-[17px] bg-[var(--brand-primary)] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(40,90,67,0.18)] active:scale-[0.98]"
            >
              {t.orders.signInTitle}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </button>

          <div className="mt-10 rounded-[30px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6 text-center">
            <h1 className="text-[19px] font-bold text-[var(--app-foreground)]">
              {t.orders.loadTitle}
            </h1>

            <p className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">
              {t.orders.loadError}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-[16px] bg-[var(--brand-primary)] px-5 py-3 text-[13px] font-bold text-white"
            >
              {t.common.tryAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const runningOrders = orders.filter(
    (order) =>
      isRunningOrder(order.status)
  );

  const previousOrders = orders.filter(
    (order) =>
      !isRunningOrder(order.status)
  );

  /*
   * VegItPTP currently expects one running
   * customer order to be shown prominently.
   *
   * We keep the first running order here
   * while the backend can still return the
   * complete list.
   */
  const currentOrder =
    runningOrders[0];

  return (
    <div className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
      <div className="mx-auto max-w-4xl">

        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          aria-label={t.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)] transition active:scale-[0.95]"
        >
          <ArrowLeftIcon />
        </button>

        {/* Header */}
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--tone-light)]">
            VegItPTP
          </p>

          <h1 className="mt-1 text-[25px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
            {t.orders.title}
          </h1>
        </div>

        {/* CURRENT / RUNNING ORDER */}
        {currentOrder && (
          <section className="mt-7">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[18px] font-bold tracking-[-0.025em] text-[var(--app-foreground)]">
                  {t.orders.current}
                </p>

              </div>

              <span className="rounded-full bg-[var(--brand-border)] px-3 py-1.5 text-[10px] font-bold text-[var(--brand-primary)]">
                {t.orders.active}
              </span>
            </div>

            <Link
              href={`/order-success?order=${encodeURIComponent(
                currentOrder.orderNumber
              )}`}
              className="market-card block p-5 transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tone-light)]">
                    {t.orders.orderNumber}
                  </p>

                  <p className="mt-1 truncate text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
                    #{currentOrder.orderNumber}
                  </p>
                </div>

                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold ${
                    getStatusDetails(
                      currentOrder.status,
                      t.status
                    ).badge
                  }`}
                >
                  <StatusIcon
                    type={
                      getStatusDetails(
                        currentOrder.status,
                        t.status
                      ).type
                    }
                  />

                  <span>
                    {
                      getStatusDetails(
                        currentOrder.status,
                        t.status
                      ).label
                    }
                  </span>
                </div>
              </div>

              {/* Status */}
              <div
                className={`mt-5 rounded-[22px] border p-4 ${
                  getStatusDetails(
                    currentOrder.status,
                    t.status
                  ).wrapper
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${
                      getStatusDetails(
                        currentOrder.status,
                        t.status
                      ).iconBg
                    }`}
                  >
                    <StatusIcon
                      type={
                        getStatusDetails(
                          currentOrder.status,
                          t.status
                        ).type
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[var(--app-foreground)]">
                      {
                        getStatusDetails(
                          currentOrder.status,
                          t.status
                        ).label
                      }
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium text-[var(--brand-primary)]">
                      {
                        getStatusDetails(
                          currentOrder.status,
                          t.status
                        ).description
                      }
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-500"
                      style={{
                        width: `${getProgress(
                          currentOrder.status
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[9px] font-semibold text-[var(--tone-light)]">
                    <span>{t.orders.stepPlaced}</span>
                    <span>{t.orders.stepConfirmed}</span>
                    <span>{t.orders.stepDelivery}</span>
                    <span>{t.orders.stepDone}</span>
                  </div>
                </div>
              </div>

              {/* Order information */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[19px] bg-[var(--surface-warm)] p-3.5">
                  <p className="text-[10px] font-semibold text-[var(--tone-light)]">
                    {t.common.deliverySlot}
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-[var(--app-foreground)]">
                    {formatDeliverySlot(
                      currentOrder
                    )}
                  </p>
                </div>

                <div className="rounded-[19px] bg-[var(--surface-warm)] p-3.5">
                  <p className="text-[10px] font-semibold text-[var(--tone-light)]">
                    {t.checkout.orderTotal}
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-[var(--app-foreground)]">
                    ₹
                    {Number(
                      currentOrder.total
                    ).toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="mt-4 rounded-[19px] border border-[var(--border-default)] bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[var(--app-foreground)]">
                    {t.orders.yourVegetables}
                  </p>

                  <p className="text-[10px] font-semibold text-[var(--tone-light)]">
                    {currentOrder.items.length}{" "}
                    {currentOrder.items.length ===
                    1
                      ? t.common.item
                      : t.common.items}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {currentOrder.items
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <p className="min-w-0 truncate text-[12px] font-medium text-[var(--app-foreground)]">
                          {language === "te"
                            ? item.nameTe ||
                              item.nameEn ||
                              item.name
                            : item.nameEn ||
                              item.nameTe ||
                              item.name}
                        </p>

                        <p className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)]">
                          {formatQuantity(
                            item.quantity,
                            t.common.gram,
                            t.common.kilogram
                          )}
                        </p>
                      </div>
                    ))}

                  {currentOrder.items.length >
                    3 && (
                    <p className="pt-1 text-[10px] font-semibold text-[var(--brand-primary)]">
                      +{" "}
                      {formatTranslation(t.orders.moreItems, {
                        count: currentOrder.items.length - 3,
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex items-center justify-between rounded-[19px] bg-[var(--brand-primary)] px-4 py-3.5 text-white">
                <div>
                  <p className="text-[12px] font-bold">
                    {t.orders.details}
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/70">
                    {t.orders.details}
                  </p>
                </div>

                <ArrowRightIcon />
              </div>
            </Link>
          </section>
        )}

        {/* PREVIOUS ORDERS */}
        <section
          className={
            currentOrder
              ? "mt-8"
              : "mt-7"
          }
        >
          <div className="mb-3">
            <p className="text-[18px] font-bold tracking-[-0.025em] text-[var(--app-foreground)]">
              {t.orders.previous}
            </p>

          </div>

          {previousOrders.length === 0 ? (
            <div className="rounded-[28px] border border-[var(--border-default)] bg-white p-7 text-center shadow-[0_12px_32px_rgba(37,51,43,0.06)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <PackageIcon />
              </div>

              <p className="mt-4 text-[15px] font-bold text-[var(--app-foreground)]">
                {t.orders.noPrevious}
              </p>

              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {t.orders.completedDescription}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {previousOrders.map(
                (order) => {
                  const status =
                    getStatusDetails(
                      order.status,
                      t.status
                    );

                  return (
                    <Link
                      key={order.id}
                      href={`/order-success?order=${encodeURIComponent(
                        order.orderNumber
                      )}`}
                      className="market-card block h-full p-4 transition active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${status.iconBg}`}
                        >
                          <StatusIcon
                            type={status.type}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-bold text-[var(--app-foreground)]">
                                #
                                {
                                  order.orderNumber
                                }
                              </p>

                              <p className="mt-1 text-[10px] font-medium text-[var(--tone-light)]">
                                {formatDate(
                                  order.createdAt,
                                  language
                                )}{" "}
                                ·{" "}
                                {formatTime(
                                  order.createdAt,
                                  language
                                )}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${status.badge}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                                {order.items.length}{" "}
                                {order.items
                                  .length === 1
                                  ? t.common.vegetable
                                  : t.common.vegetables}
                                {" · "}
                                {formatDeliverySlot(
                                  order
                                )}
                              </p>

                              <p className="mt-1 text-[10px] font-medium text-[var(--brand-primary)]">
                                {status.description}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <p className="text-[14px] font-bold text-[var(--app-foreground)]">
                                ₹
                                {Number(
                                  order.total
                                ).toFixed(0)}
                              </p>

                              <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                                <ArrowRightIcon />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* NO ORDERS AT ALL */}
        {orders.length === 0 && (
          <div className="mt-7 rounded-[30px] border border-[var(--border-default)] bg-white p-7 text-center shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
              <PackageIcon />
            </div>

            <h2 className="mt-5 text-[20px] font-bold tracking-[-0.025em] text-[var(--app-foreground)]">
              {t.orders.emptyTitle}
            </h2>

            <p className="mt-1 text-[12px] font-medium text-[var(--brand-primary)]">
              {t.orders.emptyTitle}
            </p>

            <p className="mx-auto mt-3 max-w-xs text-[12px] leading-5 text-[var(--text-muted)]">
              {t.orders.emptyDescription}
            </p>

            <Link
              href="/"
              className="mt-5 flex h-12 items-center justify-center rounded-[17px] bg-[var(--brand-primary)] text-[13px] font-bold text-white shadow-[0_10px_22px_rgba(40,90,67,0.18)] active:scale-[0.98]"
            >
              {t.common.startShopping}
            </Link>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}