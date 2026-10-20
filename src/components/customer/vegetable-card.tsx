"use client";

import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import QuantitySelector from "@/components/cart/quantity-selector";
import { useLanguage } from "@/components/language/language-provider";
import { useTranslations } from "@/lib/use-translations";

type VegetableCardProps = {
  vegetable: {
    id: string;
    nameTe: string;
    nameEn: string;
    price: string;
    unit: string;
    imageUrl: string | null;
  };
};

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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

export default function VegetableCard({
  vegetable,
}: VegetableCardProps) {
  const { addItem, getQuantity } = useCart();
  const { language } = useLanguage();
  const t = useTranslations();
  const displayName =
    (language === "te" ? vegetable.nameTe : vegetable.nameEn) ||
    vegetable.nameEn ||
    vegetable.nameTe;

  const [showQuantitySelector, setShowQuantitySelector] =
    useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const quantity = getQuantity(vegetable.id);

  function handleAdd(selectedQuantity: number) {
    addItem({
      id: vegetable.id,
      quantity: selectedQuantity,
    });

    setShowQuantitySelector(false);
  }

  return (
    <>
      <article className="market-card group overflow-hidden p-2.5 transition-transform duration-200 active:scale-[0.985]">
        {/* Vegetable image */}
        <div className="relative aspect-square overflow-hidden rounded-[17px] bg-[var(--surface-warm)]">
          {vegetable.imageUrl && !imageFailed ? (
            <Image
              src={vegetable.imageUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 45vw, 240px"
              className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center">
              <div>
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)]">
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
                    <path d="m4 7 8-4 8 4v10l-8 4-8-4Z" />
                    <path d="m4 7 8 4 8-4" />
                    <path d="M12 11v10" />
                  </svg>
                </div>

                <p className="mt-2 px-3 text-[10px] font-medium text-[var(--tone-light)]">
                  {t.common.imageComingSoon}
                </p>
              </div>
            </div>
          )}

          {/* In-cart indicator */}
          {quantity > 0 && (
            <div className="absolute right-2.5 top-2.5 flex h-8 min-w-8 items-center justify-center gap-1 rounded-full bg-[var(--brand-primary)] px-2.5 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(37,51,43,0.20)]">
              <CheckIcon />
              {quantity}
            </div>
          )}
        </div>

        {/* Information */}
        <div className="px-1.5 pb-1.5 pt-3">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
              {displayName}
            </p>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[18px] font-bold tracking-[-0.025em] text-[var(--brand-primary)]">
                ₹{vegetable.price}
              </span>

              <span className="ml-1 text-[11px] font-medium text-[var(--text-muted)]">
                / {vegetable.unit}
              </span>
            </div>

            {quantity > 0 && (
              <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
                {quantity} kg
              </span>
            )}
          </div>

          {/* Add / quantity state */}
          <button
            type="button"
            onClick={() =>
              setShowQuantitySelector(true)
            }
            className={`mt-3 flex min-h-[45px] w-full items-center justify-center gap-2 rounded-[16px] text-[13px] font-bold transition active:scale-[0.97] ${
              quantity > 0
                ? "border border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                : "bg-[var(--brand-primary)] text-white shadow-[0_8px_18px_rgba(40,90,67,0.18)] active:bg-[var(--brand-primary)]"
            }`}
          >
            {quantity > 0 ? (
              <>
                <PlusIcon />
                {t.common.addMore}
              </>
            ) : (
              <>
                <PlusIcon />
                {t.common.addToBasket}
              </>
            )}
          </button>
        </div>
      </article>

      {showQuantitySelector && (
        <QuantitySelector
          productName={displayName}
          onConfirm={handleAdd}
          onClose={() =>
            setShowQuantitySelector(false)
          }
        />
      )}
    </>
  );
}