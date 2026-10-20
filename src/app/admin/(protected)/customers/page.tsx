"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  deliverySlot: string;
  createdAt: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  runningOrder?: Order | null;
  lastOrder: Order | null;
  orders: Order[];
};

const statusLabels: Record<string, string> = {
  PENDING: "Packing",
  CONFIRMED: "Confirmed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatSlot(slot: string) {
  if (!slot) {
    return "Not specified";
  }

  /*
   * Supports both the old slot identifiers and
   * the new dynamic slot labels.
   */
  const legacyLabels: Record<
    string,
    string
  > = {
    MORNING_0630: "6:30 AM",
    MORNING_0800: "8:00 AM",
    MORNING_1000: "10:00 AM",
    EVENING_1800: "6:00 PM",
    EVENING_2000: "8:00 PM",
  };

  return legacyLabels[slot] || slot;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-[#D9E8DF] text-[#315C4C]";

    case "OUT_FOR_DELIVERY":
      return "bg-[#F9D8DF] text-[#A24F63]";

    case "CONFIRMED":
      return "bg-[#FFF3D8] text-[#8A641C]";

    case "CANCELLED":
      return "bg-[#F1EEE8] text-[#777E79]";

    case "PENDING":
      return "bg-[#FFF3D8] text-[#8A641C]";

    default:
      return "bg-[#F1EEE8] text-[#777E79]";
  }
}

