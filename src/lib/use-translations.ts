"use client";

import { useLanguage } from "@/components/language/language-provider";
import { translations } from "@/lib/translation-dictionary";

export function useTranslations() {
  const { language } = useLanguage();
  return translations[language];
}
