"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/lib/use-translations";

function HomeIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[21px] w-[21px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.7"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 10 8-6 8 6" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function OrdersIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[21px] w-[21px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.7"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 7 8-4 8 4v10l-8 4-8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M12 11v10" />
    </svg>
  );
}

function RewardsIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[21px] w-[21px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.7"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14v11H5z" />
      <path d="M12 8v11" />
      <path d="M5 11h14" />
      <path d="M12 8H9.5a2.5 2.5 0 1 1 2.5-2.5V8Z" />
      <path d="M12 8h2.5A2.5 2.5 0 1 0 12 5.5V8Z" />
    </svg>
  );
}

function ProfileIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[21px] w-[21px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.7"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.4 3.2-5 7-5s6.2 1.6 7 5" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  const navItems = [
    { label: t.navigation.home, href: "/", icon: HomeIcon },
    { label: t.navigation.orders, href: "/orders", icon: OrdersIcon },
    { label: t.navigation.rewards, href: "/rewards", icon: RewardsIcon },
    { label: t.navigation.profile, href: "/profile", icon: ProfileIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="market-card mx-auto flex h-[64px] max-w-md items-center justify-around rounded-[20px] bg-white/95 px-2 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-[58px] min-w-[70px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] transition active:scale-[0.95] ${
                isActive
                  ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                  : "text-[var(--tone-light)]"
              }`}
            >
              <Icon active={isActive} />

              <span
                className={`text-[10px] ${
                  isActive
                    ? "font-bold"
                    : "font-semibold"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}