"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import VegetableCard from "@/components/customer/vegetable-card";
import { formatTranslation } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

type Vegetable = {
  id: string;
  nameTe: string;
  nameEn: string;
  price: string;
  unit: string;
  imageUrl: string | null;
};

export default function MarketCatalog({
  vegetables,
  search,
}: {
  vegetables: Vegetable[];
  search: string;
}) {
  const { items } = useCart();
  const t = useTranslations();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const matchingVegetables = useMemo(() => {
    const query = search.toLocaleLowerCase();
    return vegetables.filter((vegetable) => {
      const matchesSearch =
        !query ||
        vegetable.nameEn.toLocaleLowerCase().includes(query) ||
        vegetable.nameTe.toLocaleLowerCase().includes(query);
      return matchesSearch &&
        (!selectedUnit || vegetable.unit === selectedUnit);
    });
  }, [search, selectedUnit, vegetables]);

  const units = useMemo(
    () => Array.from(new Set(vegetables.map((vegetable) => vegetable.unit))),
    [vegetables]
  );
  const pricesById = useMemo(
    () => new Map(vegetables.map((vegetable) => [vegetable.id, Number(vegetable.price)])),
    [vegetables]
  );
  const basketTotal = items.reduce(
    (total, item) => total + (pricesById.get(item.id) ?? 0) * item.quantity,
    0
  );

  return (
    <>
      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--tone-light)]">
              {search ? t.home.searchResults : t.home.freshToday}
            </p>
            <h2 className="mt-1 text-[22px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
              {search
                ? formatTranslation(t.home.resultsFor, { search })
                : t.home.vegetables}
            </h2>
          </div>
          <p className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">
            {formatTranslation(t.home.itemsAvailable, {
              count: matchingVegetables.length,
            })}
          </p>
        </div>

        {!search && units.length > 1 && (
          <div
            className="category-scroll mt-4 flex gap-2 overflow-x-auto pb-1"
            aria-label={t.home.categories}
          >
            <button
              type="button"
              aria-pressed={selectedUnit === null}
              onClick={() => setSelectedUnit(null)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                selectedUnit === null
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-[var(--border-default)] bg-white text-[var(--text-muted)]"
              }`}
            >
              {t.home.allCategories}
            </button>
            {units.map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={selectedUnit === unit}
                onClick={() => setSelectedUnit(unit)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                  selectedUnit === unit
                    ? "bg-[var(--brand-primary)] text-white"
                    : "border border-[var(--border-default)] bg-white text-[var(--text-muted)]"
                }`}
              >
                {formatTranslation(t.home.unitCategory, { unit })}
              </button>
            ))}
          </div>
        )}
      </section>

      {matchingVegetables.length === 0 ? (
        <section className="market-card mt-4 p-7 text-center">
          <h3 className="text-lg font-bold text-[var(--app-foreground)]">
            {search ? t.home.noResults : t.home.noVegetables}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {search
              ? formatTranslation(t.home.nothingMatching, { search })
              : t.home.checkAgain}
          </p>
          {search && (
            <Link
              href="/"
              className="market-primary-action mt-5 inline-flex items-center justify-center px-5 text-sm"
            >
              {t.common.viewAllVegetables}
            </Link>
          )}
        </section>
      ) : (
        <section className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {matchingVegetables.map((vegetable) => (
              <VegetableCard key={vegetable.id} vegetable={vegetable} />
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-3 sm:bottom-24">
          <Link
            href="/cart"
            className="mx-auto flex min-h-[66px] max-w-xl items-center justify-between gap-4 rounded-2xl border border-white/20 bg-[var(--brand-primary)] px-4 text-white shadow-[0_12px_35px_rgba(22,55,36,0.3)] transition hover:bg-[#1d4b2e] active:scale-[0.99]"
            aria-label={formatTranslation(t.navigation.openBasketWithItems, {
              count: items.length,
            })}
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold">
                {items.length}{" "}
                {items.length === 1 ? t.common.item : t.common.items}
              </span>
              <span className="mt-0.5 block text-xs text-white/75">
                {t.home.basketSubtotal}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-base font-extrabold">
                ₹{basketTotal.toFixed(0)}
              </span>
              <span className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-extrabold text-[var(--app-foreground)]">
                {t.home.continueToBasket}
              </span>
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
