
import type { Metadata } from "next";
import "./globals.css";

import AppShell from "@/components/layout/app-shell";
import { CartProvider } from "@/components/cart/cart-provider";
import { LanguageProvider } from "@/components/language/language-provider";
import LanguageGate from "@/components/language/language-gate";

export const metadata: Metadata = {
  title: "VegItPTP",
  description: "Fresh vegetables delivered in Pithapuram",
  icons: {
    icon: "/vegitptp-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--app-background)] text-[var(--app-foreground)]">
        <LanguageProvider>
          <CartProvider>
            <LanguageGate>
              <AppShell>{children}</AppShell>
            </LanguageGate>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
