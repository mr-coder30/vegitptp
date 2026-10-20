"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-provider";
import { useLanguage } from "@/components/language/language-provider";
import { formatTranslation } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

type Product = {
  id: string;
  name: string;
  nameTe: string;
  price: number;
  unit: string;
  imageUrl: string | null;
};

type CartProduct = Product & {
  displayName: string;
  quantity: number;
};

type CartViewProps = {
  products: Product[];
};

type StoreSettings = {
  minimumOrder: number;
  deliveryCharge: number;
};

const DEFAULT_SETTINGS: StoreSettings = {
  minimumOrder: 139,
  deliveryCharge: 20,
};

function formatQuantity(quantity: number, gram: string, kilogram: string) {
  if (quantity < 1) {
    return `${quantity * 1000} ${gram}`;
  }

  return `${quantity} ${kilogram}`;
}

function formatPrice(value: number) {
  return `₹${value.toFixed(2)}`;
}

/*
 * Quantity rules:
 *
 * Below 1 kg:
 * 250 g increments
 *
 * From 1 kg:
 * 500 g increments
 *
 * Examples:
 * 250 g → 500 g → 750 g → 1 kg
 * 1 kg → 1.5 kg → 2 kg → 2.5 kg
 */
function getNextQuantity(quantity: number) {
  if (quantity < 1) {
    return Number(
      Math.min(1, quantity + 0.25).toFixed(2)
    );
  }

  return Number(
    Math.min(50, quantity + 0.5).toFixed(2)
  );
}

function getPreviousQuantity(quantity: number) {
  if (quantity <= 0.25) {
    return 0;
  }

  if (quantity <= 1) {
    return Number(
      Math.max(0.25, quantity - 0.25).toFixed(2)
    );
  }

  return Number(
    Math.max(1, quantity - 0.5).toFixed(2)
  );
}

