"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Settings = {
  minimumOrder: number;
  deliveryCharge: number;
};

type SlotForm = {
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  minimumOrder: 139,
  deliveryCharge: 20,
};

const EMPTY_SLOT_FORM: SlotForm = {
  label: "",
  startTime: "",
  endTime: "",
  isActive: true,
};

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "refresh"
    | "plus"
    | "edit"
    | "trash"
    | "check"
    | "close"
    | "settings"
    | "orders"
    | "payments"
    | "customers"
    | "vegetables";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11" />
          <path d="M3 4v7h7" />
          <path d="M4 13a8.1 8.1 0 0 0 14.9 3L21 13" />
          <path d="M21 20v-7h-7" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4.2v-2.6H4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <path d="M6 3h12v18H6z" />
          <path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
      );

    case "payments":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      );

    case "customers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5a3 3 0 0 1 0 6" />
          <path d="M18 14a5 5 0 0 1 3 6" />
        </svg>
      );

    case "vegetables":
      return (
        <svg {...common}>
          <path d="M12 21c4.5-2.5 7-6 7-10.5C19 6 16 3 12 3S5 6 5 10.5C5 15 7.5 18.5 12 21Z" />
          <path d="M12 3c0 4 0 8 0 13" />
          <path d="M12 8c-2-2-4-2-6-1" />
          <path d="M12 11c2-2 4-2 6-1" />
        </svg>
      );

    default:
      return null;
  }
}

