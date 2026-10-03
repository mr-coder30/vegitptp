"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import QuantitySelector from "@/components/cart/quantity-selector";

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

export default function VegetableCard({
  vegetable,
}: VegetableCardProps) {
  const { addItem, getQuantity } = useCart();

  const [showQuantitySelector, setShowQuantitySelector] =
    useState(false);

  const quantity = getQuantity(vegetable.id);

  function handleAdd(quantity: number) {
    addItem({
      id: vegetable.id,
      quantity,
    });

    setShowQuantitySelector(false);
  }

  return (
    <>
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        {/* Image */}
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gray-100">
          {vegetable.imageUrl ? (
            <img
              src={vegetable.imageUrl}
              alt={vegetable.nameEn}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-gray-400">
              Image coming soon
            </span>
          )}
        </div>

        {/* Information */}
        <div className="mt-3">
          <p className="font-semibold">
            {vegetable.nameTe}
          </p>

          <p className="text-sm text-gray-500">
            {vegetable.nameEn}
          </p>

          <p className="mt-2 font-bold">
            ₹{vegetable.price}

            <span className="ml-1 text-xs font-normal text-gray-500">
              / {vegetable.unit}
            </span>
          </p>

          <button
            type="button"
            onClick={() =>
              setShowQuantitySelector(true)
            }
            className="mt-3 w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white"
          >
            {quantity > 0
              ? `${quantity} kg in cart`
              : "Add"}
          </button>
        </div>
      </div>

      {showQuantitySelector && (
        <QuantitySelector
          productName={vegetable.nameEn}
          onConfirm={handleAdd}
          onClose={() =>
            setShowQuantitySelector(false)
          }
        />
      )}
    </>
  );
}