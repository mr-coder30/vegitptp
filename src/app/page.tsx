import Link from "next/link";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import {
  formatTranslation,
  translations,
  type TranslationDictionary,
} from "@/lib/translation-dictionary";
import type { Language } from "@/components/language/language-provider";

import MarketCatalog from "@/components/customer/market-catalog";

type HomePageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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

function SearchIcon() {
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
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
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

function getStatusDetails(
  status: string,
  translationsForStatus: TranslationDictionary["status"]
) {
  switch (status) {
    case "CONFIRMED":
      return {
        label: translationsForStatus.confirmed,
        description: translationsForStatus.confirmedDescription,
        badge: "bg-[var(--brand-border)] text-[var(--brand-primary)]",
        iconBg: "bg-[var(--brand-primary)] text-white",
        type: "confirmed",
      };

    case "OUT_FOR_DELIVERY":
      return {
        label: translationsForStatus.outForDelivery,
        description: translationsForStatus.outForDeliveryDescription,
        badge: "bg-[var(--brand-border)] text-[var(--brand-primary)]",
        iconBg: "bg-[var(--brand-primary)] text-white",
        type: "delivery",
      };

    case "DELIVERED":
      return {
        label: translationsForStatus.delivered,
        description: translationsForStatus.deliveredDescription,
        badge: "bg-[var(--brand-primary)] text-white",
        iconBg: "bg-[var(--brand-primary)] text-white",
        type: "delivered",
      };

    case "CANCELLED":
      return {
        label: translationsForStatus.cancelled,
        description: translationsForStatus.cancelledDescription,
        badge: "bg-[var(--danger-soft)] text-[var(--danger-text)]",
        iconBg: "bg-[var(--danger)] text-white",
        type: "cancelled",
      };

    default:
      return {
        label: translationsForStatus.pending,
        description: translationsForStatus.pendingDescription,
        badge: "bg-[var(--gold)] text-white",
        iconBg: "bg-[var(--gold)] text-white",
        type: "pending",
      };
  }
}

function StatusIcon({ type }: { type: string }) {
  if (type === "delivery") {
    return <TruckIcon />;
  }

  if (type === "delivered") {
    return <CheckIcon />;
  }

  if (type === "pending") {
    return <ClockIcon />;
  }

  return <PackageIcon />;
}

function isRunningOrder(status: string) {
  return (
    status === "PENDING" ||
    status === "CONFIRMED" ||
    status === "OUT_FOR_DELIVERY"
  );
}

function formatDate(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default async function HomePage({
  searchParams,
}: HomePageProps) {
  const cookieStore = await cookies();
  const language: Language =
    cookieStore.get("vegitptp-language")?.value === "te"
      ? "te"
      : "en";
  const t = translations[language];
  const params = await searchParams;

  const search =
    typeof params.search === "string"
      ? params.search.trim()
      : "";

  /*
   * ---------------------------------------------------------
   * VEGETABLE CATALOGUE
   * ---------------------------------------------------------
   */

  const vegetables = await prisma.vegetable.findMany({
    where: {
      isAvailable: true,
    },

    orderBy: {
      nameEn: "asc",
    },
  });

  /*
   * ---------------------------------------------------------
   * AUTHENTICATED CUSTOMER
   * ---------------------------------------------------------
   */

  const customer = await getAuthenticatedCustomer();

  /*
   * ---------------------------------------------------------
   * RECENT / CURRENT ORDER
   *
   * Prefer the newest running order.
   * Otherwise use the newest order.
   * ---------------------------------------------------------
   */

  let recentOrder = null;

  if (customer) {
    recentOrder = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
      },

      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    /*
     * The status ordering above should not be relied upon
     * for business priority, so explicitly prefer a running
     * order when one exists.
     */
    const runningOrder =
      await prisma.order.findFirst({
        where: {
          customerId: customer.id,
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "OUT_FOR_DELIVERY",
            ],
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (runningOrder) {
      recentOrder = runningOrder;
    }
  }

  const status = recentOrder
    ? getStatusDetails(recentOrder.status, t.status)
    : null;

  const running = recentOrder
    ? isRunningOrder(recentOrder.status)
    : false;

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-40 pt-5 sm:px-6 lg:px-10">
        {/* -------------------------------------------------
            WELCOME
        ------------------------------------------------- */}

        <section className="flex flex-col justify-between gap-3 rounded-2xl bg-[var(--brand-primary)] px-5 py-4 text-white shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              {t.home.eyebrow}
            </p>
            <h1 className="mt-1 text-[25px] font-bold tracking-[-0.04em] sm:text-[30px]">
              {customer?.name
                ? formatTranslation(t.home.greeting, {
                    name: customer.name.split(" ")[0],
                  })
                : t.home.title}
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/80">
            {t.home.description}
          </p>
        </section>

        {/* -------------------------------------------------
            RECENT / CURRENT ORDER
        ------------------------------------------------- */}

        {recentOrder ? (
          <section className="mt-5">
            <Link
              href={`/order-success?order=${encodeURIComponent(
                recentOrder.orderNumber
              )}`}
              className="market-card mt-3 block overflow-hidden transition active:scale-[0.99]"
            >
              <div className="p-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${status?.iconBg}`}
                  >
                    <StatusIcon
                      type={status?.type ?? "pending"}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tone-light)]">
                          {running
                            ? t.home.currentOrder
                            : t.home.recentOrder}
                        </p>

                        <p className="mt-1 truncate text-[14px] font-bold text-[var(--app-foreground)]">
                          #{recentOrder.orderNumber}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                          {status?.description}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${status?.badge}`}
                      >
                        {status?.label}
                      </span>
                    </div>

                  </div>

                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--brand-primary)]">
                    <ArrowRightIcon />
                  </div>
                </div>

                {running && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                      {t.common.delivery}:{" "}
                      {recentOrder.deliverySlotLabel}
                    </p>

                    <p className="text-[10px] font-bold text-[var(--brand-primary)]">
                      {t.home.trackOrder} →
                    </p>
                  </div>
                )}

                {!running && (
                  <p className="mt-3 text-[10px] font-semibold text-[var(--tone-light)]">
                    {formatDate(recentOrder.createdAt, language)}
                  </p>
                )}
              </div>
            </Link>
          </section>
        ) : null}

        {/* -------------------------------------------------
            SEARCH
        ------------------------------------------------- */}

        <section className="mt-5">
          <form
            action="/"
            method="GET"
            className="relative"
          >
            <div className="flex min-h-[56px] items-center gap-3 rounded-[19px] border border-[var(--border-default)] bg-white px-4 shadow-[0_10px_28px_rgba(37,51,43,0.05)] focus-within:border-[var(--brand-primary)] focus-within:shadow-[0_10px_28px_rgba(40,90,67,0.09)]">
              <SearchIcon />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder={t.common.searchVegetables}
                aria-label={t.common.searchVegetables}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--app-foreground)] outline-none placeholder:text-[var(--tone-light)]"
              />

              {search && (
                <Link
                  href="/"
                  aria-label={t.common.clearSearch}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--text-muted)]"
                >
                  <span className="text-lg leading-none">
                    ×
                  </span>
                </Link>
              )}

              <button
                type="submit"
                className="flex h-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-primary)] px-3 text-[11px] font-bold text-white active:scale-[0.96]"
              >
                {t.common.search}
              </button>
            </div>
          </form>
        </section>

        <MarketCatalog
          search={search}
          vegetables={vegetables.map((vegetable) => ({
            id: vegetable.id,
            nameTe: vegetable.nameTe,
            nameEn: vegetable.nameEn,
            price: vegetable.price.toString(),
            unit: vegetable.unit,
            imageUrl: vegetable.imageUrl,
          }))}
        />
      </div>
    </div>
  );
}