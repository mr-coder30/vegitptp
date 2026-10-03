"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "./cart-provider";

type Product = {
  id: string;
  name: string;
  nameTe: string;
  price: number;
  unit: string;
  imageUrl: string | null;
};

type CartViewProps = {
  products: Product[];
};

export default function CartView({
  products,
}: CartViewProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const cartProducts = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find(
          (product) => product.id === item.id
        );

        if (!product) return null;

        return {
          ...product,
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as (Product & {
      quantity: number;
    })[];
  }, [items, products]);

  const subtotal = cartProducts.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  // VegItPTP business rules
  const minimumOrder = 109;
  const freeDeliveryThreshold = 149;
  const deliveryChargeAmount = 20;

  const deliveryCharge =
    subtotal >= freeDeliveryThreshold
      ? 0
      : deliveryChargeAmount;

  const total = subtotal + deliveryCharge;

  const remainingForMinimum = Math.max(
    0,
    minimumOrder - subtotal
  );

  const remainingForFreeDelivery = Math.max(
    0,
    freeDeliveryThreshold - subtotal
  );

  if (cartProducts.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl">🛒</div>

        <h1 className="mt-5 text-2xl font-bold">
          Your Basket is empty
        </h1>

        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Add some fresh vegetables to get started.
        </p>

        <Link
          href="/"
          className="mt-6 rounded-2xl bg-green-600 px-6 py-3 font-semibold text-white"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Your Basket
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Check everything before checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-medium text-red-600"
        >
          Clear
        </button>
      </div>

      {/* Items */}
      <div className="mt-6 space-y-3">
        {cartProducts.map((item) => {
          const itemTotal =
            item.price * item.quantity;

          return (
            <div
              key={item.id}
              className="rounded-2xl border bg-white p-3 shadow-sm"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                {/* Product information */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {item.nameTe ?? item.name}
                  </p>

                  {item.nameTe && (
                    <p className="text-sm text-gray-500">
                      {item.name}
                    </p>
                  )}

                  <p className="mt-1 text-sm font-medium">
                    ₹{item.price}

                    {item.unit && (
                      <span className="ml-1 text-xs text-gray-500">
                        / {item.unit}
                      </span>
                    )}
                  </p>

                  <p className="mt-1 font-bold">
                    ₹{itemTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    removeItem(item.id)
                  }
                  className="text-sm font-medium text-red-600"
                >
                  Remove
                </button>

                <div className="flex items-center gap-3 rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.id,
                        item.quantity - 0.5
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm"
                    aria-label={`Decrease ${item.name}`}
                  >
                    −
                  </button>

                  <span className="min-w-16 text-center text-sm font-bold">
                    {item.quantity < 1
                      ? `${item.quantity * 1000} g`
                      : `${item.quantity} kg`}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.id,
                        item.quantity + 0.5
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm"
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary */}
      <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="font-bold">
          Order Summary
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-medium">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Delivery
            </span>

            <span className="font-medium">
              {subtotal >= freeDeliveryThreshold
                ? "Free"
                : `₹${deliveryChargeAmount}`}
            </span>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>

              <span>
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Below minimum */}
        {subtotal < minimumOrder && (
          <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
            Add ₹
            {remainingForMinimum.toFixed(2)} more
            to reach the ₹{minimumOrder} minimum
            order.
          </div>
        )}

        {/* Minimum reached */}
        {subtotal >= minimumOrder &&
          subtotal < freeDeliveryThreshold && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              ✓ Minimum order reached.
              <br />
              Add ₹
              {remainingForFreeDelivery.toFixed(2)}{" "}
              more for free delivery.
            </div>
          )}

        {/* Free delivery */}
        {subtotal >= freeDeliveryThreshold && (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            ✓ Free delivery unlocked
          </div>
        )}

        {/* Checkout */}
        {subtotal >= minimumOrder ? (
          <Link
            href="/checkout"
            className="mt-4 block w-full rounded-2xl bg-green-600 py-4 text-center font-bold text-white"
          >
            Continue to checkout
          </Link>
        ) : (
          <Link
            href="/"
            className="mt-4 block w-full rounded-2xl bg-gray-200 py-4 text-center font-bold text-gray-700"
          >
            Add more vegetables
          </Link>
        )}
      </div>
    </div>
  );
}