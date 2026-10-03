"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Invalid login details."
        );
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="text-4xl">🥬</div>

          <h1 className="mt-3 text-2xl font-bold">
            VegItPTP Admin
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Sign in to manage your store.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="text-sm font-semibold"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
              className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-green-600"
              placeholder="Admin username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-green-600"
              placeholder="Admin password"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 py-3.5 font-bold text-white disabled:bg-gray-300"
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}