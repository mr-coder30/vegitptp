"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import {
  useLanguage,
  type Language,
} from "@/components/language/language-provider";
import { useTranslations } from "@/lib/use-translations";
import PushNotificationSettings from "@/components/customer/push-notification-settings";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
};

function ArrowLeftIcon() {
  return (
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
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.2 4h2.1l1.3 4-2 1.6a14.5 14.5 0 0 0 5.8 5.8l1.6-2 4 1.3v2.1c0 1.1-.9 2-2 2C11.4 20.8 3.2 12.6 3.2 2c0-1.1.9-2-2-2h2Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.5 7.5 4 7.5-4" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h16v10H4z" />
      <path d="M12 10v10" />
      <path d="M3 7h18v3H3z" />
      <path d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Z" />
      <path d="M12 7h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.9-1.9 1.3-1.9 2.7" />
      <path d="M12 16.7h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 4H5v16h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M8 12h10" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-28 rounded-lg bg-[var(--surface-warm)]" />

      <div className="mt-5 rounded-[30px] border border-[var(--border-default)] bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-[22px] bg-[var(--surface-warm)]" />

          <div className="flex-1">
            <div className="h-5 w-32 rounded bg-[var(--surface-warm)]" />
            <div className="mt-2 h-3 w-24 rounded bg-[var(--surface-warm)]" />
          </div>
        </div>
      </div>

      <div className="mt-5 h-28 rounded-[26px] bg-white" />
      <div className="mt-5 h-40 rounded-[26px] bg-white" />
    </div>
  );
}

function LanguageSelector({
  onChange,
}: {
  onChange: (language: Language) => void;
}) {
  const { language } = useLanguage();
  const t = useTranslations();

  return (
    <section className="mt-5 rounded-[24px] border border-[var(--border-default)] bg-white p-4 shadow-[0_10px_28px_rgba(37,51,43,0.05)]">
      <div className="mb-3">
        <p className="text-sm font-bold text-[var(--app-foreground)]">
          {t.profile.language}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {t.profile.languageDescription}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={language === "en"}
          onClick={() => onChange("en")}
          className={`min-h-11 rounded-[14px] border px-3 text-sm font-bold transition ${
            language === "en"
              ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
              : "border-[var(--border-default)] bg-white text-[var(--text-muted)]"
          }`}
        >
          {t.profile.english}
        </button>
        <button
          type="button"
          aria-pressed={language === "te"}
          onClick={() => onChange("te")}
          className={`min-h-11 rounded-[14px] border px-3 text-sm font-bold transition ${
            language === "te"
              ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
              : "border-[var(--border-default)] bg-white text-[var(--text-muted)]"
          }`}
        >
          {t.profile.telugu}
        </button>
      </div>
    </section>
  );
}

type MenuRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: "green" | "pink" | "neutral";
};

function MenuRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
  disabled = false,
  accent = "green",
}: MenuRowProps) {
  const iconClass =
    accent === "pink"
      ? "bg-[var(--danger-soft)] text-[var(--danger-text)]"
      : accent === "neutral"
        ? "bg-[var(--surface-warm)] text-[var(--text-muted)]"
        : "bg-[var(--brand-soft)] text-[var(--brand-primary)]";

  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--app-foreground)]">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
          {subtitle}
        </p>
      </div>

      <ArrowRightIcon />
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-4 transition active:bg-[var(--surface-warm)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-[var(--surface-warm)] disabled:cursor-default"
    >
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const { clearCart } = useCart();
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(true);

  const [error, setError] =
    useState("");

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  const [saveSuccess, setSaveSuccess] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    landmark: "",
    locality: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/customer/me",
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (cancelled) return;

        if (response.status === 401) {
          setAuthenticated(false);
          setCustomer(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load profile.");
        }

        const loadedCustomer =
          data.customer as Customer;

        setAuthenticated(true);
        setCustomer(loadedCustomer);

        setForm({
          name: loadedCustomer.name ?? "",
          address:
            loadedCustomer.address ?? "",
          landmark:
            loadedCustomer.landmark ?? "",
          locality:
            loadedCustomer.locality ?? "",
        });
      } catch (error) {
        if (cancelled) return;

        console.error(
          "CUSTOMER_PROFILE_ERROR:",
          error
        );

        setError("loadError");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Profile is a focused page.
   * Its back button must ALWAYS return to Home,
   * regardless of the previous browser history.
   */
  function handleBack() {
    window.location.href = "/";
  }

  function handleLanguageChange(nextLanguage: Language) {
    if (nextLanguage === language) return;

    setError("");
    setSaveError("");
    setSaveSuccess(false);
    setLanguage(nextLanguage);
  }

  function startEditing() {
    if (!customer) return;

    setForm({
      name: customer.name ?? "",
      address: customer.address ?? "",
      landmark: customer.landmark ?? "",
      locality: customer.locality ?? "",
    });

    setSaveError("");
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEditing() {
    if (!customer) return;

    setForm({
      name: customer.name ?? "",
      address: customer.address ?? "",
      landmark: customer.landmark ?? "",
      locality: customer.locality ?? "",
    });

    setSaveError("");
    setSaveSuccess(false);
    setEditing(false);
  }

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProfile() {
    if (saving) return;

    const name = form.name.trim();
    const address = form.address.trim();
    const landmark =
      form.landmark.trim();
    const locality =
      form.locality.trim();

    if (name.length < 2) {
      setSaveError(
        t.profile.invalidName
      );
      return;
    }

    if (address.length < 5) {
      setSaveError(
        t.profile.invalidAddress
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await fetch(
        "/api/customer/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            address,
            landmark,
            locality,
          }),
        }
      );

      const data =
        await response.json();

      if (response.status === 401) {
        setAuthenticated(false);
        setCustomer(null);
        setEditing(false);
        return;
      }

      if (!response.ok) {
        throw new Error(
          t.profile.updateError
        );
      }

      const updatedCustomer =
        data.customer as Customer;

      setCustomer(updatedCustomer);

      setForm({
        name:
          updatedCustomer.name ?? "",
        address:
          updatedCustomer.address ?? "",
        landmark:
          updatedCustomer.landmark ?? "",
        locality:
          updatedCustomer.locality ?? "",
      });

      setSaveSuccess(true);

      setEditing(false);
    } catch (error) {
      console.error(
        "CUSTOMER_PROFILE_SAVE_ERROR:",
        error
      );

      setSaveError(
        t.profile.updateError
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      try {
        const registration =
          await navigator.serviceWorker.getRegistration("/");
        const subscription =
          await registration?.pushManager.getSubscription();

        if (subscription) {
          const response = await fetch(
            "/api/customer/push-subscriptions",
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                endpoint: subscription.endpoint,
              }),
            }
          );

          if (!response.ok) {
            console.error(
              "PUSH_SUBSCRIPTION_LOGOUT_CLEANUP_ERROR:",
              response.status
            );
          }

          await subscription.unsubscribe();
        }
      } catch (pushError) {
        console.error(
          "PUSH_SUBSCRIPTION_LOGOUT_CLEANUP_ERROR:",
          pushError
        );
      }

      const response = await fetch(
        "/api/customer/logout",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          t.profile.logoutError
        );
      }

      // Clear the cart only after logout succeeds.
      clearCart();

      window.location.href = "/";
    } catch (error) {
      console.error("CUSTOMER_LOGOUT_ERROR:", error);

      setError(
        t.profile.logoutError
      );

      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            aria-label={t.navigation.homeAria}
            className="mb-6 flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </Link>

          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            aria-label={t.navigation.homeAria}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </Link>

          <div className="mt-10 rounded-[30px] border border-[var(--border-default)] bg-white p-6 text-center shadow-[0_14px_36px_rgba(37,51,43,0.07)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
              <UserIcon />
            </div>

            <h1 className="mt-5 text-[22px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
              {t.profile.title}
            </h1>

            <p className="mt-1 text-[13px] font-medium text-[var(--brand-primary)]">
              {t.profile.title}
            </p>

            <p className="mx-auto mt-4 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
              {t.profile.loginPrompt}
            </p>

            <Link
              href="/login"
              className="mt-6 flex h-12 items-center justify-center rounded-[17px] bg-[var(--brand-primary)] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(40,90,67,0.18)] active:scale-[0.98]"
            >
              {t.profile.signIn}
            </Link>
          </div>
          <LanguageSelector onChange={handleLanguageChange} />
        </div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            aria-label={t.navigation.homeAria}
            className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)]"
          >
            <ArrowLeftIcon />
          </Link>

          <div className="mt-10 rounded-[30px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6 text-center">
            <h1 className="text-[19px] font-bold text-[var(--app-foreground)]">
              {t.profile.loadTitle}
            </h1>

            <p className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">
              {t.profile.loadError}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-[16px] bg-[var(--brand-primary)] px-5 py-3 text-[13px] font-bold text-white"
            >
              {t.common.tryAgain}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const firstName =
    customer.name
      .trim()
      .split(/\s+/)[0] ||
    t.profile.customer;

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
      <div className="mx-auto max-w-3xl">
        {/* Focused page header */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={t.navigation.homeAria}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)] transition active:scale-[0.95]"
          >
            <ArrowLeftIcon />
          </Link>

          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
              {t.profile.title}
            </h1>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 rounded-[18px] border border-[var(--brand-border)] bg-[var(--brand-soft)] px-4 py-3 text-[12px] font-semibold text-[var(--brand-primary)]">
            {t.profile.saveSuccess}
          </div>
        )}

        <LanguageSelector onChange={handleLanguageChange} />
        <PushNotificationSettings />

        {/* Edit profile */}
        {editing ? (
          <section className="mt-5 rounded-[30px] border border-[var(--brand-border)] bg-white p-5 shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
            <div>
              <p className="text-[18px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
                {t.profile.editTitle}
              </p>
            </div>

            {saveError && (
              <div className="mt-4 rounded-[17px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3.5 py-3 text-[12px] font-semibold leading-5 text-[var(--app-foreground)]">
                {saveError}
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="profile-name"
                className="text-[11px] font-bold text-[var(--app-foreground)]"
              >
                {t.profile.name}
              </label>

              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
                maxLength={80}
                autoComplete="name"
                className="mt-2 h-12 w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 text-[13px] font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-placeholder)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-border)]"
                placeholder={t.checkout.yourName}
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="profile-phone"
                className="text-[11px] font-bold text-[var(--app-foreground)]"
              >
                {t.profile.phone}
              </label>

              <div className="mt-2 flex h-12 items-center gap-3 rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-warm)] px-4">
                <PhoneIcon />

                <input
                  id="profile-phone"
                  type="tel"
                  value={customer.phone}
                  disabled
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[var(--text-muted)] outline-none"
                />

                <span className="text-[9px] font-bold text-[var(--tone-placeholder)]">
                  {t.profile.otpVerified}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="profile-address"
                className="text-[11px] font-bold text-[var(--app-foreground)]"
              >
                {t.profile.address}
              </label>

              <textarea
                id="profile-address"
                value={form.address}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value
                  )
                }
                maxLength={300}
                rows={3}
                autoComplete="street-address"
                className="mt-2 w-full resize-none rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 py-3 text-[13px] font-medium leading-5 text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-placeholder)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-border)]"
                placeholder={t.profile.addressPlaceholder}
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="profile-landmark"
                className="text-[11px] font-bold text-[var(--app-foreground)]"
              >
                {t.profile.landmark}
                <span className="ml-1 font-medium text-[var(--tone-placeholder)]">
                  {t.common.optional}
                </span>
              </label>

              <input
                id="profile-landmark"
                type="text"
                value={form.landmark}
                onChange={(event) =>
                  updateField(
                    "landmark",
                    event.target.value
                  )
                }
                maxLength={120}
                className="mt-2 h-12 w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 text-[13px] font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-placeholder)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-border)]"
                placeholder={t.profile.landmarkPlaceholder}
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="profile-locality"
                className="text-[11px] font-bold text-[var(--app-foreground)]"
              >
                {t.profile.locality}
                <span className="ml-1 font-medium text-[var(--tone-placeholder)]">
                  {t.common.optional}
                </span>
              </label>

              <input
                id="profile-locality"
                type="text"
                value={form.locality}
                onChange={(event) =>
                  updateField(
                    "locality",
                    event.target.value
                  )
                }
                maxLength={120}
                className="mt-2 h-12 w-full rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-soft)] px-4 text-[13px] font-medium text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--tone-placeholder)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-border)]"
                placeholder={t.profile.localityPlaceholder}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="h-12 rounded-[17px] border border-[var(--border-default)] bg-[var(--surface-warm)] text-[13px] font-bold text-[var(--text-muted)] transition active:scale-[0.98] disabled:opacity-50"
              >
                {t.common.cancel}
              </button>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="h-12 rounded-[17px] bg-[var(--brand-primary)] text-[13px] font-bold text-white shadow-[0_10px_22px_rgba(40,90,67,0.16)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? t.common.saving
                  : t.common.saveChanges}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Profile identity */}
            <section className="mt-5 rounded-[30px] border border-[var(--brand-border)] bg-white p-5 shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[var(--brand-primary)] text-[22px] font-bold text-white">
                  {firstName
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[21px] font-bold tracking-[-0.025em] text-[var(--app-foreground)]">
                    {customer.name ||
                      t.profile.customer}
                  </p>

                  <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)]">
                    <PhoneIcon />

                    <span>
                      {customer.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-[19px] bg-[var(--brand-soft)] px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tone-light)]">
                    {t.profile.customer}
                  </p>

                  <p className="mt-0.5 text-[12px] font-bold text-[var(--brand-primary)]">
                    {t.profile.member}
                  </p>
                </div>

                <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
              </div>
            </section>

            {/* Address */}
            <section className="mt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
                    {t.profile.address}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startEditing}
                  className="flex h-9 items-center gap-1.5 rounded-[12px] bg-[var(--brand-soft)] px-3 text-[10px] font-bold text-[var(--brand-primary)] transition active:scale-[0.96]"
                >
                  <EditIcon />
                  {t.common.edit}
                </button>
              </div>

              <div className="rounded-[26px] border border-[var(--border-default)] bg-white p-4 shadow-[0_12px_30px_rgba(37,51,43,0.055)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                    <LocationIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tone-light)]">
                      {t.profile.savedAddress}
                    </p>

                    <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[var(--app-foreground)]">
                      {customer.address ||
                        t.profile.noAddress}
                    </p>

                    {customer.landmark && (
                      <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                        {t.profile.landmark}:{" "}
                        {customer.landmark}
                      </p>
                    )}

                    {customer.locality && (
                      <p className="mt-1 text-[11px] font-medium text-[var(--brand-primary)]">
                        {customer.locality}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="mt-6">
              <div className="mb-3">
                <p className="text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
                  {t.profile.account}
                </p>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-[var(--border-default)] bg-white shadow-[0_12px_30px_rgba(37,51,43,0.055)]">
                <MenuRow
                  href="/orders"
                  icon={<PackageIcon />}
                  title={t.profile.orders}
                  subtitle={t.profile.ordersDescription}
                />

                <div className="mx-4 h-px bg-[var(--border-default)]" />

                <MenuRow
                  href="/rewards"
                  icon={<GiftIcon />}
                  title={t.profile.rewards}
                  subtitle={t.rewards.comingTitle}
                  accent="pink"
                />

                <div className="mx-4 h-px bg-[var(--border-default)]" />

                <MenuRow
                  href="/help"
                  icon={<HelpIcon />}
                  title={t.help.title}
                  subtitle={t.help.introDescription}
                  accent="neutral"
                />
              </div>
            </section>

            {/* Sign out */}
            <section className="mt-6">
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--danger-border)] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(37,51,43,0.04)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--danger-soft)] text-[var(--danger-text)]">
                  <LogoutIcon />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[var(--danger-text)]">
                    {loggingOut
                      ? t.profile.signingOut
                      : t.profile.signOut}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                    {t.profile.signOutDescription}
                  </p>
                </div>

                {!loggingOut && (
                  <ArrowRightIcon />
                )}
              </button>
            </section>
          </>
        )}

        <p className="mt-7 pb-2 text-center text-[10px] font-medium text-[var(--tone-light)]">
          VegItPTP ┬╖ {t.navigation.tagline}
        </p>
      </div>
    </main>
  );
}
