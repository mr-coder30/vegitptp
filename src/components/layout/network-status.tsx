"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "@/lib/use-translations";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getIsOnline() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export default function NetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getIsOnline,
    getServerSnapshot
  );
  const t = useTranslations();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 border-b border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-center text-[var(--app-foreground)]"
    >
      <p className="text-sm font-bold">
        {t.errors.offlineTitle}
      </p>
      <p className="mt-0.5 text-xs leading-5">
        {t.errors.offlineDescription}
      </p>
    </div>
  );
}
