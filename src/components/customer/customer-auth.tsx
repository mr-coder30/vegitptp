"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { formatTranslation } from "@/lib/translation-dictionary";
import { useTranslations } from "@/lib/use-translations";

type AuthStep = "PHONE" | "OTP";

type CustomerAuthProps = {
  onAuthenticated?: () => void | Promise<void>;
};

const DEFAULT_RESEND_SECONDS = 60;

export default function CustomerAuth({
  onAuthenticated,
}: CustomerAuthProps) {
  const t = useTranslations();
  const [step, setStep] = useState<AuthStep>("PHONE");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [resendSeconds, setResendSeconds] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  /*
   * Countdown
   */
  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

  /*
   * Focus OTP input when entering OTP step.
   */
  useEffect(() => {
    if (step !== "OTP") {
      return;
    }

    const timer = window.setTimeout(() => {
      otpInputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [step]);

  function getRetrySeconds(data: unknown): number {
    if (
      typeof data === "object" &&
      data !== null &&
      "retryAfterSeconds" in data
    ) {
      const value = (
        data as {
          retryAfterSeconds?: unknown;
        }
      ).retryAfterSeconds;

      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
      ) {
        return Math.ceil(value);
      }
    }

    return DEFAULT_RESEND_SECONDS;
  }

  async function requestOtp(cleanPhone: string) {
    let response: Response;
    try {
      response = await fetch(
        "/api/auth/send-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: cleanPhone,
          }),
        }
      );
    } catch {
      throw new Error(t.auth.sendOtpError);
    }

    let data: { resendAfterSeconds?: unknown } | null;
    try {
      data = await response.json();
    } catch {
      throw new Error(t.auth.sendOtpError);
    }

    if (!response.ok) {
      const requestError = new Error(
        response.status === 429
          ? t.auth.cooldown
          : response.status === 400
            ? t.auth.invalidPhone
            : response.status === 503
              ? t.auth.otpUnavailable
              : t.auth.sendOtpError
      );

      if (response.status === 429) {
        const retrySeconds =
          getRetrySeconds(data);

        setResendSeconds(retrySeconds);
      }

      throw requestError;
    }

    const serverCooldown =
      typeof data?.resendAfterSeconds === "number" &&
      data.resendAfterSeconds > 0
        ? Math.ceil(data.resendAfterSeconds)
        : DEFAULT_RESEND_SECONDS;

    setResendSeconds(serverCooldown);

    return data;
  }

  async function handleSendOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanPhone = phone.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError(t.auth.invalidPhone);
      return;
    }

    setLoading(true);

    try {
      await requestOtp(cleanPhone);

      setPhone(cleanPhone);
      setOtp("");
      setStep("OTP");

      setMessage(t.auth.otpSent);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t.auth.sendOtpError
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (loading || resendSeconds > 0) {
      return;
    }

    const cleanPhone = phone.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError(t.auth.invalidResendPhone);
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await requestOtp(cleanPhone);

      setOtp("");

      setMessage(t.auth.otpResent);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t.auth.sendOtpError
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError(t.auth.invalidOtp);
      return;
    }

    setLoading(true);

    try {
      let response: Response;
      try {
        response = await fetch(
          "/api/auth/verify-otp",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: cleanOtp,
            }),
          }
        );
      } catch {
        throw new Error(t.auth.verifyOtpError);
      }

      try {
        await response.json();
      } catch {
        throw new Error(t.auth.verifyOtpError);
      }

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? t.auth.cooldown
            : response.status === 400 ||
                response.status === 401
              ? t.auth.otpExpiredOrIncorrect
              : t.auth.verifyOtpError
        );
      }

      /*
       * The OTP has been successfully verified.
       *
       * The server has already created the
       * authenticated HttpOnly customer session.
       */
      setMessage(t.auth.loginSuccess);
      setOtp("");

      /*
       * Let the parent decide what happens next.
       *
       * /login uses this to navigate back into
       * the customer application.
       */
      if (onAuthenticated) {
        await onAuthenticated();
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t.auth.verifyOtpError
      );
    } finally {
      setLoading(false);
    }
  }

  function changeNumber() {
    setStep("PHONE");
    setOtp("");
    setError("");
    setMessage("");
    setResendSeconds(0);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      {step === "PHONE" ? (
        <form
          onSubmit={handleSendOtp}
          className="rounded-3xl border border-[var(--border-default)] bg-white p-6 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">
              VegItPTP
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[var(--app-foreground)]">
              {t.auth.enterMobile}
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {t.auth.sendOneTimePassword}
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="customer-phone"
              className="text-sm font-semibold text-[var(--app-foreground)]"
            >
              {t.auth.mobileNumber}
            </label>

            <div className="mt-2 flex overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--app-background)] focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-border)]">
              <div className="flex items-center border-r border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--app-foreground)]">
                +91
              </div>

              <input
                id="customer-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder={t.auth.tenDigitNumber}
                className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-[var(--tone-placeholder)]"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-text)]">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-sm font-medium text-[var(--brand-primary)]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="market-primary-action mt-6 w-full px-5 py-4 text-sm"
          >
            {loading
              ? t.auth.sendingOtp
              : t.auth.sendOtp}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleVerifyOtp}
          className="rounded-3xl border border-[var(--border-default)] bg-white p-6 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">
              VegItPTP
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[var(--app-foreground)]">
              {t.auth.verifyNumber}
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {t.auth.otpSentTo}
            </p>

            <p className="mt-1 font-semibold text-[var(--brand-primary)]">
              +91 {phone}
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="customer-otp"
              className="text-sm font-semibold text-[var(--app-foreground)]"
            >
              {t.auth.otp}
            </label>

            <input
              ref={otpInputRef}
              id="customer-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder={t.auth.enterOtp}
              className="mt-2 w-full rounded-2xl border border-[var(--border-default)] bg-[var(--app-background)] px-4 py-4 text-center text-xl font-bold tracking-[0.4em] text-[var(--app-foreground)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-border)] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--tone-placeholder)]"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-text)]">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-sm font-medium text-[var(--brand-primary)]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="market-primary-action mt-6 w-full px-5 py-4 text-sm"
          >
            {loading
              ? t.auth.verifying
              : t.auth.verifyOtp}
          </button>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={
                loading ||
                resendSeconds > 0
              }
              className="text-sm font-semibold text-[var(--brand-primary)] disabled:cursor-not-allowed disabled:text-[var(--tone-placeholder)]"
            >
              {resendSeconds > 0
                ? formatTranslation(t.auth.resendIn, {
                    seconds: resendSeconds,
                  })
                : t.auth.resendOtp}
            </button>

            <button
              type="button"
              onClick={changeNumber}
              disabled={loading}
              className="text-sm font-semibold text-[var(--text-muted)] disabled:opacity-50"
            >
              {t.auth.changeNumber}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}