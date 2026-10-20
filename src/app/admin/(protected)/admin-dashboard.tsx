"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardData = {
  overview: {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    outForDeliveryOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  };

  today: {
    orderCount: number;
    deliveredOrderCount: number;
    revenue: number;
    collected: number;
    cashCollected: number;
    qrCollected: number;
    uncollected: number;
  };

  qrAccounts: {
    id: string | null;
    name: string;
    amount: number;
    orders: number;
  }[];

  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    paymentMethod: string;
    paymentCollected: boolean;
    createdAt: string;
    deliverySlot: string;
  }[];
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending";

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

function statusClasses(status: string) {
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
      return "bg-[#F3E8E8] text-[#9B5252]";

    default:
      return "bg-[#F1EEE8] text-[#6B756F]";
  }
}

/* -------------------------------------------------------
   ICONS
------------------------------------------------------- */

function Icon({
  name,
  size = 21,
}: {
  name:
    | "orders"
    | "pending"
    | "delivery"
    | "done"
    | "payments"
    | "customers"
    | "vegetables"
    | "settings"
    | "arrow"
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

  if (name === "orders") {
    return (
      <svg {...common}>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (name === "pending") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 2" />
      </svg>
    );
  }

  if (name === "delivery") {
    return (
      <svg {...common}>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }

  if (name === "done") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.3 2.3 4.8-5" />
      </svg>
    );
  }

  if (name === "payments") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
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

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M19 13.5v-3l-2-.6a7.2 7.2 0 0 0-.7-1.6l1-1.8-2.1-2.1-1.8 1a7.2 7.2 0 0 0-1.6-.7l-.6-2h-3l-.6 2a7.2 7.2 0 0 0-1.6.7l-1.8-1-2.1 2.1 1 1.8a7.2 7.2 0 0 0-.7 1.6l-2 .6v3l2 .6c.2.6.4 1.1.7 1.6l-1 1.8 2.1 2.1 1.8-1c.5.3 1 .5 1.6.7l.6 2h3l.6-2c.6-.2 1.1-.4 1.6-.7l1.8 1 2.1-2.1-1-1.8c.3-.5.5-1 .7-1.6l2-.6Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* -------------------------------------------------------
   MAIN DASHBOARD
------------------------------------------------------- */

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              result.error ||
              "Unable to load dashboard."
          );
        }

        setData(result);
      } catch (error) {
        console.error(error);
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("ADMIN_LOGOUT_ERROR:", error);
    } finally {
      window.location.href = "/admin/login";
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[92px] text-[#24332D]">
      {/* ==================================================
          APP HEADER
      ================================================== */}

      <header className="sticky top-0 z-30 border-b border-[#E5DED2] bg-[#FFF7E8]/95 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#315C4C] text-white shadow-[0_6px_18px_rgba(49,92,76,0.18)]">
              <Icon name="vegetables" size={19} />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                VegItPTP
              </p>

              <h1 className="text-[17px] font-bold tracking-tight text-[#24483B]">
                Admin
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] transition active:scale-95"
            >
              <Icon name="settings" size={19} />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#9B5252] shadow-[0_5px_18px_rgba(36,51,45,0.06)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 19V5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* ==================================================
            GREETING
        ================================================== */}

        <section className="pt-6">
          <p className="text-[12px] font-semibold text-[#6B756F]">
            Store overview
          </p>

          <div className="mt-1 flex items-end justify-between">
            <div>
              <h2 className="text-[27px] font-bold leading-tight tracking-[-0.03em] text-[#24483B]">
                Today at VegItPTP
              </h2>

              <p className="mt-1 text-[13px] text-[#6B756F]">
                Keep an eye on orders and collections.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState />
        ) : data ? (
          <>
            {/* ==================================================
                PRIMARY SNAPSHOT
            ================================================== */}

            <section className="mt-6 grid grid-cols-2 gap-3">
              <StatCard
                label="Total orders"
                value={data.overview.totalOrders}
                icon="orders"
              />

              <StatCard
                label="Pending"
                value={data.overview.pendingOrders}
                icon="pending"
              />

              <StatCard
                label="Out for delivery"
                value={data.overview.outForDeliveryOrders}
                icon="delivery"
              />

              <StatCard
                label="Delivered"
                value={data.overview.deliveredOrders}
                icon="done"
              />
            </section>

            {/* ==================================================
                TODAY'S COLLECTION
            ================================================== */}

            <section className="mt-4 overflow-hidden rounded-[28px] border border-[#E5DED2] bg-white shadow-[0_12px_35px_rgba(36,51,45,0.07)]">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                      Today&apos;s collection
                    </p>

                    <p className="mt-2 text-[32px] font-bold tracking-[-0.04em] text-[#24483B]">
                      {formatMoney(data.today.collected)}
                    </p>
                  </div>

                  <Link
                    href="/admin/payments"
                    className="flex h-9 items-center rounded-[14px] bg-[#EEF5F0] px-3 text-[11px] font-bold text-[#315C4C]"
                  >
                    Payments
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <CollectionCard
                    label="CASH"
                    value={data.today.cashCollected}
                  />

                  <CollectionCard
                    label="QR"
                    value={data.today.qrCollected}
                  />
                </div>

                {data.today.uncollected > 0 && (
                  <Link
                    href="/admin/payments"
                    className="mt-3 flex items-center justify-between rounded-[18px] bg-[#FFF3D8] px-4 py-3"
                  >
                    <span className="text-[12px] font-bold text-[#8A641C]">
                      Uncollected
                    </span>

                    <span className="text-[13px] font-bold text-[#8A641C]">
                      {formatMoney(data.today.uncollected)}
                    </span>
                  </Link>
                )}
              </div>
            </section>

            {/* ==================================================
                TODAY
            ================================================== */}

            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                    Today
                  </p>

                  <h3 className="mt-1 text-[18px] font-bold text-[#24483B]">
                    Orders overview
                  </h3>
                </div>

                <Link
                  href="/admin/orders"
                  className="flex h-9 items-center gap-1 rounded-[14px] bg-[#EEF5F0] px-3 text-[11px] font-bold text-[#315C4C]"
                >
                  Orders
                  <Icon name="chevron" size={14} />
                </Link>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[31px] font-bold tracking-[-0.04em] text-[#24483B]">
                    {data.today.orderCount}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#6B756F]">
                    orders today
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-[#6B756F]">
                    Revenue
                  </p>

                  <p className="mt-1 text-[18px] font-bold text-[#315C4C]">
                    {formatMoney(data.today.revenue)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-[#EEF5F0]">
                  <div
                    className="h-full rounded-full bg-[#315C4C]"
                    style={{
                      width:
                        data.today.orderCount > 0
                          ? `${Math.min(
                              100,
                              (data.today.deliveredOrderCount /
                                data.today.orderCount) *
                                100
                            )}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-[#6B756F]">
                    {data.today.deliveredOrderCount} delivered
                  </span>

                  <span className="font-semibold text-[#315C4C]">
                    {data.today.orderCount > 0
                      ? Math.round(
                          (data.today.deliveredOrderCount /
                            data.today.orderCount) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </section>

            {/* ==================================================
                ORDER STATUS
            ================================================== */}

            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Orders
              </p>

              <h3 className="mt-1 text-[18px] font-bold text-[#24483B]">
                Current status
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStatus
                  label="Confirmed"
                  value={data.overview.confirmedOrders}
                />

                <MiniStatus
                  label="Delivered"
                  value={data.overview.deliveredOrders}
                />

                <MiniStatus
                  label="Cancelled"
                  value={data.overview.cancelledOrders}
                />

                <MiniStatus
                  label="Pending"
                  value={data.overview.pendingOrders}
                />
              </div>
            </section>

            {/* ==================================================
                QR COLLECTION
            ================================================== */}

            {data.qrAccounts.length > 0 && (
              <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                      QR collection
                    </p>

                    <h3 className="mt-1 text-[18px] font-bold text-[#24483B]">
                      By account
                    </h3>
                  </div>

                  <Link
                    href="/admin/settings"
                    className="text-[11px] font-bold text-[#315C4C]"
                  >
                    Manage
                  </Link>
                </div>

                <div className="mt-4 space-y-2">
                  {data.qrAccounts.map((account) => (
                    <div
                      key={account.id ?? account.name}
                      className="flex items-center justify-between rounded-[19px] bg-[#F8F6F0] px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#D9E8DF] text-[#315C4C]">
                          <Icon name="payments" size={17} />
                        </div>

                        <div>
                          <p className="text-[13px] font-bold text-[#24332D]">
                            {account.name}
                          </p>

                          <p className="mt-0.5 text-[10px] text-[#6B756F]">
                            {account.orders} payment
                            {account.orders !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <p className="text-[13px] font-bold text-[#315C4C]">
                        {formatMoney(account.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ==================================================
                RECENT ORDERS
            ================================================== */}

            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                    Activity
                  </p>

                  <h3 className="mt-1 text-[18px] font-bold text-[#24483B]">
                    Recent orders
                  </h3>
                </div>

                <Link
                  href="/admin/orders"
                  className="text-[11px] font-bold text-[#315C4C]"
                >
                  View all
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {data.recentOrders.length === 0 ? (
                  <div className="rounded-[20px] bg-[#F8F6F0] px-4 py-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#EEF5F0] text-[#315C4C]">
                      <Icon name="orders" size={19} />
                    </div>

                    <p className="mt-3 text-[12px] font-semibold text-[#6B756F]">
                      No orders yet.
                    </p>
                  </div>
                ) : (
                  data.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block rounded-[21px] border border-[#EEE9DF] bg-white p-4 active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-bold text-[#24332D]">
                              {order.orderNumber}
                            </p>

                            {!order.paymentCollected && (
                              <span className="rounded-full bg-[#FFF3D8] px-2 py-0.5 text-[9px] font-bold text-[#8A641C]">
                                UNPAID
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-[11px] text-[#6B756F]">
                            {order.customerName}
                          </p>
                        </div>

                        <p className="shrink-0 text-[14px] font-bold text-[#315C4C]">
                          {formatMoney(order.total)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${statusClasses(
                              order.status
                            )}`}
                          >
                            {statusLabel(order.status)}
                          </span>

                          <span className="truncate text-[10px] text-[#8A928D]">
                            {order.deliverySlot}
                          </span>
                        </div>

                        <span className="shrink-0 text-[10px] text-[#8A928D]">
                          {formatTime(order.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* ==================================================
                QUICK MANAGEMENT
            ================================================== */}

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                    Management
                  </p>

                  <h3 className="mt-1 text-[18px] font-bold text-[#24483B]">
                    Quick access
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ManagementCard
                  href="/admin/vegetables"
                  title="Vegetables"
                  description="Catalog & prices"
                  icon="vegetables"
                />

                <ManagementCard
                  href="/admin/orders"
                  title="Orders"
                  description="Manage orders"
                  icon="orders"
                />

                <ManagementCard
                  href="/admin/customers"
                  title="Customers"
                  description="Customer history"
                  icon="customers"
                />

                <ManagementCard
                  href="/admin/settings"
                  title="Settings"
                  description="Store controls"
                  icon="settings"
                />
              </div>
            </section>

            <div className="h-5" />
          </>
        ) : null}
      </div>

      {/* ======================================================
          FIXED ADMIN APP NAVIGATION

          IMPORTANT:
          Dashboard is intentionally NOT here.

          These four destinations never change.
      ====================================================== */}

      <AdminBottomNav />
    </main>
  );
}

/* -------------------------------------------------------
   STAT CARD
------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: "orders" | "pending" | "delivery" | "done";
}) {
  return (
    <div className="rounded-[24px] border border-[#E5DED2] bg-white p-4 shadow-[0_9px_27px_rgba(36,51,45,0.055)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon name={icon} size={18} />
      </div>

      <p className="mt-3 text-[25px] font-bold tracking-[-0.03em] text-[#24483B]">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-semibold leading-4 text-[#6B756F]">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------
   COLLECTION CARD
------------------------------------------------------- */

function CollectionCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[20px] bg-[#F8F6F0] px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            label === "CASH"
              ? "bg-[#D98B5F]"
              : "bg-[#315C4C]"
          }`}
        />

        <p className="text-[10px] font-bold tracking-[0.1em] text-[#6B756F]">
          {label}
        </p>
      </div>

      <p className="mt-1.5 text-[17px] font-bold text-[#315C4C]">
        {formatMoney(value)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------
   MINI STATUS
------------------------------------------------------- */

function MiniStatus({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] bg-[#F8F6F0] px-3.5 py-3">
      <p className="text-[10px] font-medium text-[#6B756F]">
        {label}
      </p>

      <p className="mt-1 text-[19px] font-bold text-[#24332D]">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------
   MANAGEMENT CARD
------------------------------------------------------- */

function ManagementCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: "vegetables" | "orders" | "customers" | "settings";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[112px] flex-col justify-between rounded-[24px] border border-[#E5DED2] bg-white p-4 shadow-[0_9px_27px_rgba(36,51,45,0.055)] active:scale-[0.985]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon name={icon} size={18} />
      </div>

      <div className="mt-4">
        <h3 className="text-[12px] font-bold text-[#24332D]">
          {title}
        </h3>

        <p className="mt-0.5 text-[10px] text-[#6B756F]">
          {description}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------
   ADMIN BOTTOM NAV

   This is deliberately fixed and identical everywhere.

   ORDERS | PAYMENTS | CUSTOMERS | VEGETABLES

   NEVER add Dashboard here.
------------------------------------------------------- */

function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5DED2] bg-white/97 shadow-[0_-8px_30px_rgba(36,51,45,0.08)] backdrop-blur-xl">
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

/* -------------------------------------------------------
   BOTTOM NAV ITEM
------------------------------------------------------- */

function BottomNavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "orders" | "payments" | "customers" | "vegetables";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 text-[10px] font-bold text-[#8A928D] transition active:bg-[#F8F6F0]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[12px]">
        <Icon name={icon} size={20} />
      </span>

      <span>{label}</span>
    </Link>
  );
}

/* -------------------------------------------------------
   ERROR
------------------------------------------------------- */

function ErrorState() {
  return (
    <div className="mt-6 rounded-[28px] border border-[#E5DED2] bg-white p-6 text-center shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#F3E8E8] text-[#9B5252]">
        <Icon name="orders" size={21} />
      </div>

      <p className="mt-4 text-[14px] font-bold text-[#9B5252]">
        Unable to load dashboard
      </p>

      <p className="mt-1 text-[11px] text-[#6B756F]">
        Something went wrong while loading the store overview.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 h-11 rounded-[16px] bg-[#315C4C] px-5 text-[12px] font-bold text-white"
      >
        Try again
      </button>
    </div>
  );
}

/* -------------------------------------------------------
   SKELETON
------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-[126px] rounded-[24px] bg-white"
          />
        ))}
      </div>

      <div className="h-[226px] rounded-[28px] bg-white" />

      <div className="h-[205px] rounded-[28px] bg-white" />

      <div className="h-[210px] rounded-[28px] bg-white" />

      <div className="h-[290px] rounded-[28px] bg-white" />
    </div>
  );
}