function getStatusLabel(status: string) {
  return (
    statusLabels[status] || status
  );
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
    | "search"
    | "orders"
    | "payments"
    | "customers"
    | "vegetables"
    | "phone"
    | "location"
    | "calendar"
    | "chevron"
    | "close"
    | "refresh"
    | "user";
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

  if (name === "search") {
    return (
      <svg {...common}>
        <circle
          cx="10.8"
          cy="10.8"
          r="6.8"
        />
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

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M6.5 3.5 9 3l2 5-2 1.5a14 14 0 0 0 5.5 5.5L16 13l5 2-.5 2.5C20.2 19.5 18.7 21 16.7 21 9.2 20.4 3.6 14.8 3 7.3 3 5.3 4.5 3.8 6.5 3.5Z" />
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

  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
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

  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c.6-3.5 2.9-5.5 7-5.5s6.4 2 7 5.5" />
    </svg>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminCustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [search, setSearch] =
    useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/customers",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load customers."
        );
      }

      setCustomers(
        data.customers || []
      );
    } catch (error) {
      console.error(
        "ADMIN_CUSTOMERS_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name
          .toLowerCase()
          .includes(query) ||
        customer.phone.includes(
          query
        ) ||
        (
          customer.locality || ""
        )
          .toLowerCase()
          .includes(query)
    );
  }, [customers, search]);

  const totalCustomers =
    customers.length;

  const totalOrders =
    customers.reduce(
      (sum, customer) =>
        sum + customer.totalOrders,
      0
    );

  const totalRevenue =
    customers.reduce(
      (sum, customer) =>
        sum + customer.totalSpent,
      0
    );

  const activeCustomers =
    customers.filter(
      (customer) =>
        customer.runningOrder
    ).length;

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[96px] text-[#24332D]">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] active:scale-95"
            >
              <Icon
                name="back"
                size={20}
              />
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Management
              </p>

              <h1 className="text-[19px] font-bold tracking-tight text-[#24483B]">
                Customers
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            aria-label="Refresh customers"
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
            OVERVIEW
        ================================================= */}

        <section className="pt-5">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Customer base
              </p>

              <h2 className="mt-1 text-[20px] font-bold tracking-tight text-[#24483B]">
                Customers
              </h2>
            </div>

            <span className="rounded-full bg-[#EEF5F0] px-3 py-1.5 text-[10px] font-bold text-[#315C4C]">
              {totalCustomers} total
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <SummaryCard
              label="Customers"
              value={totalCustomers}
              caption="registered"
            />

            <SummaryCard
              label="Active customers"
              value={activeCustomers}
              caption="currently running"
              active
            />

            <SummaryCard
              label="Total orders"
              value={totalOrders}
              caption="all customers"
            />

            <SummaryCard
              label="Customer revenue"
              value={`₹${totalRevenue.toFixed(
                0
              )}`}
              caption="total spent"
              active
            />
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-4 rounded-[21px] border border-[#E7CACA] bg-[#FFF3F3] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8E8] text-[13px] font-bold text-[#9B5252]">
                !
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#9B5252]">
                  Unable to load customers
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-[#9B5252]">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadCustomers}
              className="mt-3 rounded-[13px] bg-white px-3 py-2 text-[10px] font-bold text-[#9B5252]"
            >
              Try again
            </button>
          </div>
        )}

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
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, phone or locality"
              className="h-13 w-full rounded-[20px] border border-[#E5DED2] bg-white pl-12 pr-4 text-[12px] font-medium text-[#24332D] shadow-[0_7px_24px_rgba(36,51,45,0.04)] outline-none placeholder:text-[#9A9F9B] focus:border-[#315C4C]"
            />
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-[10px] text-[#8A928D]">
              {search
                ? `${filteredCustomers.length} matching customers`
                : "All registered customers"}
            </p>

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="text-[10px] font-bold text-[#315C4C]"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            CUSTOMER LIST
        ================================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                Directory
              </p>

              <h2 className="mt-1 text-[19px] font-bold tracking-tight text-[#24483B]">
                Your customers
              </h2>
            </div>

            <span className="text-[10px] font-semibold text-[#8A928D]">
              {filteredCustomers.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-[146px] animate-pulse rounded-[27px] bg-white"
                  />
                )
              )}
            </div>
          ) : filteredCustomers.length ===
            0 ? (
            <EmptyCustomers
              hasSearch={Boolean(
                search.trim()
              )}
              onClear={() =>
                setSearch("")
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map(
                (customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onClick={() =>
                      setSelectedCustomer(
                        customer
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <div className="h-5" />
      </div>

      {/* =================================================
          ADMIN BOTTOM NAV
      ================================================= */}

      <AdminBottomNav />

      {/* =================================================
          CUSTOMER DETAIL SHEET
      ================================================= */}

      {selectedCustomer && (
        <CustomerDetailSheet
          customer={
            selectedCustomer
          }
          onClose={() =>
            setSelectedCustomer(null)
          }
        />
      )}
    </main>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  caption,
  active = false,
}: {
  label: string;
  value: number | string;
  caption: string;
  active?: boolean;
}) {
  return (
    <div
      className={`min-h-[96px] rounded-[22px] border p-4 shadow-[0_7px_22px_rgba(36,51,45,0.045)] ${
        active
          ? "border-[#D9E8DF] bg-[#EEF5F0]"
          : "border-[#E5DED2] bg-white"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B756F]">
        {label}
      </p>

      <p
        className={`mt-1.5 truncate text-[21px] font-bold tracking-tight ${
          active
            ? "text-[#315C4C]"
            : "text-[#24483B]"
        }`}
      >
        {value}
      </p>

      <p className="mt-0.5 text-[9px] text-[#8A928D]">
        {caption}
      </p>
    </div>
  );
}

/* =========================================================
   CUSTOMER CARD
========================================================= */

function CustomerCard({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick: () => void;
}) {
  const runningOrder =
    customer.runningOrder || null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[27px] border border-[#E5DED2] bg-white p-4 text-left shadow-[0_9px_28px_rgba(36,51,45,0.055)] active:scale-[0.992]"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#EEF5F0] text-[#315C4C]">
          <Icon
            name="user"
            size={21}
          />
        </div>

        {/* Main */}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-[#24332D]">
                {customer.name}
              </p>

              <p className="mt-1 text-[10px] text-[#8A928D]">
                {customer.phone}
              </p>
            </div>

            <Icon
              name="chevron"
              size={17}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-[#315C4C]">
              <Icon
                name="location"
                size={14}
              />
            </span>

            <p className="min-w-0 truncate text-[10px] text-[#6B756F]">
              {customer.locality
                ? `${customer.locality} • `
                : ""}
              {customer.address}
            </p>
          </div>
        </div>
      </div>

      {/* Running order */}

      {runningOrder && (
        <div className="mt-3 rounded-[18px] bg-[#EEF5F0] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#6B756F]">
                Running order
              </p>

              <p className="mt-1 truncate text-[11px] font-bold text-[#315C4C]">
                {runningOrder.orderNumber}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${getStatusClasses(
                runningOrder.status
              )}`}
            >
              {getStatusLabel(
                runningOrder.status
              )}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}

      <div className="mt-3 flex items-center justify-between border-t border-[#EEE9DF] pt-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
            Orders
          </p>

          <p className="mt-0.5 text-[12px] font-bold text-[#24332D]">
            {customer.totalOrders}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
            Spent
          </p>

          <p className="mt-0.5 text-[12px] font-bold text-[#24483B]">
            ₹
            {customer.totalSpent.toFixed(
              2
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   EMPTY CUSTOMERS
========================================================= */

function EmptyCustomers({
  hasSearch,
  onClear,
}: {
  hasSearch: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-[27px] border border-[#E5DED2] bg-white p-8 text-center shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon
          name="customers"
          size={25}
        />
      </div>

      <h3 className="mt-4 text-[14px] font-bold text-[#24332D]">
        {hasSearch
          ? "No customers found"
          : "No customers yet"}
      </h3>

      <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-5 text-[#6B756F]">
        {hasSearch
          ? "Try another name, phone number or locality."
          : "Customers will appear here after they place orders."}
      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-[15px] bg-[#315C4C] px-4 py-2.5 text-[10px] font-bold text-white"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOMER DETAIL SHEET
========================================================= */

function CustomerDetailSheet({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const runningOrder =
    customer.runningOrder ||
    customer.orders.find(
      (order) =>
        order.status === "PENDING" ||
        order.status === "CONFIRMED" ||
        order.status ===
          "OUT_FOR_DELIVERY"
    ) ||
    null;

  const previousOrders =
    customer.orders.filter(
      (order) =>
        !runningOrder ||
        order.id !== runningOrder.id
    );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#24332D]/45 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[94vh] max-w-2xl overflow-y-auto rounded-t-[30px] bg-[#FFF7E8] shadow-2xl sm:inset-y-4 sm:bottom-auto sm:rounded-[30px]">
        {/* ===============================================
            SHEET HEADER
        =============================================== */}

        <header className="sticky top-0 z-10 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
          <div className="flex h-[68px] items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close customer details"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C]"
              >
                <Icon
                  name="back"
                  size={20}
                />
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                  Customer
                </p>

                <h2 className="truncate text-[18px] font-bold text-[#24483B]">
                  {customer.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#6B756F]"
            >
              <Icon
                name="close"
                size={18}
              />
            </button>
          </div>
        </header>

        <div className="px-4 pb-7 pt-5">
          {/* =============================================
              CUSTOMER HERO
          ============================================= */}

          <section className="rounded-[27px] border border-[#E5DED2] bg-white p-5 shadow-[0_9px_28px_rgba(36,51,45,0.055)]">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] bg-[#EEF5F0] text-[#315C4C]">
                <Icon
                  name="user"
                  size={25}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] font-bold tracking-tight text-[#24332D]">
                  {customer.name}
                </h3>

                <a
                  href={`tel:${customer.phone}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#315C4C]"
                >
                  <Icon
                    name="phone"
                    size={13}
                  />

                  {customer.phone}
                </a>
              </div>
            </div>

            <div className="mt-4 rounded-[19px] bg-[#EEF5F0] p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-[#315C4C]">
                  <Icon
                    name="location"
                    size={15}
                  />
                </span>

                <div className="min-w-0">
                  {customer.locality && (
                    <p className="text-[10px] font-bold text-[#315C4C]">
                      {customer.locality}
                    </p>
                  )}

                  <p className="mt-1 text-[11px] leading-5 text-[#315C4C]">
                    {customer.address}
                  </p>

                  {customer.landmark && (
                    <p className="mt-1 text-[10px] text-[#6B756F]">
                      Landmark:{" "}
                      {customer.landmark}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-3 text-[9px] text-[#8A928D]">
              Customer since{" "}
              {formatDate(
                customer.createdAt
              )}
            </p>
          </section>

          {/* =============================================
              CUSTOMER STATS
          ============================================= */}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[21px] border border-[#E5DED2] bg-white p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A928D]">
                Total orders
              </p>

              <p className="mt-1 text-[22px] font-bold text-[#24483B]">
                {customer.totalOrders}
              </p>
            </div>

            <div className="rounded-[21px] border border-[#D9E8DF] bg-[#EEF5F0] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#6B756F]">
                Total spent
              </p>

              <p className="mt-1 text-[22px] font-bold text-[#315C4C]">
                ₹
                {customer.totalSpent.toFixed(
                  2
                )}
              </p>
            </div>
          </div>

          {/* =============================================
              RUNNING ORDER
          ============================================= */}

          {runningOrder && (
            <section className="mt-5">
              <SectionHeading
                eyebrow="Active"
                title="Running order"
              />

              <Link
                href={`/admin/orders/${runningOrder.id}`}
                onClick={onClose}
                className="mt-3 block rounded-[25px] border border-[#D9E8DF] bg-[#EEF5F0] p-4 shadow-[0_8px_24px_rgba(49,92,76,0.06)] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#315C4C]">
                      {runningOrder.orderNumber}
                    </p>

                    <p className="mt-1 text-[10px] text-[#6B756F]">
                      {formatDateTime(
                        runningOrder.createdAt
                      )}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${getStatusClasses(
                      runningOrder.status
                    )}`}
                  >
                    {getStatusLabel(
                      runningOrder.status
                    )}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[16px] bg-white/70 px-3 py-2.5">
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
                      Delivery
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-[#24332D]">
                      {formatSlot(
                        runningOrder.deliverySlot
                      )}
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-white/70 px-3 py-2.5">
                    <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#8A928D]">
                      Total
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-[#24332D]">
                      ₹
                      {runningOrder.total.toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#315C4C]">
                    Open order details
                  </span>

                  <Icon
                    name="chevron"
                    size={15}
                  />
                </div>
              </Link>
            </section>
          )}

          {/* =============================================
              ORDER HISTORY
          ============================================= */}

          <section className="mt-6">
            <SectionHeading
              eyebrow="History"
              title="Previous orders"
            />

            {previousOrders.length ===
            0 ? (
              <div className="mt-3 rounded-[24px] border border-[#E5DED2] bg-white p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#F8F6F0] text-[#8A928D]">
                  <Icon
                    name="orders"
                    size={19}
                  />
                </div>

                <p className="mt-3 text-[11px] font-bold text-[#24332D]">
                  No previous orders
                </p>

                <p className="mt-1 text-[9px] text-[#8A928D]">
                  This customer has no completed order history yet.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {previousOrders.map(
                  (order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      onClick={onClose}
                      className="block rounded-[23px] border border-[#E5DED2] bg-white p-4 shadow-[0_6px_20px_rgba(36,51,45,0.04)] active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#24332D]">
                            {order.orderNumber}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8A928D]">
                            {formatDateTime(
                              order.createdAt
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-bold ${getStatusClasses(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(
                            order.status
                          )}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[#EEE9DF] pt-3">
                        <div className="flex items-center gap-1.5 text-[#6B756F]">
                          <Icon
                            name="calendar"
                            size={12}
                          />

                          <span className="text-[9px]">
                            {formatSlot(
                              order.deliverySlot
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#24483B]">
                            ₹
                            {order.total.toFixed(
                              2
                            )}
                          </span>

                          <Icon
                            name="chevron"
                            size={14}
                          />
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="px-1">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
        {eyebrow}
      </p>

      <h3 className="mt-1 text-[18px] font-bold tracking-tight text-[#24483B]">
        {title}
      </h3>
    </div>
  );
}

/* =========================================================
   ADMIN BOTTOM NAV
========================================================= */

function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DED2] bg-white/97 shadow-[0_-8px_30px_rgba(36,51,45,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-2xl grid-cols-4 px-1">
        <BottomNavItem
          href="/admin/orders"
          label="Orders"
          icon="orders"
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
          active
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