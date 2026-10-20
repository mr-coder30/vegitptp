"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

type PaymentFilter = "ALL" | "CASH" | "QR";

type PaymentRecord = {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  amount: string;
  status: string;
  method: "CASH" | "QR";
  account: {
    id: string;
    name: string | null;
  } | null;
  collected: boolean;
  collectedAt: string | null;
  createdAt: string;
  deliverySlot: string;
};

type QrAccountTotal = {
  id: string | null;
  name: string;
  amount: number;
  orders: number;
};

type PaymentAccount = {
  id: string;
  name: string;
  qrImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

type UncollectedPayment = {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  amount: string;
  method: "CASH" | "QR";
  account: string | null;
  createdAt: string;
};

type PaymentsResponse = {
  success: boolean;
  filters: {
    date: string | null;
    method: string | null;
    accountId: string | null;
  };
  summary: {
    totalCollected: number;
    cashCollected: number;
    qrCollected: number;
    cashOrders: number;
    qrOrders: number;
    totalPayments: number;
    uncollectedAmount: number;
    uncollectedOrders: number;
  };
  qrAccountTotals: QrAccountTotal[];
  paymentAccounts: PaymentAccount[];
  payments: PaymentRecord[];
  uncollected: UncollectedPayment[];
};

type AccountForm = {
  name: string;
  qrImageUrl: string;
  isActive: boolean;
};

const EMPTY_ACCOUNT_FORM: AccountForm = {
  name: "",
  qrImageUrl: "",
  isActive: true,
};

function getToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")?.value;

  const month =
    parts.find((part) => part.type === "month")?.value;

  const day =
    parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "refresh"
    | "settings"
    | "orders"
    | "payments"
    | "customers"
    | "vegetables"
    | "cash"
    | "qr"
    | "plus"
    | "edit"
    | "trash"
    | "close"
    | "upload"
    | "check";
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
          <path d="m12 19-7-7 7-7" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.9-3L3 11" />
          <path d="M3 4v7h7" />
          <path d="M4 13a8 8 0 0 0 14.9 3L21 13" />
          <path d="M21 20v-7h-7" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" />
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

    case "cash":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6.5 9.5h.01M17.5 14.5h.01" />
        </svg>
      );

    case "qr":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" />
          <rect x="14" y="4" width="6" height="6" />
          <rect x="4" y="14" width="6" height="6" />
          <path d="M14 14h3v3h-3zM18 18h2v2h-2zM14 19h2" />
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
          <path d="M10 11v6M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "upload":
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    default:
      return null;
  }
}

