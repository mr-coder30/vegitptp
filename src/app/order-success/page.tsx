import { Suspense } from "react";
import OrderSuccessClient from "./order-success-client";

function LoadingOrder() {
  return (
    <main className="min-h-[80vh] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

          <p className="mt-4 text-sm text-gray-500">
            Loading your order...
          </p>
        </div>
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