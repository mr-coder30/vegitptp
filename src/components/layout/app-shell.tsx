"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./app-header";
import BottomNav from "./bottom-nav";
import NetworkStatus from "./network-status";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();

  /*
   * Admin and Delivery are completely separate
   * operational apps.
   *
   * They must never receive the customer header
   * or customer bottom navigation.
   */
  const isAdminPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isDeliveryPage =
    pathname === "/delivery" ||
    pathname.startsWith("/delivery/");

  /*
   * Focused customer pages don't use the normal
   * customer header/bottom navigation.
   */
  const isFocusedCustomerPage =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/help" ||
    pathname.startsWith("/help/") ||
    pathname === "/rewards" ||
    pathname.startsWith("/rewards/") ||
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/order-success" ||
    pathname.startsWith("/order-success/");

  /*
   * Admin and Delivery have their own shells.
   */
  if (isAdminPage || isDeliveryPage) {
    return <>{children}</>;
  }

  /*
   * Customer focused pages.
   */
  if (isFocusedCustomerPage) {
    return (
      <>
        <NetworkStatus />
        <main className="mx-auto min-h-screen max-w-5xl">
          {children}
        </main>
      </>
    );
  }

  /*
   * Normal customer pages.
   */
  return (
    <>
      <NetworkStatus />
      <AppHeader />

      <main className="mx-auto min-h-screen max-w-7xl pb-20">
        {children}
      </main>

      <BottomNav />
    </>
  );
}