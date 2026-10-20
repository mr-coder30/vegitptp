
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export type Language = "en" | "te";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  isLanguageReady: boolean;
  hasSelectedLanguage: boolean;
};

const STORAGE_KEY = "vegitptp-language";

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguageState] =
    useState<Language>(() => {
      if (typeof window === "undefined") {
        return "en";
      }

      try {
        const savedLanguage =
          window.localStorage.getItem(STORAGE_KEY);

        return savedLanguage === "en" ||
          savedLanguage === "te"
          ? savedLanguage
          : "en";
      } catch {
        return "en";
      }
    });

  const [isLanguageReady, setIsLanguageReady] =
    useState(false);

  const [hasSelectedLanguage, setHasSelectedLanguage] =
    useState(() => {
      if (typeof window === "undefined") {
        return false;
      }

      try {
        const savedLanguage =
          window.localStorage.getItem(STORAGE_KEY);

        return savedLanguage === "en" ||
          savedLanguage === "te";
      } catch {
        return false;
      }
    });

  useEffect(() => {
    try {
      const savedLanguage =
        window.localStorage.getItem(STORAGE_KEY);

      if (
        savedLanguage === "en" ||
        savedLanguage === "te"
      ) {
        document.cookie = `${STORAGE_KEY}=${savedLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    } catch {
      // Continue with English if browser storage is unavailable.
    } finally {
      setIsLanguageReady(true);
    }
  }, []);

  useEffect(() => {
    const isOperationalPage =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/delivery" ||
      pathname.startsWith("/delivery/");

    document.documentElement.lang =
      isOperationalPage ? "en" : language;
  }, [language, pathname]);

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      setHasSelectedLanguage(true);

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          nextLanguage
        );
      } catch {
        // Keep the selection for the current session.
      }

      document.cookie = `${STORAGE_KEY}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isLanguageReady,
        hasSelectedLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used within LanguageProvider"
    );
  }

  return context;
}