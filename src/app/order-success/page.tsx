import { Suspense } from "react";
import OrderSuccessClient from "./order-success-client";

function LoadingOrder() {
  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          disabled
          className="h-10 w-24 animate-pulse rounded-[14px] bg-[var(--brand-border)]"
        />

        <div className="mt-6 overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-white p-6 shadow-[0_18px_50px_rgba(37,51,43,0.07)]">
          <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-[var(--brand-border)]" />

          <div className="mx-auto mt-6 h-8 w-48 animate-pulse rounded-xl bg-[var(--border-default)]" />

          <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded-lg bg-[var(--surface-warm)]" />

          <div className="mt-7 h-20 animate-pulse rounded-[22px] bg-[var(--surface-warm)]" />
        </div>

        <div className="mt-4 h-24 animate-pulse rounded-[28px] bg-white shadow-[0_14px_36px_rgba(37,51,43,0.06)]" />

        <div className="mt-4 h-48 animate-pulse rounded-[28px] bg-white shadow-[0_14px_36px_rgba(37,51,43,0.06)]" />
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<LoadingOrder />}>
      <OrderSuccessClient />
    </Suspense>
  );
}