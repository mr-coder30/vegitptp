"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminDashboard() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-600">
              VegItPTP Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage your vegetables, orders and store settings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/vegetables"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-2xl">🥬</div>
            <h2 className="mt-3 font-bold">Vegetables</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage catalog and prices
            </p>
          </Link>

          <Link
            href="/admin/orders"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-2xl">📦</div>
            <h2 className="mt-3 font-bold">Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              View and manage orders
            </p>
          </Link>

          <Link
            href="/admin/customers"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-2xl">👥</div>
            <h2 className="mt-3 font-bold">Customers</h2>
            <p className="mt-1 text-sm text-gray-500">
              View customer information
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-2xl">⚙️</div>
            <h2 className="mt-3 font-bold">Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage store settings
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}