function BackIcon() {
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

function TrashIcon() {
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
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m7 7 .8 13h8.4L17 7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
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
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function DeliveryIcon() {
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
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="18" cy="19" r="1.5" />
    </svg>
  );
}

function MoneyIcon() {
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
      <path d="M12 3v18" />
      <path d="M17 7H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export default function CartView({
  products,
}: CartViewProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations();

  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [settings, setSettings] =
    useState<StoreSettings>(DEFAULT_SETTINGS);

  const [settingsLoading, setSettingsLoading] =
    useState(true);

  /*
   * Match cart items with current
   * server-provided product data.
   */
  const cartProducts = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find(
          (product) => product.id === item.id
        );

        if (!product) {
          return null;
        }

        return {
          ...product,
          displayName:
            (language === "te" ? product.nameTe : product.name) ||
            product.name ||
            product.nameTe,
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as CartProduct[];
  }, [items, products, language]);

  /*
   * Load current store settings.
   */
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(
          "/api/store/settings",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            t.validation.networkError
          );
        }

        const data = await response.json();

        setSettings({
          minimumOrder: Number(
            data.minimumOrder
          ),
          deliveryCharge: Number(
            data.deliveryCharge
          ),
        });
      } catch (error) {
        console.error(
          "CART_SETTINGS_ERROR:",
          error
        );

        setSettings(DEFAULT_SETTINGS);
      } finally {
        setSettingsLoading(false);
      }
    }

    loadSettings();
  }, []);

  /*
   * Basket pricing.
   *
   * Delivery is ALWAYS charged.
   * There is no free-delivery threshold.
   */
  const subtotal = cartProducts.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const deliveryCharge =
    settings.deliveryCharge;

  const total = subtotal + deliveryCharge;

  const remainingForMinimum = Math.max(
    0,
    settings.minimumOrder - subtotal
  );

  const minimumReached =
    subtotal >= settings.minimumOrder;

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/");
  }

  /*
   * Empty basket
   */
  if (cartProducts.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 py-5">
        <div className="mx-auto w-full max-w-4xl">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
          >
            <BackIcon />
          </button>

          <div className="flex min-h-[72vh] items-center justify-center">
            <div className="w-full rounded-[30px] border border-[var(--border-default)] bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(37,51,43,0.08)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 8h12l1 12H5L6 8Z" />
                  <path d="M9 8a3 3 0 0 1 6 0" />
                </svg>
              </div>

              <h1 className="mt-6 text-[25px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
                {t.cart.emptyTitle}
              </h1>

              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
                {t.cart.emptyDescription}
              </p>

              <Link
                href="/"
                className="mt-7 inline-flex min-h-[52px] w-full items-center justify-center rounded-[18px] bg-[var(--brand-primary)] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(40,90,67,0.20)] transition active:scale-[0.98]"
              >
                {t.common.startShopping}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 pb-8 pt-5">
      <div className="mx-auto max-w-5xl">
        {/* Focused page header */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t.common.back}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_7px_18px_rgba(37,51,43,0.06)] transition active:scale-[0.94]"
          >
            <BackIcon />
          </button>

          <div className="min-w-0">
            <h1 className="text-[25px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
              {t.cart.title}
            </h1>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {cartProducts.length}{" "}
              {cartProducts.length === 1
                ? t.common.vegetable
                : t.common.vegetables}
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-[14px] border border-[var(--border-default)] bg-white px-3 text-xs font-bold text-[var(--danger-text)] shadow-[0_5px_16px_rgba(37,51,43,0.05)] transition active:scale-[0.97]"
          >
            <TrashIcon />
            {t.common.clear}
          </button>
        </header>

        {/* Cart items */}
        <section className="mt-6 space-y-3">
          {cartProducts.map((item) => {
            const itemTotal =
              item.price * item.quantity;

            const previousQuantity =
              getPreviousQuantity(item.quantity);

            const nextQuantity =
              getNextQuantity(item.quantity);

            return (
              <article
                key={item.id}
                className="rounded-[26px] border border-[var(--border-default)] bg-white p-3.5 shadow-[0_10px_28px_rgba(37,51,43,0.07)]"
              >
                <div className="flex gap-3.5">
                  {/* Product image */}
                  <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[22px] bg-[var(--brand-soft)]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.displayName}
                        fill
                        sizes="92px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                        {t.common.noImage}
                      </div>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="truncate text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
                      {item.displayName}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[var(--brand-primary)]">
                      {formatPrice(item.price)}
                      <span className="ml-1 text-xs font-medium text-[var(--text-muted)]">
                        / {item.unit === "kg" ? t.common.kilogram : item.unit}
                      </span>
                    </p>

                    <p className="mt-1 text-[17px] font-bold text-[var(--app-foreground)]">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>

                {/* Quantity controls */}
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[14px] px-2 text-xs font-bold text-[var(--danger-text)] transition active:scale-[0.97]"
                  >
                    <TrashIcon />
                    {t.common.remove}
                  </button>

                  <div className="flex items-center rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-warm)] p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          previousQuantity === 0
                        ) {
                          removeItem(item.id);
                          return;
                        }

                        updateQuantity(
                          item.id,
                          previousQuantity
                        );
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[20px] font-medium text-[var(--brand-primary)] shadow-[0_3px_8px_rgba(37,51,43,0.07)] transition active:scale-[0.94]"
                      aria-label={formatTranslation(
                        t.cart.decreaseQuantity,
                        { name: item.displayName }
                      )}
                    >
                      −
                    </button>

                    <span className="min-w-[72px] text-center text-[13px] font-bold text-[var(--app-foreground)]">
                      {formatQuantity(
                        item.quantity,
                        t.common.gram,
                        t.common.kilogram
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          nextQuantity
                        )
                      }
                      disabled={
                        item.quantity >= 50
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[20px] font-medium text-[var(--brand-primary)] shadow-[0_3px_8px_rgba(37,51,43,0.07)] transition active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={formatTranslation(
                        t.cart.increaseQuantity,
                        { name: item.displayName }
                      )}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Minimum-order progress */}
        {!settingsLoading && !minimumReached && (
          <section className="mt-5">
            <div className="rounded-[24px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--gold)]">
                  <MoneyIcon />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--app-foreground)]">
                    {formatTranslation(t.cart.addAmount, {
                      amount: remainingForMinimum.toFixed(0),
                    })}
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                    {formatTranslation(t.cart.reachMinimum, {
                      amount: settings.minimumOrder,
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (subtotal /
                        settings.minimumOrder) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Minimum-order reached */}
        {!settingsLoading && minimumReached && (
          <section className="mt-5">
            <div className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[var(--brand-primary)]">
                  <CheckIcon />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--brand-primary)]">
                    {t.cart.minimumReached}
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {t.cart.readyForCheckout}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bill summary */}
        <section className="mt-5 rounded-[28px] border border-[var(--border-default)] bg-white p-5 shadow-[0_12px_30px_rgba(37,51,43,0.07)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
              {t.cart.billSummary}
            </h2>

            <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
              {cartProducts.length}{" "}
              {cartProducts.length === 1
                ? t.common.item
                : t.common.items}
            </span>
          </div>

          <div className="mt-5 space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                {t.common.subtotal}
              </span>

              <span className="font-semibold text-[var(--app-foreground)]">
                {formatPrice(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                {t.common.delivery}
              </span>

              <span className="font-semibold text-[var(--app-foreground)]">
                {settingsLoading
                  ? "—"
                  : formatPrice(
                      deliveryCharge
                    )}
              </span>
            </div>

            <div className="my-1 h-px bg-[var(--border-default)]" />

            <div className="flex items-end justify-between">
              <span className="text-base font-bold text-[var(--app-foreground)]">
                {t.common.total}
              </span>

              <span className="text-[24px] font-bold tracking-[-0.03em] text-[var(--brand-primary)]">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Checkout action */}
          {!settingsLoading &&
            (minimumReached ? (
              <Link
                href="/checkout"
                className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--brand-primary)] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(40,90,67,0.20)] transition active:scale-[0.98]"
              >
                {t.cart.continueCheckout}

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
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/"
                className="mt-5 flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[var(--brand-border)] px-5 text-[15px] font-bold text-[var(--brand-primary)] transition active:scale-[0.98]"
              >
                {t.cart.addMoreVegetables}
              </Link>
            ))}
        </section>

        {/* Reassurance */}
        <div className="flex items-center justify-center gap-2 px-4 pb-3 pt-5 text-center text-[11px] font-medium text-[var(--text-muted)]">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-[var(--brand-primary)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>

          {t.cart.reassurance}
        </div>
      </div>
    </main>
  );
}