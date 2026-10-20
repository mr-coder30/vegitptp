
"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";
import { useTranslations } from "@/lib/use-translations";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type LanguageGateProps = {
  children: ReactNode;
};

const INSTALL_DISMISSED_KEY = "vegitptp-install-onboarding-dismissed";

function isRunningAsInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function LeafIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 4C11 4 5 7 5 13a6 6 0 0 0 6 6c6 0 9-8 9-15Z" />
      <path d="M4 21c3-6 7-9 12-12" />
    </svg>
  );
}

function ArrowIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function LanguageGate({
  children,
}: LanguageGateProps) {
  const pathname = usePathname();

  const {
    language,
    setLanguage,
    isLanguageReady,
    hasSelectedLanguage,
  } = useLanguage();
  const t = useTranslations();
  const [showInstallStep, setShowInstallStep] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      isRunningAsInstalledApp()
  );
  const [installError, setInstallError] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallStep(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const continueInBrowser = () => {
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    } catch {
      // The choice still applies for this visit if browser storage is unavailable.
    }
    setShowInstallStep(false);
  };

  const handleInstall = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        continueInBrowser();
      }
    } catch {
      setInstallError(true);
    }
  };

  const handleLanguageSelection = (nextLanguage: "en" | "te") => {
    setLanguage(nextLanguage);

    let installWasDismissed = false;
    try {
      installWasDismissed =
        window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
    } catch {
      // Show the optional install choice for this visit when storage is unavailable.
    }

    if (!installWasDismissed && !isRunningAsInstalledApp()) {
      setShowInstallStep(true);
    }
  };

  // Admin and Delivery remain independent applications.
  const isAdminPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isDeliveryPage =
    pathname === "/delivery" ||
    pathname.startsWith("/delivery/");

  if (isAdminPage || isDeliveryPage) {
    return <>{children}</>;
  }

  // Prevent the Home page flashing before saved
  // language preferences have been loaded.
  if (!isLanguageReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--app-background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--brand-primary)] text-white">
            <LeafIcon />
          </div>
          <p className="text-sm font-semibold text-[var(--brand-primary)]">
            VegItPTP
          </p>
        </div>
      </main>
    );
  }

  // Show the welcome screen only until the visitor
  // chooses a language for the first time.
  if (!hasSelectedLanguage) {
    return (
      <main className="flex min-h-screen flex-col overflow-hidden bg-[var(--app-background)] text-[var(--app-foreground)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-10">
          <header className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[var(--brand-primary)] text-white shadow-[0_8px_20px_rgba(40,90,67,0.16)]">
              <LeafIcon />
            </div>

            <div>
              <p className="text-[21px] font-extrabold tracking-[-0.05em]">
                VegItPTP
              </p>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--text-muted)]">
                FRESH VEGETABLES · PITHAPURAM
              </p>
            </div>
          </header>

          <section className="my-auto py-12">
            <div className="relative mb-8 overflow-hidden rounded-[30px] border border-[var(--brand-border)] bg-[var(--brand-soft)] px-5 py-7">
              <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border border-[var(--brand-border)]" />
              <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full border border-[var(--brand-border)]" />

              <div className="relative">
                <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--brand-primary)]">
                  మన పిఠాపురం కోసం
                </span>

                <h1 className="mt-5 text-[34px] font-extrabold leading-[1.12] tracking-[-0.05em]">
                  Freshness for
                  <br />
                  your everyday.
                </h1>

                <p className="mt-3 max-w-[270px] text-sm leading-6 text-[var(--text-muted)]">
                  Fresh vegetables for your home,
                  delivered with care in Pithapuram.
                </p>

                <p className="mt-4 text-sm font-semibold leading-6 text-[var(--brand-primary)]">
                  మీ ఇంటికి తాజా కూరగాయలు,
                  <br />
                  మీ సౌకర్యానికి అనుగుణంగా.
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--tone-light)]">
                GET STARTED
              </p>

              <h2 className="mt-2 text-[25px] font-bold tracking-[-0.04em]">
                Choose your language
              </h2>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                మీ భాషను ఎంచుకోండి
              </p>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => handleLanguageSelection("en")}
                  className="group flex min-h-[76px] items-center gap-4 rounded-[22px] border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-5 text-left text-white shadow-[0_12px_26px_rgba(40,90,67,0.16)] transition active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/15 text-lg font-bold">
                    A
                  </span>

                  <span className="flex-1">
                    <span className="block text-[16px] font-bold">
                      English
                    </span>
                    <span className="mt-1 block text-[11px] text-white/75">
                      Continue in English
                    </span>
                  </span>

                  <ArrowIcon />
                </button>

                <button
                  type="button"
                  onClick={() => handleLanguageSelection("te")}
                  className="group flex min-h-[76px] items-center gap-4 rounded-[22px] border border-[var(--border-default)] bg-white px-5 text-left shadow-[0_8px_22px_rgba(37,51,43,0.04)] transition active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--danger-soft)] text-[17px] font-bold text-[var(--brand-primary)]">
                    అ
                  </span>

                  <span className="flex-1">
                    <span className="block text-[16px] font-bold text-[var(--app-foreground)]">
                      తెలుగు
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                      తెలుగులో కొనసాగించండి
                    </span>
                  </span>

                  <span className="text-[var(--brand-primary)]">
                    <ArrowIcon />
                  </span>
                </button>
              </div>
            </div>
          </section>

          <footer className="mt-auto pt-6 text-center">
            <p className="text-[11px] font-medium text-[var(--tone-light)]">
              Fresh vegetables. Local care.
            </p>
            <p className="mt-1 text-[10px] text-[var(--tone-light)]">
              మన పిఠాపురం కోసం
            </p>
          </footer>
        </div>
      </main>
    );
  }

  if (showInstallStep && hasSelectedLanguage && !isInstalled) {
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const installText = t.install;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-background)] px-6 py-10 text-[var(--app-foreground)]">
        <section className="w-full max-w-md rounded-[28px] border border-[var(--brand-border)] bg-white p-6 shadow-[0_12px_32px_rgba(37,51,43,0.08)]">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            <LeafIcon />
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em]">
            {installText.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {installText.description}
          </p>

          <p className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4 text-sm leading-6">
            {isIos
              ? installText.iosInstructions
              : installText.browserInstructions}
          </p>

          {installError && (
            <p role="alert" className="mt-3 text-sm text-[var(--danger-text)]">
              {installText.installError}
            </p>
          )}

          <div className="mt-6 grid gap-3">
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                className="min-h-12 rounded-2xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                {installText.install}
              </button>
            )}
            <button
              type="button"
              onClick={continueInBrowser}
              className="min-h-12 rounded-2xl border border-[var(--border-default)] px-5 text-sm font-bold text-[var(--app-foreground)] transition active:scale-[0.98]"
            >
              {installText.continue}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // A language has been selected: show the existing app.
  // The selected language is available to all components
  // through useLanguage().
  return (
    <div lang={language === "te" ? "te" : "en"}>
      {children}
    </div>
  );
}