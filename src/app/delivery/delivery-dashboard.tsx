"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
};

type DeliveryOrder = {
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

  payment: {
    method: PaymentMethod;
    subtotal: string;
    deliveryCharge: string;
    total: string;
    collected: boolean;
    collectedAt: string | null;
    accountId: string | null;
    accountName: string | null;
    account: PaymentAccount | null;
  };

  notes: string | null;

  items: OrderItem[];

  createdAt: string;
  updatedAt: string;
};

type OrdersResponse = {
  success?: boolean;
  orders?: DeliveryOrder[];
  error?: string;
};

type ActiveTab =
  | "TODAY"
  | "ORDERS"
  | "COLLECTIONS";

type OrderFilter =
  | "ALL"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

function formatAmount(value: string | number) {
  const amount = Number(value);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatQuantity(value: string) {
  const quantity = Number(value);

  if (quantity % 1 === 0) {
    return `${quantity} kg`;
  }

  return `${quantity.toFixed(1)} kg`;
}

function formatTime(value: string) {
  if (!value) return "";

  const [hoursString, minutesString] =
    value.split(":");

  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return value;
  }

  const date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getSlotLabel(order: DeliveryOrder) {
  if (order.delivery.endTime) {
    return `${formatTime(
      order.delivery.startTime
    )} – ${formatTime(
      order.delivery.endTime
    )}`;
  }

  return order.delivery.slot;
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "home"
    | "orders"
    | "collection"
    | "logout"
    | "phone"
    | "location"
    | "clock"
    | "check"
    | "arrow"
    | "cash"
    | "qr"
    | "refresh"
    | "box"
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

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg {...common}>
        <path d="M6 3h12" />
        <path d="M6 7h12" />
        <path d="M6 11h8" />
        <path d="M6 15h8" />
        <path d="M6 19h6" />
        <path d="M4 3h.01" />
        <path d="M4 7h.01" />
        <path d="M4 11h.01" />
        <path d="M4 15h.01" />
        <path d="M4 19h.01" />
      </svg>
    );
  }

  if (name === "collection") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01" />
        <path d="M17 15h.01" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
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

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === "cash") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
        />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01" />
        <path d="M17 15h.01" />
      </svg>
    );
  }

  if (name === "qr") {
    return (
      <svg {...common}>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h3v3h-3z" />
        <path d="M18 18h2v2h-2z" />
        <path d="M17 14h3" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14.9-3" />
        <path d="M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14.9 3" />
        <path d="M20 20v-4h-4" />
      </svg>
    );
  }

  if (name === "box") {
    return (
      <svg {...common}>
        <path d="m21 8-9 5-9-5" />
        <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
        <path d="M12 13v8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StatusPill({
  status,
}: {
  status: OrderStatus;
}) {
  const config = {
    CONFIRMED: {
      label: "Confirmed",
      className:
        "bg-[#EEF5F0] text-[#315C4C]",
    },

    OUT_FOR_DELIVERY: {
      label: "Out for delivery",
      className:
        "bg-[#F9D8DF] text-[#8D4E61]",
    },

    DELIVERED: {
      label: "Delivered",
      className:
        "bg-[#D9E8DF] text-[#24483B]",
    },
  };

  const item = config[status];

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function PaymentPill({
  order,
}: {
  order: DeliveryOrder;
}) {
  if (!order.payment.collected) {
    return (
      <span className="rounded-full bg-[#F9D8DF] px-3 py-1.5 text-[11px] font-bold text-[#8D4E61]">
        Payment pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D9E8DF] px-3 py-1.5 text-[11px] font-bold text-[#24483B]">
      {order.payment.method === "QR" ? (
        <Icon name="qr" size={13} />
      ) : (
        <Icon name="cash" size={13} />
      )}

      {order.payment.method}
    </span>
  );
}

function OrderCard({
  order,
  onOpen,
}: {
  order: DeliveryOrder;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[28px] border border-[#E5DED2] bg-white p-4 text-left shadow-[0_10px_30px_rgba(36,51,45,0.06)] transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B756F]">
            {order.orderNumber}
          </p>

          <h3 className="mt-1 text-base font-bold text-[#24332D]">
            {order.customer.name}
          </h3>
        </div>

        <StatusPill
          status={order.delivery.status}
        />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F0] text-[#315C4C]">
          <Icon name="location" size={17} />
        </span>

        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-5 text-[#24332D]">
            {order.customer.address}
          </p>

          {order.customer.locality && (
            <p className="mt-1 text-xs text-[#6B756F]">
              {order.customer.locality}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#E5DED2] pt-4">
        <div className="flex items-center gap-2 text-xs font-medium text-[#6B756F]">
          <Icon name="clock" size={15} />

          {getSlotLabel(order)}
        </div>

        <span className="text-base font-extrabold text-[#315C4C]">
          {formatAmount(
            order.payment.total
          )}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <PaymentPill order={order} />

        <span className="flex items-center gap-1 text-xs font-bold text-[#315C4C]">
          View order
          <Icon name="chevron" size={15} />
        </span>
      </div>
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#E5DED2] bg-white p-7 text-center shadow-[0_10px_30px_rgba(36,51,45,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#315C4C]">
        <Icon name="box" size={26} />
      </div>

      <h3 className="mt-4 text-base font-bold text-[#24332D]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#6B756F]">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  softClassName,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  softClassName: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E5DED2] bg-white p-4 shadow-[0_8px_24px_rgba(36,51,45,0.05)]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${softClassName}`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-semibold text-[#6B756F]">
        {label}
      </p>

      <p className="mt-1 text-xl font-extrabold text-[#24332D]">
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-[11px] text-[#6B756F]">
          {detail}
        </p>
      )}
    </div>
  );
}

function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  const items: {
    id: ActiveTab;
    label: string;
    icon:
      | "home"
      | "orders"
      | "collection";
  }[] = [
    {
      id: "TODAY",
      label: "Today",
      icon: "home",
    },
    {
      id: "ORDERS",
      label: "Orders",
      icon: "orders",
    },
    {
      id: "COLLECTIONS",
      label: "Collections",
      icon: "collection",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DED2] bg-[#FFF7E8]/95 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {items.map((item) => {
          const active =
            activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange(item.id)
              }
              className={`flex min-w-[90px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[11px] font-semibold transition ${
                active
                  ? "bg-[#EEF5F0] text-[#315C4C]"
                  : "text-[#6B756F]"
              }`}
            >
              <Icon
                name={item.icon}
                size={19}
              />

              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function OrdersFilter({
  filter,
  onChange,
}: {
  filter: OrderFilter;
  onChange: (filter: OrderFilter) => void;
}) {
  const filters: {
    id: OrderFilter;
    label: string;
  }[] = [
    {
      id: "ALL",
      label: "All",
    },
    {
      id: "CONFIRMED",
      label: "Confirmed",
    },
    {
      id: "OUT_FOR_DELIVERY",
      label: "Out for delivery",
    },
    {
      id: "DELIVERED",
      label: "Delivered",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {filters.map((item) => {
        const active =
          filter === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              onChange(item.id)
            }
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold ${
              active
                ? "bg-[#315C4C] text-white"
                : "border border-[#E5DED2] bg-white text-[#6B756F]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function DeliveryDashboard() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<DeliveryOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("TODAY");

  const [orderFilter, setOrderFilter] =
    useState<OrderFilter>("ALL");

  const loadOrders = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/delivery/orders",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data: OrdersResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load delivery orders."
          );
        }

        setOrders(data.orders || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load delivery orders."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function logout() {
    try {
      await fetch(
        "/api/delivery/logout",
        {
          method: "POST",
        }
      );
    } finally {
      router.replace("/delivery/login");
      router.refresh();
    }
  }

  const todayOrders = orders;

  const confirmedOrders =
    todayOrders.filter(
      (order) =>
        order.delivery.status ===
        "CONFIRMED"
    );

  const outForDeliveryOrders =
    todayOrders.filter(
      (order) =>
        order.delivery.status ===
        "OUT_FOR_DELIVERY"
    );

  const deliveredOrders =
    todayOrders.filter(
      (order) =>
        order.delivery.status ===
        "DELIVERED"
    );

  const pendingCollectionOrders =
    todayOrders.filter(
      (order) =>
        order.delivery.status ===
          "OUT_FOR_DELIVERY" &&
        !order.payment.collected
    );

  const collectedOrders =
    todayOrders.filter(
      (order) =>
        order.payment.collected
    );

  const cashCollected =
    collectedOrders
      .filter(
        (order) =>
          order.payment.method === "CASH"
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.payment.total),
        0
      );

  const qrCollected =
    collectedOrders
      .filter(
        (order) =>
          order.payment.method === "QR"
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.payment.total),
        0
      );

  const totalCollected =
    cashCollected + qrCollected;

  const pendingCollectionAmount =
    pendingCollectionOrders.reduce(
      (sum, order) =>
        sum + Number(order.payment.total),
      0
    );

  const qrAccountTotals = useMemo(() => {
    const totals = new Map<
      string,
      {
        name: string;
        amount: number;
        orders: number;
      }
    >();

    for (const order of collectedOrders) {
      if (
        order.payment.method !== "QR" ||
        !order.payment.accountId
      ) {
        continue;
      }

      const id =
        order.payment.accountId;

      const existing = totals.get(id);

      if (existing) {
        existing.amount += Number(
          order.payment.total
        );
        existing.orders += 1;
      } else {
        totals.set(id, {
          name:
            order.payment.accountName ||
            order.payment.account?.name ||
            "QR Account",
          amount: Number(
            order.payment.total
          ),
          orders: 1,
        });
      }
    }

    return Array.from(
      totals.values()
    ).sort(
      (a, b) => b.amount - a.amount
    );
  }, [collectedOrders]);

  const filteredOrders =
    useMemo(() => {
      if (orderFilter === "ALL") {
        return todayOrders;
      }

      return todayOrders.filter(
        (order) =>
          order.delivery.status ===
          orderFilter
      );
    }, [todayOrders, orderFilter]);

  function openOrder(orderId: string) {
    router.push(
      `/delivery/orders/${orderId}`
    );
  }

  function renderOrderList(
    list: DeliveryOrder[],
    emptyTitle: string,
    emptyDescription: string
  ) {
    if (list.length === 0) {
      return (
        <EmptyState
          title={emptyTitle}
          description={
            emptyDescription
          }
        />
      );
    }

    return (
      <div className="space-y-3">
        {list.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onOpen={() =>
              openOrder(order.id)
            }
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF7E8]">
        <div className="mx-auto max-w-2xl px-4 pb-28">
          <div className="flex h-16 items-center justify-between">
            <div>
              <div className="h-3 w-20 animate-pulse rounded bg-[#E5DED2]" />
              <div className="mt-2 h-5 w-32 animate-pulse rounded bg-[#E5DED2]" />
            </div>

            <div className="h-9 w-9 animate-pulse rounded-full bg-[#E5DED2]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-[24px] bg-white"
                />
              )
            )}
          </div>

          <div className="mt-4 h-48 animate-pulse rounded-[28px] bg-white" />

          <div className="mt-4 h-48 animate-pulse rounded-[28px] bg-white" />
        </div>

        <BottomNav
          activeTab="TODAY"
          onChange={() => {}}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8]">
      <div className="mx-auto max-w-2xl px-4 pb-28">
        {/* Header */}
        <header className="flex h-16 items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B756F]">
              VegItPTP
            </p>

            <h1 className="text-lg font-extrabold text-[#24332D]">
              Delivery
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                loadOrders(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.07)] disabled:opacity-50"
              aria-label="Refresh"
            >
              <Icon
                name="refresh"
                size={18}
              />
            </button>

            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#6B756F] shadow-[0_5px_18px_rgba(36,51,45,0.07)]"
              aria-label="Logout"
            >
              <Icon
                name="logout"
                size={18}
              />
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#F2A7B5] bg-[#F9D8DF] px-4 py-3 text-sm font-medium text-[#8D4E61]">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  loadOrders(true)
                }
                className="shrink-0 font-bold underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* TODAY */}
        {activeTab === "TODAY" && (
          <>
            <section>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#6B756F]">
                    Today's route
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#24332D]">
                    {todayOrders.length}{" "}
                    {todayOrders.length === 1
                      ? "order"
                      : "orders"}
                  </h2>
                </div>

                <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#6B756F] shadow-sm">
                  {deliveredOrders.length}{" "}
                  delivered
                </span>
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <SummaryCard
                label="Ready"
                value={String(
                  confirmedOrders.length
                )}
                detail="Waiting to start"
                softClassName="bg-[#EEF5F0] text-[#315C4C]"
                icon={
                  <Icon
                    name="box"
                    size={20}
                  />
                }
              />

              <SummaryCard
                label="On route"
                value={String(
                  outForDeliveryOrders.length
                )}
                detail="Currently delivering"
                softClassName="bg-[#F9D8DF] text-[#8D4E61]"
                icon={
                  <Icon
                    name="location"
                    size={20}
                  />
                }
              />

              <SummaryCard
                label="To collect"
                value={String(
                  pendingCollectionOrders.length
                )}
                detail={
                  pendingCollectionOrders.length
                    ? formatAmount(
                        pendingCollectionAmount
                      )
                    : "Nothing pending"
                }
                softClassName="bg-[#F9D8DF] text-[#8D4E61]"
                icon={
                  <Icon
                    name="collection"
                    size={20}
                  />
                }
              />

              <SummaryCard
                label="Collected"
                value={formatAmount(
                  totalCollected
                )}
                detail={`${collectedOrders.length} payments`}
                softClassName="bg-[#D9E8DF] text-[#24483B]"
                icon={
                  <Icon
                    name="check"
                    size={20}
                  />
                }
              />
            </section>

            {/* Collection snapshot */}
            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#6B756F]">
                    Collected today
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold text-[#24332D]">
                    {formatAmount(
                      totalCollected
                    )}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "COLLECTIONS"
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold text-[#315C4C]"
                >
                  View details
                  <Icon
                    name="arrow"
                    size={14}
                  />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#EEF5F0] p-4">
                  <div className="flex items-center gap-2 text-[#315C4C]">
                    <Icon
                      name="cash"
                      size={17}
                    />
                    <span className="text-xs font-bold">
                      CASH
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-extrabold text-[#24332D]">
                    {formatAmount(
                      cashCollected
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F9D8DF] p-4">
                  <div className="flex items-center gap-2 text-[#8D4E61]">
                    <Icon
                      name="qr"
                      size={17}
                    />
                    <span className="text-xs font-bold">
                      QR
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-extrabold text-[#24332D]">
                    {formatAmount(
                      qrCollected
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Current deliveries */}
            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#6B756F]">
                    Current work
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold text-[#24332D]">
                    Deliveries
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("ORDERS")
                  }
                  className="text-xs font-bold text-[#315C4C]"
                >
                  All orders
                </button>
              </div>

              {renderOrderList(
                [
                  ...outForDeliveryOrders,
                  ...confirmedOrders,
                ],
                "No active deliveries",
                "New confirmed orders will appear here."
              )}
            </section>
          </>
        )}

        {/* ORDERS */}
        {activeTab === "ORDERS" && (
          <>
            <section>
              <p className="text-xs font-semibold text-[#6B756F]">
                Delivery queue
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#24332D]">
                Orders
              </h2>

              <p className="mt-1 text-sm text-[#6B756F]">
                Open an order to manage delivery
                and payment.
              </p>
            </section>

            <div className="mt-4">
              <OrdersFilter
                filter={orderFilter}
                onChange={setOrderFilter}
              />
            </div>

            <section className="mt-4">
              {renderOrderList(
                filteredOrders,
                "No orders here",
                "Orders matching this status will appear here."
              )}
            </section>
          </>
        )}

        {/* COLLECTIONS */}
        {activeTab === "COLLECTIONS" && (
          <>
            <section>
              <p className="text-xs font-semibold text-[#6B756F]">
                Payment collection
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#24332D]">
                Collections
              </h2>

              <p className="mt-1 text-sm text-[#6B756F]">
                Actual payments collected from today's
                deliveries.
              </p>
            </section>

            <section className="mt-4 rounded-[30px] bg-[#315C4C] p-5 text-white shadow-[0_15px_35px_rgba(49,92,76,0.18)]">
              <p className="text-xs font-medium text-white/70">
                Total collected
              </p>

              <p className="mt-1 text-3xl font-extrabold">
                {formatAmount(
                  totalCollected
                )}
              </p>

              <p className="mt-2 text-xs text-white/70">
                {collectedOrders.length} payments
                recorded
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      name="cash"
                      size={17}
                    />

                    <span className="text-xs font-bold">
                      CASH
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-extrabold">
                    {formatAmount(
                      cashCollected
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      name="qr"
                      size={17}
                    />

                    <span className="text-xs font-bold">
                      QR
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-extrabold">
                    {formatAmount(
                      qrCollected
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* QR account breakdown */}
            {qrAccountTotals.length > 0 && (
              <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_30px_rgba(36,51,45,0.06)]">
                <div>
                  <p className="text-xs font-semibold text-[#6B756F]">
                    QR breakdown
                  </p>

                  <h2 className="mt-1 text-base font-extrabold text-[#24332D]">
                    By receiving account
                  </h2>
                </div>

                <div className="mt-4 divide-y divide-[#E5DED2]">
                  {qrAccountTotals.map(
                    (account) => (
                      <div
                        key={account.name}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F9D8DF] text-[#8D4E61]">
                            <Icon
                              name="qr"
                              size={18}
                            />
                          </span>

                          <div>
                            <p className="text-sm font-bold text-[#24332D]">
                              {account.name}
                            </p>

                            <p className="mt-0.5 text-xs text-[#6B756F]">
                              {account.orders}{" "}
                              {account.orders ===
                              1
                                ? "payment"
                                : "payments"}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-extrabold text-[#315C4C]">
                          {formatAmount(
                            account.amount
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Pending collection */}
            <section className="mt-4">
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#6B756F]">
                  Needs attention
                </p>

                <h2 className="mt-1 text-base font-extrabold text-[#24332D]">
                  Pending collections
                </h2>
              </div>

              {renderOrderList(
                pendingCollectionOrders,
                "Nothing pending",
                "All active deliveries have their payment recorded."
              )}
            </section>

            {/* Recent collected */}
            <section className="mt-5">
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#6B756F]">
                  Completed payments
                </p>

                <h2 className="mt-1 text-base font-extrabold text-[#24332D]">
                  Collected orders
                </h2>
              </div>

              {renderOrderList(
                collectedOrders.filter(
                  (order) =>
                    order.delivery.status !==
                    "CONFIRMED"
                ),
                "No payments yet",
                "Collected payments will appear here."
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </main>
  );
}