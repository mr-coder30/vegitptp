"use client";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import { useCart } from "../cart/cart-provider";
import CustomerAuth from "../customer/customer-auth";
import { useLanguage } from "@/components/language/language-provider";
import { formatTranslation } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
};

type StoreSettings = {
  minimumOrder: number;
  deliveryCharge: number;
  deliverySlots: DeliverySlot[];
};

type Vegetable = {
  id: string;
  nameTe: string;
  nameEn: string;
  price: number;
  unit: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

const DEFAULT_SETTINGS: StoreSettings = {
  minimumOrder: 139,
  deliveryCharge: 20,
  deliverySlots: [],
};

function CheckIcon({
  className = "h-4 w-4",
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
      <path d="m15 18-6-6 6-6" />
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

function LockIcon() {
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
      <rect
        width="14"
        height="11"
        x="5"
        y="10"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function formatQuantity(quantity: number, gram: string, kilogram: string) {
  if (quantity < 1) {
    return `${quantity * 1000} ${gram}`;
  }

  return `${quantity} ${kilogram}`;
}

function formatTime(
  time: string,
  language: "en" | "te",
  am: string,
  pm: string
) {
  if (!time) return "";

  const [hoursString, minutes] = time.split(":");
  const hours = Number(hoursString);

  if (!Number.isFinite(hours)) {
    return time;
  }

  const period = hours >= 12 ? pm : am;
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
}

function formatSlotTime(
  slot: DeliverySlot,
  language: "en" | "te",
  am: string,
  pm: string
) {
  const start = formatTime(slot.startTime, language, am, pm);

  if (!slot.endTime) {
    return start;
  }

  return `${start} – ${formatTime(slot.endTime, language, am, pm)}`;
}

function getSlotPeriod(slot: DeliverySlot) {
  const hours = Number(slot.startTime.split(":")[0]);

  if (!Number.isFinite(hours)) {
    return "Delivery";
  }

  if (hours < 12) {
    return "Morning";
  }

  if (hours < 17) {
    return "Afternoon";
  }

  return "Evening";
}

export default function CheckoutForm() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations();

  const { items, clearCart } = useCart();

  const [authChecking, setAuthChecking] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locality, setLocality] = useState("");
  const [notes, setNotes] = useState("");

  /*
   * IMPORTANT:
   * This is now the real DeliverySlot database ID.
   * It is NOT the old MORNING_0630-style enum.
   */
  const [deliverySlotId, setDeliverySlotId] =
    useState("");

  const [settings, setSettings] =
    useState<StoreSettings>(DEFAULT_SETTINGS);

  const [vegetables, setVegetables] =
    useState<Vegetable[]>([]);

  const [dataLoading, setDataLoading] =
    useState(true);

  /*
   * Idempotency key for the current checkout attempt.
   *
   * The same key is reused if the request is retried,
   * preventing accidental duplicate orders.
   */
  const idempotencyKeyRef =
    useRef<string | null>(null);

  async function loadAuthenticatedCustomer() {
    try {
      setAuthChecking(true);
      setError("");

      const response =
        await fetch("/api/customer/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        setAuthenticated(false);
        setCustomer(null);
        return;
      }

      if (!response.ok) {
        throw new Error(t.validation.networkError);
      }

      const data = await response.json();

      if (
        data.authenticated &&
        data.customer
      ) {
        const authenticatedCustomer =
          data.customer as Customer;

        setCustomer(authenticatedCustomer);
        setAuthenticated(true);

        setName(
          authenticatedCustomer.name ?? ""
        );

        setAddress(
          authenticatedCustomer.address ?? ""
        );

        setLandmark(
          authenticatedCustomer.landmark ?? ""
        );

        setLocality(
          authenticatedCustomer.locality ?? ""
        );
      } else {
        setAuthenticated(false);
        setCustomer(null);
      }
    } catch (error) {
      console.error(
        "CUSTOMER_SESSION_CHECK_ERROR:",
        error
      );

      setAuthenticated(false);
      setCustomer(null);

      setError(t.validation.networkError);
    } finally {
      setAuthChecking(false);
    }
  }

  useEffect(() => {
    // This bootstrap fetch is intentionally run once on mount to hydrate
    // the authenticated customer state before the form is rendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAuthenticatedCustomer();
  }, []);

  /*
   * Load:
   * 1. Current store settings
   * 2. Dynamic delivery slots
   * 3. Current vegetable prices
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      try {
        setDataLoading(true);
        setError("");

        const [
          settingsResponse,
          vegetablesResponse,
        ] = await Promise.all([
          fetch("/api/store/settings", {
            cache: "no-store",
          }),
          fetch("/api/vegetables", {
            cache: "no-store",
          }),
        ]);

        if (!settingsResponse.ok) {
          throw new Error(
            t.validation.networkError
          );
        }

        const settingsData =
          await settingsResponse.json();

        if (!vegetablesResponse.ok) {
          throw new Error(
            t.validation.networkError
          );
        }

        const vegetablesData =
          await vegetablesResponse.json();

        if (!cancelled) {
          /*
           * New dynamic format:
           *
           * deliverySlots: [
           *   {
           *     id,
           *     label,
           *     startTime,
           *     endTime
           *   }
           * ]
           *
           * The public API already returns ONLY active slots.
           */
          const loadedSlots =
            Array.isArray(
              settingsData.deliverySlots
            )
              ? settingsData.deliverySlots
                  .filter(
                    (slot: DeliverySlot) =>
                      slot &&
                      typeof slot.id ===
                        "string" &&
                      typeof slot.label ===
                        "string" &&
                      typeof slot.startTime ===
                        "string"
                  )
                  .map(
                    (slot: DeliverySlot) => ({
                      id: slot.id,
                      label: slot.label,
                      startTime:
                        slot.startTime,
                      endTime:
                        slot.endTime ?? null,
                    })
                  )
              : [];

          setSettings({
            minimumOrder: Number(
              settingsData.minimumOrder ??
                DEFAULT_SETTINGS.minimumOrder
            ),

            deliveryCharge: Number(
              settingsData.deliveryCharge ??
                DEFAULT_SETTINGS.deliveryCharge
            ),

            deliverySlots: loadedSlots,
          });

          /*
           * If the currently selected slot no longer
           * exists in the active list, clear it.
           *
           * This handles the case where an admin disables
           * a slot while the customer has checkout open.
           */
          setDeliverySlotId((current) => {
            if (!current) {
              return "";
            }

            const stillAvailable =
              loadedSlots.some(
                (slot: DeliverySlot) =>
                  slot.id === current
              );

            return stillAvailable
              ? current
              : "";
          });
        }

        if (!cancelled) {
          const loadedVegetables =
            vegetablesData.vegetables ??
            vegetablesData;

          setVegetables(
            Array.isArray(loadedVegetables)
              ? loadedVegetables.map(
                  (
                    vegetable: Vegetable
                  ) => ({
                    ...vegetable,
                    price: Number(
                      vegetable.price
                    ),
                  })
                )
              : []
          );
        }
      } catch (error) {
        console.error(
          "CHECKOUT_DATA_ERROR:",
          error
        );

        if (!cancelled) {
          setError(t.validation.networkError);
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * These are already active because the public
   * /api/store/settings endpoint only returns active slots.
   *
   * Keeping this as a separate memo makes the business
   * rule explicit and easy to maintain.
   */
  const activeDeliverySlots = useMemo(() => {
    return settings.deliverySlots;
  }, [settings.deliverySlots]);

  const hasActiveDeliverySlots =
    activeDeliverySlots.length > 0;

  /*
   * If a slot disappears from the active list,
   * automatically clear the customer's selection.
   */
  useEffect(() => {
    if (!deliverySlotId) {
      return;
    }

    const selectedStillExists =
      activeDeliverySlots.some(
        (slot) => slot.id === deliverySlotId
      );

    if (!selectedStillExists) {
      // Keep the selected slot in sync with the current live slot list.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeliverySlotId("");
    }
  }, [
    deliverySlotId,
    activeDeliverySlots,
  ]);

  const checkoutItems = useMemo(() => {
    return items
      .map((cartItem) => {
        const vegetable = vegetables.find(
          (item) => item.id === cartItem.id
        );

        if (!vegetable) {
          return null;
        }

        return {
          ...cartItem,
          vegetable,
          itemTotal:
            vegetable.price *
            cartItem.quantity,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => item !== null
      );
  }, [items, vegetables]);

  const missingVegetables =
    items.length > checkoutItems.length;

  const subtotal = useMemo(() => {
    return checkoutItems.reduce(
      (sum, item) =>
        sum + item.itemTotal,
      0
    );
  }, [checkoutItems]);

  const deliveryCharge = settings.deliveryCharge;

  const total = subtotal + deliveryCharge;

  const minimumOrderRemaining = Math.max(
    0,
    settings.minimumOrder - subtotal
  );

  const minimumOrderReached =
    subtotal >= settings.minimumOrder;

  async function handleAuthenticated() {
    await loadAuthenticatedCustomer();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!authenticated) {
      setError(
        t.validation.loginRequired
      );
      return;
    }

    if (items.length === 0) {
      setError(
        t.validation.emptyBasket
      );
      return;
    }

    if (dataLoading) {
      setError(
        t.validation.waitForData
      );
      return;
    }

    if (missingVegetables) {
      setError(
        t.validation.unavailableVegetables
      );
      return;
    }

    if (!minimumOrderReached) {
      setError(
        formatTranslation(t.validation.minimumOrder, {
          minimum: settings.minimumOrder.toFixed(2),
          remaining: minimumOrderRemaining.toFixed(2),
        })
      );
      return;
    }

    if (!hasActiveDeliverySlots) {
      setError(
        t.validation.noDelivery
      );
      return;
    }

    /*
     * Client-side protection.
     *
     * We verify that the selected ID is still one
     * of the active slots currently loaded from the server.
     */
    const selectedSlot =
      activeDeliverySlots.find(
        (slot) =>
          slot.id === deliverySlotId
      );

    if (!selectedSlot) {
      setError(
        t.validation.selectSlot
      );

      setDeliverySlotId("");

      return;
    }

    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanLandmark = landmark.trim();
    const cleanLocality = locality.trim();
    const cleanNotes = notes.trim();

    if (!cleanName) {
      setError(t.validation.enterName);
      return;
    }

    if (!cleanAddress) {
      setError(
        t.validation.enterAddress
      );
      return;
    }

    if (cleanName.length > 100) {
      setError(t.validation.nameTooLong);
      return;
    }

    if (cleanAddress.length > 500) {
      setError(
        t.validation.addressTooLong
      );
      return;
    }

    if (cleanLandmark.length > 200) {
      setError(t.validation.landmarkTooLong);
      return;
    }

    if (cleanLocality.length > 100) {
      setError(t.validation.localityTooLong);
      return;
    }

    if (cleanNotes.length > 500) {
      setError(
        t.validation.notesTooLong
      );
      return;
    }

    setLoading(true);

    /*
     * Generate the idempotency key only once
     * for this checkout attempt.
     *
     * If the network request fails after the
     * server has already created the order,
     * retrying will use the same key and the
     * API will return the existing order instead
     * of creating a duplicate.
     */
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;
    }
    const idempotencyKey =
      idempotencyKeyRef.current;

    try {
      const response = await fetch(
        "/api/orders",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              type: "vegetable",
              quantity: item.quantity,
            })),

            customer: {
              name: cleanName,
              address: cleanAddress,
              landmark: cleanLandmark || null,
              locality: cleanLocality || null,
              notes: cleanNotes || null,
            },

            deliverySlotId: selectedSlot.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setAuthenticated(false);
          setCustomer(null);

          setError(
            t.validation.sessionExpired
          );

          return;
        }

        throw new Error(
          t.validation.placeOrderError
        );
      }

      clearCart();

      router.push(
        `/order-success?order=${encodeURIComponent(
          data.order.orderNumber
        )}`
      );
    } catch (error) {
      console.error(
        "CHECKOUT_ERROR:",
        error
      );

      setError(t.validation.placeOrderError);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Authentication loading
   */
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] px-4 py-5">
        <div className="mx-auto w-full max-w-md">
          <div className="animate-pulse">
            <div className="h-11 w-11 rounded-[15px] bg-[var(--brand-border)]" />

            <div className="mt-7 h-7 w-44 rounded-xl bg-[var(--brand-border)]" />

            <div className="mt-3 h-4 w-64 rounded-lg bg-[var(--border-default)]" />

            <div className="mt-7 h-24 rounded-[28px] bg-white shadow-[0_12px_35px_rgba(40,90,67,0.06)]" />

            <div className="mt-4 h-56 rounded-[28px] bg-white shadow-[0_12px_35px_rgba(40,90,67,0.06)]" />

            <div className="mt-4 h-40 rounded-[28px] bg-white shadow-[0_12px_35px_rgba(40,90,67,0.06)]" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * Login gate
   */
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] px-4 py-5">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
          >
            <ArrowLeftIcon />
          </button>

          <div className="mt-5 overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-white shadow-[0_18px_50px_rgba(37,51,43,0.09)]">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <LockIcon />
              </div>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                VegItPTP
              </p>

              <h1 className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
                {t.checkout.loginTitle}
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {t.checkout.loginDescription}
              </p>

              <div className="mt-6">
                <CustomerAuth
                  onAuthenticated={
                    handleAuthenticated
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * Main checkout
   */
  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
        >
          <ArrowLeftIcon />
        </button>

        {/* Heading */}
        <header className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                VegItPTP
              </p>

              <h1 className="mt-1 text-[29px] font-bold tracking-[-0.04em] text-[var(--app-foreground)]">
                {t.checkout.title}
              </h1>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                {t.checkout.confirmDetails}
              </p>
            </div>

            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
              <LockIcon />
            </div>
          </div>
        </header>

        {/* Account */}
        {customer && (
          <section className="mt-5 rounded-[24px] border border-[var(--brand-border)] bg-white p-3.5 shadow-[0_10px_28px_rgba(37,51,43,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--brand-primary)] text-sm font-bold text-white">
                {customer.name
                  ?.charAt(0)
                  ?.toUpperCase() || "V"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-[var(--app-foreground)]">
                    {customer.name}
                  </p>

                  <span className="shrink-0 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">
                    {t.checkout.verified}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  +91 {customer.phone}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <CheckIcon />
              </div>
            </div>
          </section>
        )}

        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-start"
        >
          {/* Delivery address */}
          <section className="market-card overflow-hidden lg:col-start-1 lg:row-start-1">
            <div className="flex items-center gap-3 border-b border-[var(--surface-warm)] px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <LocationIcon />
              </div>

              <div>
                <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
                  {t.common.deliveryAddress}
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t.checkout.addressQuestion}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {customer?.address && (
                <div className="rounded-[20px] border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                      {t.checkout.savedAddress}
                    </p>

                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[var(--brand-primary)] shadow-sm">
                      <CheckIcon />
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-foreground)]">
                    {customer.address}
                  </p>

                  {(customer.locality ||
                    customer.landmark) && (
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {customer.locality}

                      {customer.locality &&
                        customer.landmark
                        ? " · "
                        : ""}

                      {customer.landmark}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="text-xs font-bold text-[var(--app-foreground)]"
                  >
                    {t.checkout.fullName}
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder={t.checkout.yourName}
                    disabled={loading}
                    className="mt-2 h-[52px] w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-3.5 text-sm font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-light)] focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-border)]/60 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="text-xs font-bold text-[var(--app-foreground)]"
                  >
                    {t.common.deliveryAddress}
                  </label>

                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    autoComplete="street-address"
                    value={address}
                    onChange={(event) =>
                      setAddress(
                        event.target.value
                      )
                    }
                    placeholder={t.checkout.houseStreetArea}
                    disabled={loading}
                    className="mt-2 min-h-[90px] w-full resize-none rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-3.5 py-3.5 text-sm font-medium leading-6 text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-light)] focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-border)]/60 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="locality"
                    className="text-xs font-bold text-[var(--app-foreground)]"
                  >
                    {t.checkout.locality}
                  </label>

                  <input
                    id="locality"
                    name="locality"
                    type="text"
                    autoComplete="address-level2"
                    value={locality}
                    onChange={(event) =>
                      setLocality(
                        event.target.value
                      )
                    }
                    placeholder={t.checkout.locality}
                    disabled={loading}
                    className="mt-2 h-[52px] w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-3.5 text-sm font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-light)] focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-border)]/60 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="landmark"
                    className="text-xs font-bold text-[var(--app-foreground)]"
                  >
                    {t.checkout.landmark}
                  </label>

                  <input
                    id="landmark"
                    name="landmark"
                    type="text"
                    autoComplete="off"
                    value={landmark}
                    onChange={(event) =>
                      setLandmark(
                        event.target.value
                      )
                    }
                    placeholder={t.profile.landmarkPlaceholder}
                    disabled={loading}
                    className="mt-2 h-[52px] w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-3.5 text-sm font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-light)] focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-border)]/60 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Delivery time */}
          <section className="market-card overflow-hidden lg:col-start-1 lg:row-start-2">
            <div className="flex items-center gap-3 border-b border-[var(--surface-warm)] px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--danger-soft)] text-[var(--danger-text)]">
                <ClockIcon />
              </div>

              <div>
                <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
                  {t.common.deliveryTime}
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t.common.pickSlot}
                </p>
              </div>
            </div>

            <div className="p-5">
              {dataLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-[82px] animate-pulse rounded-[20px] bg-[var(--surface-warm)]"
                      />
                    )
                  )}
                </div>
              ) : !hasActiveDeliverySlots ? (
                <div className="rounded-[20px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm font-semibold leading-6 text-[var(--danger-text)]">
                  {t.checkout.slotsUnavailable}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeDeliverySlots.map(
                    (slot) => {
                      const selected =
                        deliverySlotId ===
                        slot.id;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() =>
                            setDeliverySlotId(
                              slot.id
                            )
                          }
                          disabled={loading}
                          className={`relative min-h-[82px] rounded-[20px] border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-60 ${
                            selected
                              ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] shadow-[0_9px_24px_rgba(40,90,67,0.11)]"
                              : "border-[var(--border-default)] bg-[var(--surface-soft)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                                  selected
                                    ? "text-[var(--brand-primary)]"
                                    : "text-[var(--tone-light)]"
                                }`}
                              >
                                {getSlotPeriod(slot) === "Morning"
                                  ? t.common.morning
                                  : getSlotPeriod(slot) === "Afternoon"
                                    ? t.common.afternoon
                                    : getSlotPeriod(slot) === "Evening"
                                      ? t.common.evening
                                      : t.common.delivery}
                              </p>

                              <p
                                className={`mt-1 text-[16px] font-bold ${
                                  selected
                                    ? "text-[var(--brand-primary)]"
                                    : "text-[var(--app-foreground)]"
                                }`}
                              >
                                {slot.label}
                              </p>

                              <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">
                                {formatSlotTime(
                                  slot,
                                  language,
                                  t.common.am,
                                  t.common.pm
                                )}
                              </p>
                            </div>

                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                  : "border-[var(--brand-border)] bg-white text-transparent"
                              }`}
                            >
                              <CheckIcon />
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Order summary */}
          <section className="market-card overflow-hidden lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-[var(--surface-warm)] px-5 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--app-foreground)]">
                  {t.checkout.yourOrder}
                </h2>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t.checkout.freshVegetablesForYou}
                </p>
              </div>

              <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                {items.length}{" "}
                {items.length === 1
                  ? t.common.item
                  : t.common.items}
              </span>
            </div>

            <div className="p-5">
              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-14 animate-pulse rounded-[18px] bg-[var(--surface-warm)]"
                      />
                    )
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {checkoutItems.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[15px] bg-[var(--brand-soft)]">
                            {item.vegetable
                              .imageUrl ? (
                              <Image
                                src={
                                  item
                                    .vegetable
                                    .imageUrl
                                }
                                alt={
                                  language === "te"
                                    ? item.vegetable.nameTe ||
                                      item.vegetable.nameEn
                                    : item.vegetable.nameEn ||
                                      item.vegetable.nameTe
                                }
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="h-3 w-3 rounded-full bg-[var(--brand-border)]" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[var(--app-foreground)]">
                              {language === "te"
                                ? item.vegetable.nameTe ||
                                  item.vegetable.nameEn
                                : item.vegetable.nameEn ||
                                  item.vegetable.nameTe}
                            </p>

                            <p className="mt-0.5 text-xs text-[var(--tone-light)]">
                              {formatQuantity(
                                item.quantity,
                                t.common.gram,
                                t.common.kilogram
                              )}{" "}
                              × ₹
                              {item.vegetable.price.toFixed(
                                2
                              )}{" "}
                              /{" "}
                              {item.vegetable.unit === "kg"
                                ? t.common.kilogram
                                : item.vegetable.unit}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-[var(--app-foreground)]">
                            ₹
                            {item.itemTotal.toFixed(
                              2
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="my-5 h-px bg-[var(--surface-warm)]" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">
                        {t.common.subtotal}
                      </span>

                      <span className="font-semibold text-[var(--app-foreground)]">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">
                        {t.common.delivery}
                      </span>

                      <span className="font-semibold text-[var(--app-foreground)]">
                        ₹{deliveryCharge.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[21px] bg-[var(--brand-primary)] px-4 py-4 text-white shadow-[0_12px_28px_rgba(40,90,67,0.18)]">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--brand-border)]">
                          {t.common.total}
                        </p>

                        <p className="mt-0.5 text-xs text-white/65">
                          {t.common.includingDelivery}
                        </p>
                      </div>

                      <p className="text-[25px] font-bold tracking-[-0.03em]">
                        ₹{total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {!minimumOrderReached && (
                    <div className="mt-4 rounded-[19px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--danger-text)]">
                      {formatTranslation(t.validation.minimumOrder, {
                        minimum: settings.minimumOrder.toFixed(0),
                        remaining: minimumOrderRemaining.toFixed(2),
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Delivery note + payment */}
          <section className="market-card overflow-hidden lg:col-start-1 lg:row-start-3">
            <div className="p-5">
              <label
                htmlFor="notes"
                className="text-sm font-bold text-[var(--app-foreground)]"
              >
                {t.checkout.deliveryNotes}{" "}
                <span className="font-normal text-[var(--tone-placeholder)]">
                  · {t.common.optional}
                </span>
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder={t.checkout.notesPlaceholder}
                disabled={loading}
                className="mt-3 min-h-[82px] w-full resize-none rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 py-3.5 text-sm font-medium leading-6 text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-light)] focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-border)]/60 disabled:opacity-60"
              />
            </div>

            <div className="border-t border-[var(--surface-warm)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                  <CashIcon />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--app-foreground)]">
                    {t.common.payAtDelivery}
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {t.common.paymentAtDelivery}
                  </p>
                </div>

                <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-primary)]">
                  {t.common.atDelivery}
                </span>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-[21px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3.5 text-sm font-semibold leading-6 text-[var(--danger-text)] lg:col-span-2"
            >
              {error}
            </div>
          )}

          {/* Final action */}
          <section className="market-card p-4 lg:col-start-2 lg:row-start-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {t.checkout.orderTotal}
                </p>

                <p className="mt-0.5 text-lg font-bold text-[var(--app-foreground)]">
                  ₹{total.toFixed(2)}
                </p>
              </div>

              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)]">
                <LockIcon />
                {t.common.secureCheckout}
              </span>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                dataLoading ||
                items.length === 0 ||
                missingVegetables ||
                !minimumOrderReached ||
                !hasActiveDeliverySlots ||
                !deliverySlotId
              }
              className="market-primary-action flex min-h-[58px] w-full items-center justify-between px-5 text-left"
            >
              <div>
                <p className="text-[11px] font-medium text-white/65">
                  {loading
                    ? t.checkout.pleaseWait
                    : !minimumOrderReached
                      ? t.checkout.minimumNotReached
                      : !hasActiveDeliverySlots
                        ? t.checkout.deliveryUnavailable
                        : !deliverySlotId
                          ? t.checkout.chooseDeliveryTime
                          : t.checkout.everythingLooksGood}
                </p>

                <p className="mt-0.5 text-[16px] font-bold">
                  {loading
                    ? t.checkout.placingOrder
                    : dataLoading
                      ? t.checkout.loadingCheckout
                      : !minimumOrderReached
                        ? `Add ₹${minimumOrderRemaining.toFixed(
                            0
                          )} more`
                        : !hasActiveDeliverySlots
                          ? t.checkout.deliveryUnavailable
                          : !deliverySlotId
                            ? t.checkout.selectDeliveryTime
                            : t.checkout.placeOrder}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowRightIcon />
                )}
              </div>
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}