function BottomNav() {
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
      active: true,
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
      <div className="mx-auto grid h-[72px] max-w-2xl grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
              item.active
                ? "text-[#315C4C]"
                : "text-[#8A928D]"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[13px] ${
                item.active ? "bg-[#EEF5F0]" : ""
              }`}
            >
              <Icon name={item.icon} size={20} />
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function CollectionCard({
  label,
  value,
  orders,
  icon,
}: {
  label: string;
  value: number;
  orders: number;
  icon: "cash" | "qr";
}) {
  return (
    <div className="rounded-[22px] border border-[#EEE8DE] bg-[#FAF8F3] p-4">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${
            icon === "cash"
              ? "bg-[#FFF3D8] text-[#8A641C]"
              : "bg-[#EEF5F0] text-[#315C4C]"
          }`}
        >
          <Icon name={icon} size={18} />
        </span>

        <span className="text-[10px] font-semibold text-[#8A928D]">
          {orders} {orders === 1 ? "order" : "orders"}
        </span>
      </div>

      <p className="mt-3 text-[11px] font-bold tracking-[0.08em] text-[#6B756F]">
        {label}
      </p>

      <p className="mt-1 text-xl font-extrabold text-[#315C4C]">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function AccountModal({
  open,
  editingAccount,
  form,
  saving,
  uploading,
  error,
  onChange,
  onClose,
  onSubmit,
  onUpload,
}: {
  open: boolean;
  editingAccount: PaymentAccount | null;
  form: AccountForm;
  saving: boolean;
  uploading: boolean;
  error: string;
  onChange: (changes: Partial<AccountForm>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpload: (file: File) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#24332D]/40 px-3 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-[#FFF7E8] p-5 shadow-2xl sm:rounded-[30px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B756F]">
              QR Payments
            </p>

            <h2 className="mt-1 text-xl font-extrabold">
              {editingAccount
                ? "Edit receiving account"
                : "Add receiving account"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5DED2] bg-white disabled:opacity-50"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="account-name"
              className="text-sm font-bold"
            >
              Account name
            </label>

            <input
              id="account-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                onChange({
                  name: event.target.value,
                })
              }
              placeholder="Example: Mukhesh UPI"
              className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-white px-4 text-sm outline-none focus:border-[#315C4C]"
              required
            />
          </div>

          <div>
            <p className="text-sm font-bold">
              QR code
            </p>

            <div className="mt-2 rounded-[22px] border border-dashed border-[#CFC7B9] bg-white p-4">
              {form.qrImageUrl ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-[18px] border border-[#E5DED2] bg-[#FFFDF8]">
                    <img
                      src={form.qrImageUrl}
                      alt="QR code preview"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <label className="mt-4 flex h-11 cursor-pointer items-center gap-2 rounded-[15px] border border-[#E5DED2] bg-[#FFFDF8] px-4 text-sm font-bold text-[#315C4C]">
                    <Icon name="upload" size={17} />
                    {uploading
                      ? "Uploading..."
                      : "Replace QR image"}

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading || saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          onUpload(file);
                        }

                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#EEF5F0] text-[#315C4C]">
                    <Icon name="qr" size={27} />
                  </span>

                  <p className="mt-4 text-sm font-extrabold">
                    Upload QR code
                  </p>

                  <p className="mt-1 text-xs text-[#6B756F]">
                    PNG, JPG or WEBP · Maximum 5 MB
                  </p>

                  <span className="mt-4 flex h-10 items-center gap-2 rounded-[14px] bg-[#315C4C] px-4 text-xs font-bold text-white">
                    <Icon name="upload" size={16} />
                    {uploading
                      ? "Uploading..."
                      : "Choose image"}
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploading || saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        onUpload(file);
                      }

                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <p className="mt-2 text-[11px] text-[#6B756F]">
              This QR code will be shown to the delivery boy
              when collecting a QR payment.
            </p>
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
              <p className="text-sm font-bold">
                Available for delivery boys
              </p>

              <p className="mt-1 text-xs text-[#6B756F]">
                {form.isActive
                  ? "This account can be selected for QR payments."
                  : "This account will be unavailable for new QR payments."}
              </p>
            </div>

            <span
              className={`relative h-7 w-12 rounded-full ${
                form.isActive
                  ? "bg-[#315C4C]"
                  : "bg-[#D7D8D5]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                  form.isActive ? "left-6" : "left-1"
                }`}
              />
            </span>
          </button>

          {error && (
            <div className="rounded-[17px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="h-12 rounded-[17px] border border-[#E5DED2] bg-white text-sm font-bold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                uploading ||
                !form.name.trim()
              }
              className="h-12 rounded-[17px] bg-[#315C4C] text-sm font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingAccount
                  ? "Save changes"
                  : "Add account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <div className="h-[230px] animate-pulse rounded-[28px] bg-white" />
      <div className="h-[180px] animate-pulse rounded-[28px] bg-white" />
      <div className="h-[330px] animate-pulse rounded-[28px] bg-white" />
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [date, setDate] = useState(getToday());
  const [method, setMethod] =
    useState<PaymentFilter>("ALL");
  const [accountId, setAccountId] = useState("ALL");

  const [data, setData] =
    useState<PaymentsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accountModalOpen, setAccountModalOpen] =
    useState(false);

  const [editingAccount, setEditingAccount] =
    useState<PaymentAccount | null>(null);

  const [accountForm, setAccountForm] =
    useState<AccountForm>(EMPTY_ACCOUNT_FORM);

  const [savingAccount, setSavingAccount] =
    useState(false);

  const [uploadingQr, setUploadingQr] =
    useState(false);

  const [accountError, setAccountError] =
    useState("");

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (date) {
        params.set("date", date);
      }

      if (method !== "ALL") {
        params.set("method", method);
      }

      if (accountId !== "ALL") {
        params.set("accountId", accountId);
      }

      const response = await fetch(
        `/api/admin/payments?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as PaymentsResponse & {
          error?: string;
          message?: string;
        };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to load payments."
        );
      }

      setData(result);
    } catch (error) {
      console.error(
        "ADMIN_PAYMENTS_UI_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load payment data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [date, method, accountId]);

  function openAddAccount() {
    setEditingAccount(null);
    setAccountForm({
      ...EMPTY_ACCOUNT_FORM,
    });
    setAccountError("");
    setAccountModalOpen(true);
  }

  function openEditAccount(
    account: PaymentAccount
  ) {
    setEditingAccount(account);

    setAccountForm({
      name: account.name,
      qrImageUrl: account.qrImageUrl ?? "",
      isActive: account.isActive,
    });

    setAccountError("");
    setAccountModalOpen(true);
  }

  function closeAccountModal() {
    if (savingAccount || uploadingQr) return;

    setAccountModalOpen(false);
    setEditingAccount(null);
    setAccountForm({
      ...EMPTY_ACCOUNT_FORM,
    });
    setAccountError("");
  }

  async function uploadQrImage(file: File) {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setAccountError(
        "Please select a PNG, JPG, or WEBP image."
      );
      return;
    }

    if (file.size <= 0) {
      setAccountError(
        "The selected image is empty."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAccountError(
        "QR image must be 5 MB or smaller."
      );
      return;
    }

    setUploadingQr(true);
    setAccountError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/payment-accounts/upload",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to upload QR image."
        );
      }

      if (
        typeof result.url !== "string" ||
        !result.url
      ) {
        throw new Error(
          "The server returned an invalid image URL."
        );
      }

      setAccountForm((current) => ({
        ...current,
        qrImageUrl: result.url,
      }));
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : "Unable to upload QR image."
      );
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleAccountSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingAccount(true);
    setAccountError("");

    const name = accountForm.name.trim();

    if (!name) {
      setAccountError(
        "Please enter an account name."
      );
      setSavingAccount(false);
      return;
    }

    if (!accountForm.qrImageUrl) {
      setAccountError(
        "Please upload a QR image."
      );
      setSavingAccount(false);
      return;
    }

    try {
      const editing = Boolean(editingAccount);

      const response = await fetch(
        "/api/admin/payment-accounts",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editing
              ? {
                  id: editingAccount?.id,
                  name,
                  qrImageUrl:
                    accountForm.qrImageUrl,
                  isActive:
                    accountForm.isActive,
                }
              : {
                  name,
                  qrImageUrl:
                    accountForm.qrImageUrl,
                  isActive:
                    accountForm.isActive,
                }
          ),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to save payment account."
        );
      }

      closeAccountModal();
      await loadPayments();
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : "Unable to save payment account."
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function toggleAccount(
    account: PaymentAccount
  ) {
    try {
      setError("");

      const response = await fetch(
        "/api/admin/payment-accounts",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: account.id,
            isActive: !account.isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to update payment account."
        );
      }

      await loadPayments();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update payment account."
      );
    }
  }

  async function deleteAccount(
    account: PaymentAccount
  ) {
    const confirmed = window.confirm(
      `Delete "${account.name}"?\n\nIf historical orders use this account, it cannot be deleted. Disable it instead.`
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `/api/admin/payment-accounts?id=${encodeURIComponent(
          account.id
        )}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to delete payment account."
        );
      }

      if (accountId === account.id) {
        setAccountId("ALL");
      }

      await loadPayments();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete payment account."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[88px] text-[#24332D]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#24332D] shadow-sm active:scale-95"
            >
              <Icon name="back" size={20} />
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                VegItPTP Admin
              </p>

              <h1 className="text-[22px] font-extrabold tracking-tight">
                Payments
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadPayments}
              disabled={loading}
              aria-label="Refresh payments"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#315C4C] shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Icon name="refresh" size={19} />
            </button>

            <Link
              href="/admin/settings"
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5DED2] bg-white text-[#315C4C] shadow-sm active:scale-95"
            >
              <Icon name="settings" size={19} />
            </Link>
          </div>
        </header>

        {/* Intro */}
        <section className="rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#6B756F]">
            Collection overview
          </p>

          <h2 className="mt-1 text-[25px] font-extrabold tracking-tight text-[#24483B]">
            Payment activity
          </h2>

          <p className="mt-1 text-sm text-[#6B756F]">
            Track collected money and manage QR
            receiving accounts.
          </p>
        </section>

        {/* Filters */}
        <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
          <label
            htmlFor="payment-date"
            className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]"
          >
            Collection date
          </label>

          <input
            id="payment-date"
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-[#FFFDF8] px-4 text-sm font-semibold outline-none focus:border-[#315C4C]"
          />

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
            Payment method
          </p>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["ALL", "All"],
                ["CASH", "CASH"],
                ["QR", "QR"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);

                  if (value === "CASH") {
                    setAccountId("ALL");
                  }
                }}
                className={`rounded-[16px] px-3 py-3 text-sm font-bold ${
                  method === value
                    ? "bg-[#315C4C] text-white shadow-[0_7px_18px_rgba(49,92,76,0.18)]"
                    : "border border-[#E5DED2] bg-[#FFFDF8] text-[#6B756F]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {(method === "ALL" || method === "QR") &&
            data &&
            data.paymentAccounts.length > 0 && (
              <div className="mt-4">
                <label
                  htmlFor="payment-account"
                  className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]"
                >
                  QR account
                </label>

                <select
                  id="payment-account"
                  value={accountId}
                  onChange={(event) =>
                    setAccountId(event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-[17px] border border-[#E5DED2] bg-[#FFFDF8] px-4 text-sm font-semibold outline-none focus:border-[#315C4C]"
                >
                  <option value="ALL">
                    All QR accounts
                  </option>

                  {data.paymentAccounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name}
                      {!account.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </section>

        {loading ? (
          <PaymentsSkeleton />
        ) : error ? (
          <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#9B5252]">
              {error}
            </p>

            <button
              type="button"
              onClick={loadPayments}
              className="mt-4 rounded-[17px] bg-[#315C4C] px-5 py-3 text-sm font-bold text-white"
            >
              Try again
            </button>
          </section>
        ) : data ? (
          <>
            {/* Collection summary */}
            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_12px_38px_rgba(36,51,45,0.07)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                    Total collected
                  </p>

                  <p className="mt-2 text-[30px] font-extrabold tracking-tight text-[#24483B]">
                    {formatMoney(
                      data.summary.totalCollected
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#6B756F]">
                    {data.summary.totalPayments}{" "}
                    collected{" "}
                    {data.summary.totalPayments === 1
                      ? "payment"
                      : "payments"}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#EEF5F0] text-[#315C4C]">
                  <Icon name="payments" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <CollectionCard
                  label="CASH"
                  value={
                    data.summary.cashCollected
                  }
                  orders={data.summary.cashOrders}
                  icon="cash"
                />

                <CollectionCard
                  label="QR"
                  value={
                    data.summary.qrCollected
                  }
                  orders={data.summary.qrOrders}
                  icon="qr"
                />
              </div>
            </section>

            {/* QR account totals */}
            {data.qrAccountTotals.length > 0 && (
              <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                  QR collection
                </p>

                <h3 className="mt-1 text-lg font-extrabold text-[#24483B]">
                  By receiving account
                </h3>

                <div className="mt-4 space-y-2">
                  {data.qrAccountTotals.map(
                    (account) => (
                      <div
                        key={
                          account.id ??
                          account.name
                        }
                        className="flex items-center justify-between gap-3 rounded-[20px] bg-[#F8F6F0] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {account.name}
                          </p>

                          <p className="mt-0.5 text-xs text-[#6B756F]">
                            {account.orders}{" "}
                            {account.orders === 1
                              ? "payment"
                              : "payments"}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-extrabold text-[#315C4C]">
                          {formatMoney(
                            account.amount
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* QR receiving accounts */}
            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                    Receiving accounts
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-[#24483B]">
                    QR payment accounts
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#6B756F]">
                    These accounts are available to
                    delivery boys when collecting QR
                    payments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddAccount}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[17px] bg-[#315C4C] px-4 text-sm font-bold text-white active:scale-95"
                >
                  <Icon name="plus" size={17} />
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {data.paymentAccounts.length ===
                0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#D9D2C6] bg-[#FFFDF8] px-5 py-8 text-center">
                    <p className="text-sm font-bold">
                      No QR accounts
                    </p>

                    <p className="mt-1 text-xs text-[#6B756F]">
                      Add a receiving account before
                      accepting QR payments.
                    </p>
                  </div>
                ) : (
                  data.paymentAccounts.map(
                    (account) => (
                      <div
                        key={account.id}
                        className={`rounded-[22px] border p-4 ${
                          account.isActive
                            ? "border-[#D4E3D9] bg-[#F7FBF8]"
                            : "border-[#E5DED2] bg-[#FAF9F6]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C]">
                            {account.qrImageUrl ? (
                              <img
                                src={
                                  account.qrImageUrl
                                }
                                alt={`${account.name} QR`}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Icon
                                name="qr"
                                size={22}
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-extrabold">
                                {account.name}
                              </p>

                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                  account.isActive
                                    ? "bg-[#D9E8DF] text-[#315C4C]"
                                    : "bg-[#ECEAE5] text-[#77756F]"
                                }`}
                              >
                                {account.isActive
                                  ? "ACTIVE"
                                  : "OFF"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-[#6B756F]">
                              {account.isActive
                                ? "Available for QR collection"
                                : "Disabled for new QR collection"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#E5DED2]/70 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleAccount(
                                account
                              )
                            }
                            className="text-xs font-bold text-[#315C4C]"
                          >
                            {account.isActive
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditAccount(
                                  account
                                )
                              }
                              className="flex h-9 items-center gap-1.5 rounded-[13px] border border-[#E5DED2] bg-white px-3 text-xs font-bold text-[#315C4C]"
                            >
                              <Icon
                                name="edit"
                                size={15}
                              />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteAccount(
                                  account
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#F0D7D7] bg-white text-[#B75D63]"
                              aria-label={`Delete ${account.name}`}
                            >
                              <Icon
                                name="trash"
                                size={15}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </section>

            {/* Collected payments */}
            <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B756F]">
                    Transactions
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-[#24483B]">
                    Collected payments
                  </h3>
                </div>

                <span className="rounded-full bg-[#EEF5F0] px-3 py-1.5 text-[11px] font-bold text-[#315C4C]">
                  {data.payments.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {data.payments.length === 0 ? (
                  <div className="rounded-[22px] bg-[#F8F6F0] px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-[#6B756F]">
                      No collected payments
                    </p>

                    <p className="mt-1 text-xs text-[#8A928D]">
                      No payment records match the
                      selected filters.
                    </p>
                  </div>
                ) : (
                  data.payments.map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/admin/orders/${payment.id}`}
                      className="block rounded-[23px] border border-[#EEE9DF] p-4 active:scale-[0.995]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold">
                            {payment.orderNumber}
                          </p>

                          <p className="mt-1 truncate text-xs text-[#6B756F]">
                            {payment.customer.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-[#8A928D]">
                            {payment.customer.phone}
                          </p>
                        </div>

                        <p className="shrink-0 text-base font-extrabold text-[#315C4C]">
                          {formatMoney(
                            Number(payment.amount)
                          )}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-[11px] ${
                              payment.method ===
                              "CASH"
                                ? "bg-[#FFF3D8] text-[#8A641C]"
                                : "bg-[#EEF5F0] text-[#315C4C]"
                            }`}
                          >
                            <Icon
                              name={
                                payment.method ===
                                "CASH"
                                  ? "cash"
                                  : "qr"
                              }
                              size={16}
                            />
                          </span>

                          <div>
                            <p className="text-xs font-bold">
                              {payment.method}
                            </p>

                            {payment.method ===
                              "QR" &&
                              payment.account && (
                                <p className="mt-0.5 text-[11px] text-[#6B756F]">
                                  {
                                    payment.account
                                      .name
                                  }
                                </p>
                              )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] font-bold text-[#315C4C]">
                            Collected
                          </p>

                          <p className="mt-0.5 text-[11px] text-[#8A928D]">
                            {payment.collectedAt
                              ? formatTime(
                                  payment.collectedAt
                                )
                              : formatDate(
                                  payment.createdAt
                                )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[#F0ECE4] pt-3">
                        <span className="text-[11px] text-[#8A928D]">
                          {payment.deliverySlot}
                        </span>

                        <span className="text-[11px] font-bold text-[#315C4C]">
                          View order →
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* Uncollected */}
            {data.uncollected.length > 0 && (
              <section className="mt-4 rounded-[28px] border border-[#E5DED2] bg-white p-5 shadow-[0_10px_35px_rgba(36,51,45,0.06)]">
                <div className="rounded-[22px] bg-[#FFF3D8] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A641C]">
                    Attention
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-[#8A641C]">
                    Uncollected delivered orders
                  </h3>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-[#8A641C]">
                      {data.summary.uncollectedOrders}{" "}
                      {data.summary.uncollectedOrders ===
                      1
                        ? "order"
                        : "orders"}
                    </p>

                    <p className="text-sm font-extrabold text-[#8A641C]">
                      {formatMoney(
                        data.summary.uncollectedAmount
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {data.uncollected.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block rounded-[23px] border border-[#F0E2C3] bg-[#FFFDF8] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold">
                            {order.orderNumber}
                          </p>

                          <p className="mt-1 truncate text-xs text-[#6B756F]">
                            {order.customer.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-[#8A928D]">
                            {order.customer.phone}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-extrabold text-[#8A641C]">
                          {formatMoney(
                            Number(order.amount)
                          )}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="rounded-full bg-[#FFF3D8] px-2.5 py-1 text-[10px] font-bold text-[#8A641C]">
                          PAYMENT PENDING
                        </span>

                        <span className="text-[11px] font-bold text-[#8A641C]">
                          View order →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>

      <BottomNav />

      <AccountModal
        open={accountModalOpen}
        editingAccount={editingAccount}
        form={accountForm}
        saving={savingAccount}
        uploading={uploadingQr}
        error={accountError}
        onChange={(changes) =>
          setAccountForm((current) => ({
            ...current,
            ...changes,
          }))
        }
        onClose={closeAccountModal}
        onUpload={uploadQrImage}
        onSubmit={handleAccountSubmit}
      />
    </main>
  );
}