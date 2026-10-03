"use client";

import { useState } from "react";

type QuantitySelectorProps = {
  productName: string;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
};

const quickQuantities = [
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
];

export default function QuantitySelector({
  productName,
  onConfirm,
  onClose,
}: QuantitySelectorProps) {
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(
    null
  );

  const [customMode, setCustomMode] = useState(false);
  const [customQuantity, setCustomQuantity] = useState("");

  function confirm() {
    const quantity = customMode
      ? Number(customQuantity)
      : selectedQuantity;

    if (!quantity || quantity < 0.5) return;

    if (quantity > 50) return;

    if (quantity % 0.5 !== 0) return;

    onConfirm(quantity);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-t-3xl bg-white p-5 shadow-xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              How much {productName}?
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose the quantity you need.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!customMode ? (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {quickQuantities.map((quantity) => {
                const selected =
                  selectedQuantity === quantity;

                return (
                  <button
                    key={quantity}
                    type="button"
                    onClick={() =>
                      setSelectedQuantity(quantity)
                    }
                    className={`rounded-2xl border px-3 py-4 text-base font-semibold transition ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {quantity < 1
                      ? `${quantity * 1000} g`
                      : `${quantity} kg`}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomMode(true);
                setSelectedQuantity(null);
              }}
              className="mt-3 w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm font-semibold text-gray-600"
            >
              More quantity
            </button>
          </>
        ) : (
          <div className="mt-5">
            <label
              htmlFor="custom-quantity"
              className="text-sm font-medium text-gray-700"
            >
              Enter quantity in kg
            </label>

            <input
              id="custom-quantity"
              type="number"
              inputMode="decimal"
              min="0.5"
              max="50"
              step="0.5"
              value={customQuantity}
              onChange={(event) =>
                setCustomQuantity(event.target.value)
              }
              placeholder="Example: 4.5"
              className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg outline-none focus:border-green-600"
            />

            <p className="mt-2 text-xs text-gray-500">
              Minimum 500 g · Use 500 g steps · Maximum 50 kg
            </p>

            <button
              type="button"
              onClick={() => {
                setCustomMode(false);
                setCustomQuantity("");
              }}
              className="mt-3 text-sm font-medium text-green-700"
            >
              ← Choose a quick quantity
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={
            customMode
              ? !customQuantity
              : selectedQuantity === null
          }
          onClick={confirm}
          className="mt-5 w-full rounded-2xl bg-green-600 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}