function AdminBottomNav() {
  const items = [
    {
      href: "/admin/orders",
      label: "Orders",
      icon: "orders" as const,
    },
    {
      href: "/admin/payments",
      label: "Payments",
      icon: "payments" as const,
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: "customers" as const,
    },
    {
      href: "/admin/vegetables",
      label: "Vegetables",
      icon: "vegetables" as const,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DED2] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-2xl items-center justify-around px-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[#6B756F] transition active:scale-95"
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[11px] font-semibold">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function formatSlot(slot: DeliverySlot) {
  if (!slot.endTime) {
    return slot.startTime;
  }

  return `${slot.startTime} ΓÇô ${slot.endTime}`;
}

function SlotFormModal({
  open,
  editingSlot,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingSlot: DeliverySlot | null;
  form: SlotForm;
  saving: boolean;
  error: string;
  onChange: (changes: Partial<SlotForm>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#24332D]/35 px-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-[#FFF7E8] p-5 shadow-2xl sm:rounded-[30px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B756F]">
              Delivery
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#24332D]">
              {editingSlot
                ? "Edit delivery slot"
                : "Add delivery slot"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#24332D]"
            aria-label="Close"
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="slot-label"
              className="text-sm font-bold text-[#24332D]"
            >
              Slot name
            </label>

            <input
              id="slot-label"
              type="text"
              value={form.label}
              onChange={(event) =>
                onChange({
                  label: event.target.value,
                })
              }
              placeholder="Example: Morning delivery"
              className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-white px-4 text-sm text-[#24332D] outline-none transition focus:border-[#315C4C] focus:ring-2 focus:ring-[#315C4C]/10"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="slot-start"
                className="text-sm font-bold text-[#24332D]"
              >
                Start time
              </label>

              <input
                id="slot-start"
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  onChange({
                    startTime: event.target.value,
                  })
                }
                className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-white px-4 text-sm text-[#24332D] outline-none focus:border-[#315C4C] focus:ring-2 focus:ring-[#315C4C]/10"
                required
              />
            </div>

            <div>
              <label
                htmlFor="slot-end"
                className="text-sm font-bold text-[#24332D]"
              >
                End time
              </label>

              <input
                id="slot-end"
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  onChange({
                    endTime: event.target.value,
                  })
                }
                className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-white px-4 text-sm text-[#24332D] outline-none focus:border-[#315C4C] focus:ring-2 focus:ring-[#315C4C]/10"
              />

              <p className="mt-1 text-[11px] text-[#6B756F]">
                Optional for a single-time slot.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({
                isActive: !form.isActive,
              })
            }
            className="flex w-full items-center justify-between rounded-[20px] border border-[#E5DED2] bg-white p-4 text-left"
          >
            <div>
              <p className="text-sm font-bold text-[#24332D]">
                Available to customers
              </p>

              <p className="mt-1 text-xs text-[#6B756F]">
                {form.isActive
                  ? "Customers can select this slot."
                  : "This slot is hidden from new orders."}
              </p>
            </div>

            <span
              className={`relative h-7 w-12 rounded-full transition ${
                form.isActive
                  ? "bg-[#315C4C]"
                  : "bg-[#D7D8D5]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  form.isActive
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </span>
          </button>

          {error && (
            <div className="rounded-[17px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-[17px] border border-[#E5DED2] bg-white text-sm font-bold text-[#24332D]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-12 rounded-[17px] bg-[#315C4C] text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingSlot
                  ? "Save changes"
                  : "Add slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);

  const [slots, setSlots] = useState<DeliverySlot[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] =
    useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [slotModalOpen, setSlotModalOpen] =
    useState(false);
  const [editingSlot, setEditingSlot] =
    useState<DeliverySlot | null>(null);
  const [slotForm, setSlotForm] =
    useState<SlotForm>(EMPTY_SLOT_FORM);
  const [slotError, setSlotError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [settingsResponse, slotsResponse] =
        await Promise.all([
          fetch("/api/admin/settings", {
            cache: "no-store",
          }),
          fetch("/api/admin/delivery-slots", {
            cache: "no-store",
          }),
        ]);

      const settingsData =
        await settingsResponse.json();
      const slotsData =
        await slotsResponse.json();

      if (!settingsResponse.ok) {
        throw new Error(
          settingsData?.error ||
            "Unable to load settings."
        );
      }

      if (!slotsResponse.ok) {
        throw new Error(
          slotsData?.error ||
            "Unable to load delivery slots."
        );
      }

      setSettings({
        minimumOrder: Number(
          settingsData.settings.minimumOrder
        ),
        deliveryCharge: Number(
          settingsData.settings.deliveryCharge
        ),
      });

      setSlots(
        Array.isArray(slotsData.slots)
          ? slotsData.slots.map(
              (slot: DeliverySlot) => ({
                ...slot,
                sortOrder: Number(slot.sortOrder),
              })
            )
          : []
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeSlots = useMemo(
    () => slots.filter((slot) => slot.isActive),
    [slots]
  );

  async function handleSettingsSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingSettings(true);
    setError("");
    setMessage("");

    if (
      !Number.isFinite(settings.minimumOrder) ||
      !Number.isFinite(settings.deliveryCharge)
    ) {
      setError(
        "Please enter valid pricing values."
      );
      setSavingSettings(false);
      return;
    }

    if (
      settings.minimumOrder < 0 ||
      settings.deliveryCharge < 0
    ) {
      setError(
        "Settings cannot contain negative values."
      );
      setSavingSettings(false);
      return;
    }
    try {
      const response = await fetch(
        "/api/admin/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save settings."
        );
      }

      setSettings({
        minimumOrder: Number(
          data.settings.minimumOrder
        ),
        deliveryCharge: Number(
          data.settings.deliveryCharge
        ),
      });

      setMessage(
        "Ordering and delivery settings saved."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function openAddSlot() {
    setEditingSlot(null);
    setSlotForm(EMPTY_SLOT_FORM);
    setSlotError("");
    setSlotModalOpen(true);
  }

  function openEditSlot(slot: DeliverySlot) {
    setEditingSlot(slot);
    setSlotForm({
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime ?? "",
      isActive: slot.isActive,
    });
    setSlotError("");
    setSlotModalOpen(true);
  }

  function closeSlotModal() {
    if (savingSlot) return;

    setSlotModalOpen(false);
    setEditingSlot(null);
    setSlotForm(EMPTY_SLOT_FORM);
    setSlotError("");
  }

  async function handleSlotSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingSlot(true);
    setSlotError("");
    setError("");
    setMessage("");

    const label = slotForm.label.trim();
    const startTime = slotForm.startTime;
    const endTime = slotForm.endTime || null;

    if (!label) {
      setSlotError("Please enter a slot name.");
      setSavingSlot(false);
      return;
    }

    if (!startTime) {
      setSlotError("Please select a start time.");
      setSavingSlot(false);
      return;
    }

    if (endTime && endTime <= startTime) {
      setSlotError(
        "End time must be later than start time."
      );
      setSavingSlot(false);
      return;
    }

    try {
      const isEditing = Boolean(editingSlot);

      const response = await fetch(
        "/api/admin/delivery-slots",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  id: editingSlot?.id,
                  label,
                  startTime,
                  endTime,
                  isActive: slotForm.isActive,
                }
              : {
                  label,
                  startTime,
                  endTime,
                  isActive: slotForm.isActive,
                }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Unable to ${
              isEditing ? "update" : "create"
            } delivery slot.`
        );
      }

      closeSlotModal();

      setMessage(
        isEditing
          ? "Delivery slot updated."
          : "Delivery slot added."
      );

      await loadData();
    } catch (error) {
      setSlotError(
        error instanceof Error
          ? error.message
          : "Unable to save delivery slot."
      );
    } finally {
      setSavingSlot(false);
    }
  }

  async function toggleSlot(slot: DeliverySlot) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/delivery-slots",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: slot.id,
            isActive: !slot.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update delivery slot."
        );
      }

      setSlots((current) =>
        current.map((item) =>
          item.id === slot.id
            ? {
                ...item,
                isActive: !item.isActive,
              }
            : item
        )
      );

      setMessage(
        !slot.isActive
          ? `${slot.label} is now active.`
          : `${slot.label} is now disabled.`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update delivery slot."
      );
    }
  }

  async function deleteSlot(slot: DeliverySlot) {
    const confirmed = window.confirm(
      `Delete "${slot.label}"?\n\nThis can only be deleted if no historical orders use this delivery slot.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/delivery-slots",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: slot.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to delete delivery slot."
        );
      }

      setSlots((current) =>
        current.filter(
          (item) => item.id !== slot.id
        )
      );

      setMessage(
        "Delivery slot deleted successfully."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete delivery slot."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[88px] text-[#24332D]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              aria-label="Back to dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#24332D] shadow-sm transition active:scale-95"
            >
              <Icon name="back" size={20} />
            </a>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                VegItPTP Admin
              </p>

              <h1 className="text-[22px] font-extrabold tracking-tight">
                Settings
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            aria-label="Refresh settings"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#315C4C] shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Icon name="refresh" size={19} />
          </button>
        </header>

        {/* Page intro */}
        <section className="rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#EEF5F0] text-[#315C4C]">
              <Icon name="settings" size={22} />
            </div>

            <div>
              <h2 className="text-lg font-extrabold">
                Store controls
              </h2>

              <p className="mt-1 text-sm leading-5 text-[#6B756F]">
                Manage ordering rules and delivery
                slots used by customers.
              </p>
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="mt-4 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-[20px] border border-[#CDE0D4] bg-[#EEF5F0] px-4 py-3 text-sm font-semibold text-[#315C4C]">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 space-y-4">
            <div className="h-[330px] animate-pulse rounded-[28px] bg-white" />
            <div className="h-[360px] animate-pulse rounded-[28px] bg-white" />
          </div>
        ) : (
          <>
            {/* Ordering & Delivery */}
            <form
              onSubmit={handleSettingsSubmit}
              className="mt-5 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                  Pricing
                </p>

                <h2 className="mt-1 text-xl font-extrabold">
                  Ordering & Delivery
                </h2>

                <p className="mt-1 text-sm text-[#6B756F]">
                  These values control the customer's
                  order calculation.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {/* Minimum order */}
                <div>
                  <label
                    htmlFor="minimumOrder"
                    className="text-sm font-bold"
                  >
                    Minimum order
                  </label>

                  <p className="mt-1 text-xs text-[#6B756F]">
                    This charge applies to every order.
                    No free-delivery threshold applies.
                  </p>

                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#6B756F]">
                      Γé╣
                    </span>

                    <input
                      id="minimumOrder"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.minimumOrder}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          minimumOrder: Number(
                            event.target.value
                          ),
                        }))
                      }
                      className="h-12 w-full rounded-[17px] border border-[#E5DED2] bg-[#FFFDFC] px-9 text-sm font-semibold outline-none transition focus:border-[#315C4C] focus:ring-2 focus:ring-[#315C4C]/10"
                    />
                  </div>
                </div>

                {/* Delivery charge */}
                <div>
                  <label
                    htmlFor="deliveryCharge"
                    className="text-sm font-bold"
                  >
                    Delivery charge
                  </label>

                  <p className="mt-1 text-xs text-[#6B756F]">
                    Applied when an order does not
                    qualify for free delivery.
                  </p>

                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#6B756F]">
                      Γé╣
                    </span>

                    <input
                      id="deliveryCharge"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.deliveryCharge}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          deliveryCharge: Number(
                            event.target.value
                          ),
                        }))
                      }
                      className="h-12 w-full rounded-[17px] border border-[#E5DED2] bg-[#FFFDFC] px-9 text-sm font-semibold outline-none transition focus:border-[#315C4C] focus:ring-2 focus:ring-[#315C4C]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing summary */}
              <div className="mt-6 rounded-[22px] bg-[#EEF5F0] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6B756F]">
                  Current rule
                </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] text-[#6B756F]">
                      Minimum
                    </p>

                    <p className="mt-0.5 text-base font-extrabold text-[#315C4C]">
                      Γé╣
                      {settings.minimumOrder.toFixed(
                        0
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-[#6B756F]">
                      Charge
                    </p>

                    <p className="mt-0.5 text-base font-extrabold text-[#315C4C]">
                      Γé╣
                      {settings.deliveryCharge.toFixed(
                        0
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="mt-5 h-12 w-full rounded-[17px] bg-[#315C4C] text-sm font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
              >
                {savingSettings
                  ? "Saving..."
                  : "Save pricing settings"}
              </button>
            </form>

            {/* Delivery slots */}
            <section className="mt-5 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                    Delivery
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold">
                    Delivery Slots
                  </h2>

                  <p className="mt-1 text-sm text-[#6B756F]">
                    Control when customers can receive
                    their orders.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddSlot}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[17px] bg-[#315C4C] px-4 text-sm font-bold text-white shadow-sm transition active:scale-95"
                >
                  <Icon name="plus" size={17} />
                  Add
                </button>
              </div>

              {/* Slot summary */}
              <div className="mt-5 flex items-center justify-between rounded-[20px] bg-[#EEF5F0] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[#315C4C]">
                    {activeSlots.length} active
                  </p>

                  <p className="text-xs text-[#6B756F]">
                    {slots.length} total delivery slots
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#315C4C]">
                  <Icon name="check" size={18} />
                </div>
              </div>

              {/* Slots */}
              <div className="mt-4 space-y-3">
                {slots.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#D9D2C6] bg-[#FFFDFC] px-5 py-8 text-center">
                    <p className="text-sm font-bold">
                      No delivery slots yet
                    </p>

                    <p className="mt-1 text-xs text-[#6B756F]">
                      Add the first delivery slot for
                      customers.
                    </p>

                    <button
                      type="button"
                      onClick={openAddSlot}
                      className="mt-4 rounded-[15px] bg-[#315C4C] px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Add delivery slot
                    </button>
                  </div>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`rounded-[22px] border p-4 transition ${
                        slot.isActive
                          ? "border-[#D4E3D9] bg-[#F7FBF8]"
                          : "border-[#E5DED2] bg-[#FAF9F6]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-extrabold">
                              {slot.label}
                            </h3>

                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                slot.isActive
                                  ? "bg-[#D9E8DF] text-[#315C4C]"
                                  : "bg-[#ECEAE5] text-[#77756F]"
                              }`}
                            >
                              {slot.isActive
                                ? "ACTIVE"
                                : "OFF"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm font-semibold text-[#315C4C]">
                            {formatSlot(slot)}
                          </p>

                          <p className="mt-1 text-xs text-[#6B756F]">
                            {slot.isActive
                              ? "Visible to customers for new orders."
                              : "Hidden from new orders."}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openEditSlot(slot)
                            }
                            aria-label={`Edit ${slot.label}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#315C4C]"
                          >
                            <Icon name="edit" size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSlot(slot)
                            }
                            aria-label={`Delete ${slot.label}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F0D7D7] bg-white text-[#B75D63]"
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[#E5DED2]/70 pt-3">
                        <span className="text-xs font-semibold text-[#6B756F]">
                          Customer availability
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            toggleSlot(slot)
                          }
                          aria-label={`${
                            slot.isActive
                              ? "Disable"
                              : "Enable"
                          } ${slot.label}`}
                          aria-pressed={slot.isActive}
                          className={`relative h-7 w-12 rounded-full transition ${
                            slot.isActive
                              ? "bg-[#315C4C]"
                              : "bg-[#D7D8D5]"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                              slot.isActive
                                ? "left-6"
                                : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-[20px] bg-[#FFF7E8] px-4 py-3">
                <p className="text-xs leading-5 text-[#6B756F]">
                  Disabled slots disappear from new
                  customer orders. Existing orders keep
                  their saved delivery-slot information.
                </p>
              </div>
            </section>

            {/* Overall rule summary */}
            <section className="mt-5 rounded-[28px] border border-[#E5DED2] bg-[#24483B] p-5 text-white shadow-[0_12px_35px_rgba(36,72,59,0.16)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D9E8DF]">
                Store overview
              </p>

              <h2 className="mt-1 text-xl font-extrabold">
                Current operating rules
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-white/70">
                    Minimum order
                  </span>

                  <strong>
                    Γé╣
                    {settings.minimumOrder.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-white/70">
                    Delivery charge
                  </span>

                  <strong>
                    Γé╣
                    {settings.deliveryCharge.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Active delivery slots
                  </span>

                  <strong>
                    {activeSlots.length}
                  </strong>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <AdminBottomNav />

      <SlotFormModal
        open={slotModalOpen}
        editingSlot={editingSlot}
        form={slotForm}
        saving={savingSlot}
        error={slotError}
        onChange={(changes) =>
          setSlotForm((current) => ({
            ...current,
            ...changes,
          }))
        }
        onClose={closeSlotModal}
        onSubmit={handleSlotSubmit}
      />
    </main>
  );
}
