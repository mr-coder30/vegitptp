"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/use-translations";

type QuantitySelectorProps = {
  productName: string;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
};

const quickQuantities = [
  0.25,
  0.5,
  1,
  1.5,
  2,
  3,
  5,
];

const MIN_QUANTITY = 0.25;
const MAX_QUANTITY = 50;

function formatQuantity(quantity: number) {
  if (quantity < 1) {
    return `${quantity * 1000} g`;
  }

  return `${quantity} kg`;
}

/*
 * Quantity rules:
 *
 * Below 1 kg:
 * 250 g steps
 *
 * 1 kg and above:
 * 500 g steps
 */
function isValidQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return false;
  }

  if (
    quantity < MIN_QUANTITY ||
    quantity > MAX_QUANTITY
  ) {
    return false;
  }

  const step = quantity < 1 ? 0.25 : 0.5;

  const rounded =
    Math.round(quantity / step) * step;

  return (
    Math.abs(rounded - quantity) <
    0.000001
  );
}

function normalizeQuantity(quantity: number) {
  const step = quantity < 1 ? 0.25 : 0.5;

  const rounded =
    Math.round(quantity / step) * step;

  return Number(rounded.toFixed(2));
}

export default function QuantitySelector({
  productName,
  onConfirm,
  onClose,
}: QuantitySelectorProps) {
  const t = useTranslations();
  const [selectedQuantity, setSelectedQuantity] =
    useState<number | null>(null);

  const [customMode, setCustomMode] =
    useState(false);

  const [customQuantity, setCustomQuantity] =
    useState("");

  /*
   * Prevent the page behind the sheet
   * from scrolling while the selector
   * is open.
   */
  useEffect(() => {
    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, []);

  function confirm() {
    const quantity = customMode
      ? Number(customQuantity)
      : selectedQuantity;

    if (
      quantity === null ||
      !isValidQuantity(quantity)
    ) {
      return;
    }

    onConfirm(
      normalizeQuantity(quantity)
    );
  }

  const customQuantityNumber =
    Number(customQuantity);

  const canConfirm = customMode
    ? isValidQuantity(
        customQuantityNumber
      )
    : selectedQuantity !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--app-foreground)]/35 px-0 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${t.quantity.chooseFor} ${productName}`}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-t-[30px] border border-[var(--border-default)] bg-[var(--surface-highlight)] shadow-[0_-18px_50px_rgba(37,51,43,0.16)] sm:mb-4 sm:rounded-[30px]"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Sheet handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-11 rounded-full bg-[var(--brand-border)]" />
        </div>

        <div className="px-5 pb-6 pt-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t.quantity.choose}
              </p>

              <h2 className="mt-1 truncate text-[23px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
                {productName}
              </h2>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t.quantity.selectAmount}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border-default)] bg-white text-[var(--text-muted)] shadow-[0_4px_12px_rgba(37,51,43,0.05)] transition active:scale-[0.94]"
              aria-label={t.quantity.close}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m7 7 10 10" />
                <path d="m17 7-10 10" />
              </svg>
            </button>
          </div>

          {!customMode ? (
            <>
              {/* Quick quantities */}
              <div className="mt-6 grid grid-cols-4 gap-2.5">
                {quickQuantities.map(
                  (quantity) => {
                    const selected =
                      selectedQuantity ===
                      quantity;

                    return (
                      <button
                        key={quantity}
                        type="button"
                        onClick={() =>
                          setSelectedQuantity(
                            quantity
                          )
                        }
                        className={`min-h-[58px] rounded-[18px] border px-2 text-sm font-bold transition active:scale-[0.97] ${
                          selected
                            ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_6px_16px_rgba(40,90,67,0.10)]"
                            : "border-[var(--border-default)] bg-white text-[var(--app-foreground)]"
                        }`}
                      >
                        {formatQuantity(
                          quantity
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {/* More quantity */}
              <button
                type="button"
                onClick={() => {
                  setCustomMode(true);
                  setSelectedQuantity(null);
                  setCustomQuantity("");
                }}
                className="mt-3 flex min-h-[50px] w-full items-center justify-center rounded-[17px] border border-[var(--brand-border)] bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand-primary)] transition active:scale-[0.98]"
              >
                {t.quantity.chooseMore}
              </button>
            </>
          ) : (
            <>
              {/* Custom quantity */}
              <div className="mt-6 rounded-[22px] border border-[var(--border-default)] bg-white p-4">
                <label
                  htmlFor="custom-quantity"
                  className="text-sm font-bold text-[var(--app-foreground)]"
                >
                  {t.quantity.inKilograms}
                </label>

                <div className="relative mt-2">
                  <input
                    id="custom-quantity"
                    type="number"
                    inputMode="decimal"
                    min={MIN_QUANTITY}
                    max={MAX_QUANTITY}
                    step="0.5"
                    value={customQuantity}
                    onChange={(event) =>
                      setCustomQuantity(
                        event.target.value
                      )
                    }
                    placeholder="2.5"
                    autoFocus
                    className="h-[58px] w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-highlight)] px-4 pr-14 text-lg font-semibold text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-placeholder)] focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                    {t.common.kilogram}
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">
                  {t.quantity.rangeHint}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setCustomQuantity("");
                }}
                className="mt-3 text-sm font-bold text-[var(--brand-primary)]"
              >
                {t.quantity.backToQuick}
              </button>
            </>
          )}

          {/* Confirm */}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={confirm}
            className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--brand-primary)] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(40,90,67,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--brand-border)] disabled:text-[var(--text-muted)] disabled:shadow-none"
          >
            {t.common.addToBasket}

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
          </button>
        </div>
      </div>
    </div>
  );
}