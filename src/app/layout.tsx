import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/layout/app-header";
import BottomNav from "@/components/layout/bottom-nav";
import { CartProvider } from "@/components/cart/cart-provider";

export const metadata: Metadata = {
  title: "VegitPTP",
  description: "Fresh vegetables delivered in Pithapuram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <CartProvider>
          <AppHeader />

          <main className="mx-auto min-h-screen max-w-2xl pb-20">
            {children}
          </main>

          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}