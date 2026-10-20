"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];

  addItem: (item: CartItem) => void;

  updateQuantity: (
    id: string,
    quantity: number
  ) => void;

  removeItem: (id: string) => void;

  clearCart: () => void;

  getQuantity: (id: string) => number;

  itemCount: number;
};

const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );

const STORAGE_KEY = "vegitptp-cart";

const MIN_QUANTITY = 0.25;
const MAX_QUANTITY = 50;

/*
 * Quantity rules:
 *
 * 250 g → 500 g → 750 g → 1 kg
 *
 * After 1 kg:
 *
 * 1 kg → 1.5 kg → 2 kg → 2.5 kg ...
 */
function getQuantityStep(quantity: number) {
  return quantity < 1 ? 0.25 : 0.5;
}

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

  const step =
    getQuantityStep(quantity);

  const rounded =
    Math.round(quantity / step) * step;

  return (
    Math.abs(rounded - quantity) <
    0.000001
  );
}

function normalizeQuantity(quantity: number) {
  const step =
    getQuantityStep(quantity);

  const rounded =
    Math.round(quantity / step) * step;

  return Number(rounded.toFixed(2));
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>(
    []
  );

  const [hydrated, setHydrated] =
    useState(false);

  /*
   * Load saved basket from the device.
   */
  useEffect(() => {
    try {
      const storedCart =
        localStorage.getItem(STORAGE_KEY);

      if (!storedCart) {
        return;
      }

      const parsedCart = JSON.parse(
        storedCart
      );

      if (!Array.isArray(parsedCart)) {
        return;
      }

      const validItems: CartItem[] =
        parsedCart
          .filter((item) => {
            if (!item) {
              return false;
            }

            if (
              typeof item.id !== "string" ||
              item.id.trim() === ""
            ) {
              return false;
            }

            if (
              typeof item.quantity !==
              "number"
            ) {
              return false;
            }

            return isValidQuantity(
              item.quantity
            );
          })
          .map((item) => ({
            id: item.id,
            quantity: normalizeQuantity(
              item.quantity
            ),
          }));

      setItems(validItems);
    } catch (error) {
      console.error(
        "CART_STORAGE_LOAD_ERROR:",
        error
      );

      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  /*
   * Save basket to the device.
   */
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        "CART_STORAGE_SAVE_ERROR:",
        error
      );
    }
  }, [items, hydrated]);

  /*
   * Add an item to the basket.
   *
   * If it already exists, its quantity
   * is increased instead of creating
   * a duplicate line.
   */
  function addItem(item: CartItem) {
    if (
      typeof item.id !== "string" ||
      item.id.trim() === ""
    ) {
      return;
    }

    if (!isValidQuantity(item.quantity)) {
      return;
    }

    const quantity = normalizeQuantity(
      item.quantity
    );

    setItems((currentItems) => {
      const existingItem =
        currentItems.find(
          (existing) =>
            existing.id === item.id
        );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            id: item.id,
            quantity,
          },
        ];
      }

      const nextQuantity =
        existingItem.quantity + quantity;

      const limitedQuantity = Math.min(
        MAX_QUANTITY,
        normalizeQuantity(nextQuantity)
      );

      return currentItems.map((existing) =>
        existing.id === item.id
          ? {
              ...existing,
              quantity: limitedQuantity,
            }
          : existing
      );
    });
  }

  /*
   * Update an existing item's quantity.
   */
  function updateQuantity(
    id: string,
    quantity: number
  ) {
    if (!id) {
      return;
    }

    /*
     * Going below 250 g removes the item.
     */
    if (
      !Number.isFinite(quantity) ||
      quantity < MIN_QUANTITY
    ) {
      removeItem(id);
      return;
    }

    /*
     * Keep quantity inside the supported range.
     */
    const cappedQuantity = Math.min(
      MAX_QUANTITY,
      quantity
    );

    const normalizedQuantity =
      normalizeQuantity(cappedQuantity);

    if (
      !isValidQuantity(normalizedQuantity)
    ) {
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity:
                normalizedQuantity,
            }
          : item
      )
    );
  }

  /*
   * Remove one item completely.
   */
  function removeItem(id: string) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== id
      )
    );
  }

  /*
   * Empty the entire basket.
   */
  function clearCart() {
    setItems([]);
  }

  /*
   * Get the quantity of a particular
   * vegetable currently in the basket.
   */
  function getQuantity(id: string) {
    const item = items.find(
      (item) => item.id === id
    );

    return item?.quantity ?? 0;
  }

  /*
   * Total quantity across all products.
   *
   * Example:
   * Tomato 1 kg + Potato 2 kg = 3 kg
   *
   * This is intentionally quantity-based,
   * not number-of-products-based.
   */
  const itemCount = items.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getQuantity,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(
    CartContext
  );

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}