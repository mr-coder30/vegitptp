"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { formatTranslation } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

function CartIcon() {
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
      <path d="M3.5 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5L21 7H7" />
      <circle cx="10" cy="19" r="1.5" />
      <circle cx="18" cy="19" r="1.5" />
    </svg>
  );
}

export default function AppHeader() {
  const { items } = useCart();
  const t = useTranslations();

  const basketCount = items.length;

  return (
    <header className="sticky top-0 z-40 bg-[var(--app-background)]/95 px-3 pt-3 backdrop-blur-md">
      <div className="market-card mx-auto flex h-[62px] max-w-7xl items-center justify-between rounded-[18px] px-3.5 sm:px-5">
        <Link
          href="/"
          className="flex min-w-0 items-center"
          aria-label={t.navigation.homeAria}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[13px]">
            <Image
              src="/vegitptp-icon.png"
              alt="VegItPTP"
              fill
              priority
              sizes="40px"
              className="object-contain"
            />
          </div>

          <div className="ml-2.5 min-w-0">
            <p className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-[var(--brand-primary)]">
              VegItPTP
            </p>

            <p className="mt-0.5 truncate text-[10px] leading-tight text-[var(--tone-light)]">
              {t.navigation.tagline}
            </p>
          </div>
        </Link>

        <Link
          href="/cart"
          aria-label={
            basketCount > 0
              ? formatTranslation(
                  t.navigation.openBasketWithItems,
                  { count: basketCount }
                )
              : t.navigation.openBasket
          }
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--brand-soft)] text-[var(--brand-primary)] transition active:scale-[0.94]"
        >
          <CartIcon />

          {basketCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-[21px] min-w-[21px] items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] px-1 text-[10px] font-extrabold leading-none text-[var(--app-foreground)] shadow-[0_4px_10px_rgba(37,51,43,0.12)]"
              aria-hidden="true"
            >
              {basketCount > 99 ? "99+" : basketCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}