"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../cart/cart-provider";

type DeliverySlot =
  | "MORNING_0630"
  | "MORNING_0800"
  | "MORNING_1000"
  | "EVENING_1800"
  | "EVENING_2000";

type SavedCustomer = {
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
};

const CUSTOMER_STORAGE_KEY = "vegitptp-customer";

const DELIVERY_SLOTS: {
  value: DeliverySlot;
  label: string;
}[] = [
  {
    value: "MORNING_0630",
    label: "6:30 AM",
  },
  {
    value: "MORNING_0800",
    label: "8:00 AM",
  },
  {
    value: "MORNING_1000",
    label: "10:00 AM",
  },
  {
    value: "EVENING_1800",
    label: "6:00 PM",
  },
  {
    value: "EVENING_2000",
    label: "8:00 PM",
  },
];

export default function CheckoutForm() {
  const router = useRouter();

  const { items, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  const [deliverySlot, setDeliverySlot] =
    useState<DeliverySlot | "">("");

  const [savedCustomer, setSavedCustomer] =
    useState<SavedCustomer | null>(null);

  /*
   * Load saved customer details.
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        CUSTOMER_STORAGE_KEY
      );

      if (!stored) return;

      const customer = JSON.parse(stored);

      if (
        customer &&
        typeof customer === "object" &&
        typeof customer.name === "string" &&
        typeof customer.phone === "string" &&
        typeof customer.address === "string"
      ) {
        setSavedCustomer(customer);
      }
    } catch {
      localStorage.removeItem(
        CUSTOMER_STORAGE_KEY
      );
    }
  }, []);

  function useSavedAddress() {
    if (!savedCustomer) return;

    setName(savedCustomer.name);
    setPhone(savedCustomer.phone);
    setAddress(savedCustomer.address);
    setLandmark(
      savedCustomer.landmark ?? ""
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /*
     * --------------------------------------------------
     * 1. Basic validation
     * --------------------------------------------------
     */

    if (items.length === 0) {
      setError(
        "Your cart is empty. Please add some vegetables first."
      );
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanLandmark = landmark.trim();
    const cleanNotes = notes.trim();

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!cleanAddress) {
      setError(
        "Please enter your delivery address."
      );
      return;
    }

    if (!deliverySlot) {
      setError(
        "Please select a delivery slot."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * --------------------------------------------------
       * 2. Send order to server
       * --------------------------------------------------
       *
       * IMPORTANT:
       *
       * deliverySlot is now:
       *
       * MORNING_0630
       * MORNING_0800
       * MORNING_1000
       * EVENING_1800
       * EVENING_2000
       *
       * These exactly match Prisma.
       */

      const response = await fetch(
        "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer: {
              name: cleanName,
              phone: cleanPhone,
              address: cleanAddress,
              landmark:
                cleanLandmark || undefined,
              notes:
                cleanNotes || undefined,
            },

            items,

            deliverySlot,
          }),
        }
      );

      const data =
        await response.json();

      /*
       * Server returned an error.
       */
      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to place your order."
        );
      }

      /*
       * --------------------------------------------------
       * 3. Save customer details locally
       * --------------------------------------------------
       */

      const customerToSave: SavedCustomer = {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        landmark:
          cleanLandmark || null,
      };

      localStorage.setItem(
        CUSTOMER_STORAGE_KEY,
        JSON.stringify(customerToSave)
      );

      /*
       * --------------------------------------------------
       * 4. Clear cart
       * --------------------------------------------------
       */

      clearCart();

      /*
       * --------------------------------------------------
       * 5. Go to success page
       * --------------------------------------------------
       */

      router.push(
        `/order-success?order=${encodeURIComponent(
          data.order.orderNumber
        )}`
      );
    } catch (error) {
      console.error(
        "CHECKOUT_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Delivery Details
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Tell us where to deliver your vegetables.
        </p>
      </div>

      {/* Saved address */}
      {savedCustomer && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-green-800">
                Saved delivery address
              </p>

              <p className="mt-1 text-sm text-green-700">
                {savedCustomer.address}
              </p>

              {savedCustomer.landmark && (
                <p className="mt-1 text-xs text-green-700">
                  Near {savedCustomer.landmark}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={useSavedAddress}
              className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Use this
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="text-sm font-semibold"
          >
            Your name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Enter your name"
            className="mt-2 w-full rounded-2xl border bg-white px-4 py-4 outline-none focus:border-green-600"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="text-sm font-semibold"
          >
            Mobile number
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="numeric"
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            value={phone}
            onChange={(event) =>
              setPhone(
                event.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            placeholder="10-digit mobile number"
            className="mt-2 w-full rounded-2xl border bg-white px-4 py-4 outline-none focus:border-green-600"
          />

          <p className="mt-1 text-xs text-gray-500">
            Your mobile number helps us identify
            your saved delivery details.
          </p>
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="text-sm font-semibold"
          >
            House / delivery address
          </label>

          <textarea
            id="address"
            name="address"
            required
            rows={3}
            autoComplete="street-address"
            value={address}
            onChange={(event) =>
              setAddress(event.target.value)
            }
            placeholder="House number, street, area"
            className="mt-2 w-full resize-none rounded-2xl border bg-white px-4 py-4 outline-none focus:border-green-600"
          />
        </div>

        {/* Landmark */}
        <div>
          <label
            htmlFor="landmark"
            className="text-sm font-semibold"
          >
            Nearby landmark
            <span className="ml-1 font-normal text-gray-400">
              (optional)
            </span>
          </label>

          <input
            id="landmark"
            name="landmark"
            type="text"
            autoComplete="off"
            value={landmark}
            onChange={(event) =>
              setLandmark(event.target.value)
            }
            placeholder="Example: Near RTC Complex"
            className="mt-2 w-full rounded-2xl border bg-white px-4 py-4 outline-none focus:border-green-600"
          />
        </div>

        {/* Delivery Slot */}
        <div>
          <label className="text-sm font-semibold">
            Delivery slot
          </label>

          <p className="mt-1 text-xs text-gray-500">
            Choose a convenient delivery time.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {DELIVERY_SLOTS.map((slot) => {
              const selected =
                deliverySlot === slot.value;

              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() =>
                    setDeliverySlot(
                      slot.value
                    )
                  }
                  className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {slot.label}

                  {selected && (
                    <span className="ml-2">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="text-sm font-semibold"
          >
            Delivery note
            <span className="ml-1 font-normal text-gray-400">
              (optional)
            </span>
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Any instructions for delivery?"
            className="mt-2 w-full resize-none rounded-2xl border bg-white px-4 py-4 outline-none focus:border-green-600"
          />
        </div>

        {/* Payment */}
        <div className="rounded-2xl bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            💵 Cash on delivery
          </p>

          <p className="mt-1 text-sm text-green-700">
            Pay when your vegetables are
            delivered.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {loading
            ? "Placing order..."
            : "Place Order"}
        </button>
      </form>
    </div>
  );
}