"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function DeliveryIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M14 16h2" />
    </svg>
  );
}

function EyeIcon({
  hidden,
}: {
  hidden: boolean;
}) {
  if (hidden) {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.7 4 10 8-0.5 1.4-1.3 2.7-2.4 3.8" />
        <path d="M6.1 6.1C4.6 7.2 3.5 8.6 2 12c1.3 4 5 8 10 8 1.4 0 2.7-.3 3.9-.8" />
      </svg>
    );
  }

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function DeliveryLoginPage() {
  const router = useRouter();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/delivery/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to login."
        );
      }

      router.replace("/delivery");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF7E8] px-4">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center py-8">
        <div className="w-full">
          {/* Brand */}
          <div className="mb-7 text-center">
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#315C4C] text-white shadow-[0_14px_30px_rgba(49,92,76,0.2)]">
              <DeliveryIcon />
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B756F]">
              VegItPTP
            </p>

            <h1 className="mt-1 text-[25px] font-extrabold tracking-[-0.02em] text-[#24332D]">
              Delivery
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#6B756F]">
              Sign in to manage today's deliveries
              and collections.
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-[30px] border border-[#E5DED2] bg-white p-5 shadow-[0_18px_45px_rgba(36,51,45,0.09)] sm:p-6">
            {error && (
              <div className="mb-5 rounded-2xl border border-[#F2A7B5] bg-[#F9D8DF] px-4 py-3">
                <p className="text-sm font-medium leading-5 text-[#8D4E61]">
                  {error}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Username */}
              <div>
                <label
                  htmlFor="delivery-username"
                  className="mb-2 block text-xs font-bold text-[#24332D]"
                >
                  Username
                </label>

                <input
                  id="delivery-username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  placeholder="Enter username"
                  className="h-13 w-full rounded-[18px] border border-[#E5DED2] bg-[#FFFDFC] px-4 text-sm font-medium text-[#24332D] outline-none transition placeholder:text-[#A2AAA5] focus:border-[#315C4C] focus:ring-4 focus:ring-[#EEF5F0]"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="delivery-password"
                  className="mb-2 block text-xs font-bold text-[#24332D]"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="delivery-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    required
                    placeholder="Enter password"
                    className="h-13 w-full rounded-[18px] border border-[#E5DED2] bg-[#FFFDFC] px-4 pr-12 text-sm font-medium text-[#24332D] outline-none transition placeholder:text-[#A2AAA5] focus:border-[#315C4C] focus:ring-4 focus:ring-[#EEF5F0]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#6B756F] hover:bg-[#EEF5F0] hover:text-[#315C4C]"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    <EyeIcon
                      hidden={
                        !showPassword
                      }
                    />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-[#315C4C] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(49,92,76,0.18)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowIcon />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-[11px] font-medium text-[#8B948F]">
              VegItPTP Delivery Operations
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}