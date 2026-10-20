"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/components/language/language-provider";
import { useTranslations } from "@/lib/use-translations";

function decodeApplicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = window.atob(
    padded.replace(/-/g, "+").replace(/_/g, "/")
  );

  return Uint8Array.from(decoded, (character) =>
    character.charCodeAt(0)
  );
}

export default function PushNotificationSettings() {
  const { language } = useLanguage();
  const t = useTranslations();
  const [supported, setSupported] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      const isSupported =
        window.isSecureContext &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!cancelled) {
        setSupported(isSupported);
        setPermissionDenied(
          isSupported && Notification.permission === "denied"
        );
      }

      if (!isSupported) {
        setChecking(false);
        return;
      }

      try {
        try {
          const configResponse = await fetch(
            "/api/customer/push-subscriptions",
            { cache: "no-store", credentials: "include" }
          );

          if (configResponse.ok) {
            const config = (await configResponse.json()) as {
              publicKey: string;
            };
            if (!cancelled) {
              setPublicKey(config.publicKey);
            }
          } else if (configResponse.status !== 503) {
            throw new Error("Unable to load push configuration.");
          }
        } catch (error) {
          console.error("PUSH_CONFIGURATION_CHECK_ERROR:", error);
        }

        const registration =
          await navigator.serviceWorker.getRegistration("/");
        const subscription =
          await registration?.pushManager.getSubscription();

        if (!cancelled) {
          setSubscribed(Boolean(subscription));
        }
      } catch (error) {
        console.error("PUSH_SUBSCRIPTION_CHECK_ERROR:", error);
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void checkSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supported || checking) {
      return;
    }

    async function updateSubscriptionLanguage() {
      try {
        const registration =
          await navigator.serviceWorker.getRegistration("/");
        const subscription =
          await registration?.pushManager.getSubscription();

        if (!subscription) {
          return;
        }

        const response = await fetch(
          "/api/customer/push-subscriptions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              ...subscription.toJSON(),
              language,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Unable to update notification language.");
        }
      } catch (error) {
        console.error("PUSH_LANGUAGE_UPDATE_ERROR:", error);
      }
    }

    void updateSubscriptionLanguage();
  }, [checking, language, supported]);

  async function enableNotifications() {
    setBusy(true);
    setFeedback("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPermissionDenied(permission === "denied");
        setFeedback(
          permission === "denied"
            ? t.profile.notificationsPermissionDenied
            : t.profile.notificationsEnableError
        );
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            decodeApplicationServerKey(publicKey),
        }));

      const saveResponse = await fetch(
        "/api/customer/push-subscriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...subscription.toJSON(),
            language,
          }),
        }
      );
      if (!saveResponse.ok) {
        await subscription.unsubscribe();
        throw new Error("Unable to save push subscription.");
      }

      setSubscribed(true);
      setFeedback(t.profile.notificationsEnabled);
    } catch (error) {
      console.error("PUSH_SUBSCRIPTION_ENABLE_ERROR:", error);
      setFeedback(t.profile.notificationsEnableError);
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setFeedback("");

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
          throw new Error("Unable to remove push subscription.");
        }
        await subscription.unsubscribe();
      }

      setSubscribed(false);
      setFeedback(t.profile.notificationsDisabled);
    } catch (error) {
      console.error("PUSH_SUBSCRIPTION_DISABLE_ERROR:", error);
      setFeedback(t.profile.notificationsDisableError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-[24px] border border-[var(--border-default)] bg-white p-4 shadow-[0_10px_28px_rgba(37,51,43,0.05)]">
      <h2 className="text-sm font-bold text-[var(--app-foreground)]">
        {t.profile.notificationsTitle}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {t.profile.notificationsDescription}
      </p>

      {checking ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {t.profile.notificationsChecking}
        </p>
      ) : supported ? (
        subscribed || publicKey ? (
          <button
            type="button"
            disabled={busy || (permissionDenied && !subscribed)}
            onClick={() =>
              void (subscribed
                ? disableNotifications()
                : enableNotifications())
            }
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[16px] bg-[var(--brand-primary)] px-4 text-[12px] font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? t.common.saving
              : subscribed
                ? t.profile.notificationsDisable
                : t.profile.notificationsEnable}
          </button>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            {t.profile.notificationsNotConfigured}
          </p>
        )
      ) : (
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          {t.profile.notificationsUnsupported}
        </p>
      )}

      {supported && permissionDenied && (
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          {t.profile.notificationsPermissionDenied}
        </p>
      )}

      {feedback && (
        <p role="status" className="mt-3 text-xs leading-5 text-[var(--brand-primary)]">
          {feedback}
        </p>
      )}
    </section>
  );
}
