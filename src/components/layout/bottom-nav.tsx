"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: "⌂",
  },
  {
    label: "Cart",
    href: "/cart",
    icon: "🛒",
  },
  {
    label: "Orders",
    href: "/orders",
    icon: "📦",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full min-w-20 flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                isActive
                  ? "text-green-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}