"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  paymentMethod: "CASH" | "QR" | string;

  paymentCollected: boolean;

  status: OrderStatus;

  createdAt: string;

  items: OrderItem[];
};

type Filter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

const filters: {
  value: Filter;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "All",
  },
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

/* =========================================================
   HELPERS
========================================================= */

function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
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

function getPaymentLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Cash";

    case "QR":
      return "QR";

    default:
      return method;
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSelectedDate(value: string) {
  if (!value) {
    return "Select date";
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   ICON
========================================================= */

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "refresh"
    | "calendar"
    | "search"
    | "orders"
    | "payments"
    | "customers"
    | "vegetables"
    | "chevron"
    | "filter"
    | "location";
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

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
        />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4 4" />
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

  if (name === "payments") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
        />
        <path d="M3 10h18M7 14h3" />
      </svg>
    );
  }

  if (name === "customers") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.6-3.5 2.9-5.5 7-5.5s6.4 2 7 5.5" />
      </svg>
    );
  }

  if (name === "vegetables") {
    return (
      <svg {...common}>
        <path d="M12 20c0-7 1-11 7-15" />
        <path d="M12 20c0-5-2-8-6-10" />
        <path d="M18 5c-4-1-7 1-7 5 4 1 7-1 7-5Z" />
        <path d="M6 10c4 0 6 2 6 6-4 0-6-2-6-6Z" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...common}>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
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

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [filter, setFilter] =
    useState<Filter>("ALL");

  const [search, setSearch] = useState("");

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  /* -------------------------------------------------------
     LOAD ORDERS
  ------------------------------------------------------- */

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (selectedDate) {
        params.set("date", selectedDate);
      }

      const response = await fetch(
        `/api/admin/orders?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load orders."
        );
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error(
        "ADMIN_ORDERS_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load orders."
      );

      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  /* -------------------------------------------------------
     FILTER
  ------------------------------------------------------- */

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        filter === "ALL" ||
        order.status === filter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        order.orderNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.customerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.phone.includes(
          normalizedSearch
        )
      );
    });
  }, [orders, filter, search]);

  /* -------------------------------------------------------
     COUNTS
  ------------------------------------------------------- */

  const counts = useMemo(() => {
    return {
      all: orders.length,

      pending: orders.filter(
        (order) =>
          order.status === "PENDING"
      ).length,

      confirmed: orders.filter(
        (order) =>
          order.status === "CONFIRMED"
      ).length,

      outForDelivery: orders.filter(
        (order) =>
          order.status ===
          "OUT_FOR_DELIVERY"
      ).length,

      delivered: orders.filter(
        (order) =>
          order.status === "DELIVERED"
      ).length,

      cancelled: orders.filter(
        (order) =>
          order.status === "CANCELLED"
      ).length,
    };
  }, [orders]);

  const currentFilterLabel =
    filter === "ALL"
      ? "All orders"
      : getStatusLabel(filter);

  /* -------------------------------------------------------
     PAGE
  ------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[94px] text-[#24332D]">
      {/* ===================================================
          APP HEADER
      =================================================== */}

      <header className="sticky top-0 z-40 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] active:scale-95"
            >
              <Icon name="back" size={20} />
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Management
              </p>

              <h1 className="text-[19px] font-bold tracking-tight text-[#24483B]">
                Orders
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh orders"
            className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] disabled:opacity-50 active:scale-95"
          >
            <Icon
              name="refresh"
              size={19}
            />
          </button>
        </div>
      </header>

      <div className="px-4">
        {/* =================================================
            DATE / DAY SELECTOR
        ================================================= */}

        <section className="pt-5">
          <button
            type="button"
            onClick={() =>
              setShowDatePicker(
                (value) => !value
              )
            }
            className="w-full rounded-[26px] border border-[#E5DED2] bg-white p-4 text-left shadow-[0_9px_30px_rgba(36,51,45,0.055)] active:scale-[0.995]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#EEF5F0] text-[#315C4C]">
                  <Icon
                    name="calendar"
                    size={20}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                    Order date
                  </p>

                  <p className="mt-1 truncate text-[15px] font-bold text-[#24483B]">
                    {formatSelectedDate(
                      selectedDate
                    )}
                  </p>
                </div>
              </div>

              <Icon
                name="chevron"
                size={18}
              />
            </div>
          </button>

          {showDatePicker && (
            <div className="mt-2 rounded-[24px] border border-[#E5DED2] bg-white p-4 shadow-[0_12px_35px_rgba(36,51,45,0.08)]">
              <input
                type="date"
                value={selectedDate}
                min="2020-01-01"
                max={getToday()}
                onChange={(event) => {
                  setSelectedDate(
                    event.target.value
                  );

                  setFilter("ALL");
                  setSearch("");
                  setShowDatePicker(false);
                }}
                className="h-12 w-full rounded-[17px] border border-[#E5DED2] bg-[#FFFDF8] px-4 text-[13px] font-semibold text-[#24332D] outline-none focus:border-[#315C4C]"
              />

              {selectedDate !==
                getToday() && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(
                      getToday()
                    );

                    setFilter("ALL");
                    setSearch("");
                    setShowDatePicker(false);
                  }}
                  className="mt-3 h-10 w-full rounded-[15px] bg-[#EEF5F0] text-[11px] font-bold text-[#315C4C]"
                >
                  Back to today
                </button>
              )}
            </div>
          )}

          <div className="mt-2 px-1">
            <p className="text-[10px] text-[#8A928D]">
              Orders created on this day
            </p>
          </div>
        </section>

        {/* =================================================
            QUICK STATUS COUNTS
        ================================================= */}

        <section className="mt-5">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Overview
              </p>

              <h2 className="mt-1 text-[19px] font-bold tracking-tight text-[#24483B]">
                Order status
              </h2>
            </div>

            <span className="rounded-full bg-[#EEF5F0] px-3 py-1.5 text-[10px] font-bold text-[#315C4C]">
              {orders.length} total
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <SummaryCard
              label="All"
              value={counts.all}
              active={filter === "ALL"}
              onClick={() =>
                setFilter("ALL")
              }
            />

            <SummaryCard
              label="Packing"
              value={counts.pending}
              active={
                filter === "PENDING"
              }
              onClick={() =>
                setFilter("PENDING")
              }
            />

            <SummaryCard
              label="Confirmed"
              value={counts.confirmed}
              active={
                filter === "CONFIRMED"
              }
              onClick={() =>
                setFilter("CONFIRMED")
              }
            />

            <SummaryCard
              label="Out for delivery"
              value={counts.outForDelivery}
              active={
                filter ===
                "OUT_FOR_DELIVERY"
              }
              onClick={() =>
                setFilter(
                  "OUT_FOR_DELIVERY"
                )
              }
            />

            <SummaryCard
              label="Delivered"
              value={counts.delivered}
              active={
                filter === "DELIVERED"
              }
              onClick={() =>
                setFilter("DELIVERED")
              }
            />

            <SummaryCard
              label="Cancelled"
              value={counts.cancelled}
              active={
                filter === "CANCELLED"
              }
              onClick={() =>
                setFilter("CANCELLED")
              }
            />
          </div>
        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="mt-5">
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A928D]">
              <Icon
                name="search"
                size={19}
              />
            </div>

            <input
              value={search}
              maxLength={100}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order, customer or phone"
              className="h-13 w-full rounded-[20px] border border-[#E5DED2] bg-white pl-12 pr-4 text-[13px] font-medium text-[#24332D] shadow-[0_7px_24px_rgba(36,51,45,0.04)] outline-none placeholder:text-[#9A9F9B] focus:border-[#315C4C]"
            />
          </div>
        </section>

        {/* =================================================
            ACTIVE FILTER CHIPS
        ================================================= */}

        <section className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {filters.map((option) => {
              const active =
                filter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      option.value
                    )
                  }
                  className={`rounded-full px-4 py-2.5 text-[10px] font-bold transition active:scale-95 ${
                    active
                      ? "bg-[#315C4C] text-white shadow-sm"
                      : "border border-[#E5DED2] bg-white text-[#6B756F]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-4 rounded-[21px] border border-[#E7CACA] bg-[#FFF3F3] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8E8] text-[#9B5252]">
                !
              </div>

              <div>
                <p className="text-[12px] font-bold text-[#9B5252]">
                  Unable to load orders
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-[#9B5252]">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              className="mt-3 rounded-[13px] bg-white px-3 py-2 text-[10px] font-bold text-[#9B5252]"
            >
              Try again
            </button>
          </div>
        )}

        {/* =================================================
            ORDER LIST
        ================================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                {formatSelectedDate(
                  selectedDate
                )}
              </p>

              <h2 className="mt-1 text-[20px] font-bold tracking-tight text-[#24483B]">
                {currentFilterLabel}
              </h2>
            </div>

            <span className="shrink-0 rounded-full bg-[#EEF5F0] px-3 py-1.5 text-[10px] font-bold text-[#315C4C]">
              {filteredOrders.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[194px] animate-pulse rounded-[26px] bg-white"
                />
              ))}
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <EmptyOrders
              selectedDate={selectedDate}
              search={search}
              filter={filter}
              onReset={() => {
                setSearch("");
                setFilter("ALL");
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(
                (order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                  />
                )
              )}
            </div>
          )}
        </section>

        <div className="h-5" />
      </div>

      {/* ===================================================
          ADMIN APP NAVIGATION

          EXACTLY FOUR DESTINATIONS.
          Dashboard is intentionally NOT here.
      =================================================== */}

      <AdminBottomNav />
    </main>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[78px] rounded-[20px] border p-3.5 text-left shadow-[0_7px_22px_rgba(36,51,45,0.045)] active:scale-[0.985] ${
        active
          ? "border-[#315C4C] bg-[#EEF5F0]"
          : "border-[#E5DED2] bg-white"
      }`}
    >
      <p
        className={`text-[10px] font-bold ${
          active
            ? "text-[#315C4C]"
            : "text-[#6B756F]"
        }`}
      >
        {label}
      </p>

      <p className="mt-1 text-[21px] font-bold tracking-tight text-[#24483B]">
        {value}
      </p>
    </button>
  );
}

/* =========================================================
   ORDER CARD
========================================================= */

function OrderCard({
  order,
}: {
  order: Order;
}) {
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="block rounded-[26px] border border-[#E5DED2] bg-white p-4 shadow-[0_9px_28px_rgba(36,51,45,0.055)] active:scale-[0.992]"
    >
      {/* TOP */}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-[#24332D]">
              {order.orderNumber}
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${getStatusClasses(
                order.status
              )}`}
            >
              {getStatusLabel(
                order.status
              )}
            </span>
          </div>

          <p className="mt-1.5 truncate text-[12px] font-semibold text-[#315C4C]">
            {order.customerName}
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A928D]">
            {order.phone}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[17px] font-bold tracking-tight text-[#24483B]">
            ₹{order.total}
          </p>

          <p className="mt-1 text-[10px] text-[#8A928D]">
            {formatTime(
              order.createdAt
            )}
          </p>
        </div>
      </div>

      {/* DELIVERY / PAYMENT */}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[18px] bg-[#F8F6F0] px-3 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#315C4C]">
              <Icon
                name="calendar"
                size={13}
              />
            </span>

            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
              Delivery
            </p>
          </div>

          <p className="mt-1.5 truncate text-[11px] font-bold text-[#24332D]">
            {order.deliverySlot}
          </p>
        </div>

        <div className="rounded-[18px] bg-[#F8F6F0] px-3 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#315C4C]">
              <Icon
                name="payments"
                size={13}
              />
            </span>

            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
              Payment
            </p>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <p className="text-[11px] font-bold text-[#24332D]">
              {getPaymentLabel(
                order.paymentMethod
              )}
            </p>

            <span
              className={`h-1.5 w-1.5 rounded-full ${
                order.paymentCollected
                  ? "bg-[#315C4C]"
                  : "bg-[#D98B5F]"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ADDRESS */}

      <div className="mt-3 flex items-center gap-2 rounded-[17px] bg-[#EEF5F0] px-3 py-2.5">
        <span className="shrink-0 text-[#315C4C]">
          <Icon
            name="location"
            size={15}
          />
        </span>

        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#315C4C]">
          {order.address}
        </p>

        <span className="shrink-0 text-[#315C4C]">
          <Icon
            name="chevron"
            size={14}
          />
        </span>
      </div>

      {/* FOOTER */}

      <div className="mt-3 flex items-center justify-between border-t border-[#EEE9DF] pt-3">
        <p className="text-[10px] text-[#8A928D]">
          {order.items.length}{" "}
          {order.items.length === 1
            ? "item"
            : "items"}
        </p>

        {!order.paymentCollected ? (
          <span className="rounded-full bg-[#FFF3D8] px-2.5 py-1 text-[9px] font-bold text-[#8A641C]">
            Payment pending
          </span>
        ) : (
          <span className="rounded-full bg-[#D9E8DF] px-2.5 py-1 text-[9px] font-bold text-[#315C4C]">
            Payment collected
          </span>
        )}
      </div>
    </Link>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyOrders({
  selectedDate,
  search,
  filter,
  onReset,
}: {
  selectedDate: string;
  search: string;
  filter: Filter;
  onReset: () => void;
}) {
  const hasFilters =
    search.trim().length > 0 ||
    filter !== "ALL";

  return (
    <div className="rounded-[27px] border border-[#E5DED2] bg-white p-7 text-center shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon
          name="orders"
          size={24}
        />
      </div>

      <h3 className="mt-4 text-[14px] font-bold text-[#24332D]">
        No orders found
      </h3>

      <p className="mx-auto mt-1 max-w-[270px] text-[11px] leading-5 text-[#6B756F]">
        {hasFilters
          ? "No orders match the current search or status filter."
          : `There are no orders for ${formatSelectedDate(
              selectedDate
            )}.`}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 h-10 rounded-[14px] bg-[#315C4C] px-4 text-[10px] font-bold text-white"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* =========================================================
   ADMIN BOTTOM NAV
========================================================= */

function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5DED2] bg-white/97 shadow-[0_-8px_30px_rgba(36,51,45,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-2xl grid-cols-4 px-1">
        <BottomNavItem
          href="/admin/orders"
          label="Orders"
          icon="orders"
          active
        />

        <BottomNavItem
          href="/admin/payments"
          label="Payments"
          icon="payments"
        />

        <BottomNavItem
          href="/admin/customers"
          label="Customers"
          icon="customers"
        />

        <BottomNavItem
          href="/admin/vegetables"
          label="Vegetables"
          icon="vegetables"
        />
      </div>
    </nav>
  );
}

/* =========================================================
   BOTTOM NAV ITEM
========================================================= */

function BottomNavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon:
    | "orders"
    | "payments"
    | "customers"
    | "vegetables";
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition active:bg-[#F8F6F0] ${
        active
          ? "text-[#315C4C]"
          : "text-[#8A928D]"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[12px] ${
          active
            ? "bg-[#EEF5F0]"
            : ""
        }`}
      >
        <Icon
          name={icon}
          size={20}
        />
      </span>

      <span>{label}</span>
    </Link>
  );
}