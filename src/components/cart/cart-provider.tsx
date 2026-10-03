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

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

const STORAGE_KEY = "vegitptp-cart";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load cart
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(STORAGE_KEY);

      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);

        if (Array.isArray(parsedCart)) {
          const validItems = parsedCart.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.quantity === "number" &&
              item.quantity > 0
          );

          setItems(validItems);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save cart
  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  }, [items, hydrated]);

  function addItem(item: CartItem) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (existing) => existing.id === item.id
      );

      if (existingItem) {
        return currentItems.map((existing) =>
          existing.id === item.id
            ? {
                ...existing,
                quantity:
                  existing.quantity + item.quantity,
              }
            : existing
        );
      }

      return [...currentItems, item];
    });
  }

  function updateQuantity(
    id: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== id
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  function getQuantity(id: string) {
    const item = items.find(
      (item) => item.id === id
    );

    return item?.quantity ?? 0;
  }

  const itemCount = items.reduce(
    (total, item) => total + item.quantity,
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
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}