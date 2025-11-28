"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        let message = "Invalid username or password.";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        setError(message);
        setLoading(false);
        return;
      }

      router.push("/credits");
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.9)]">
        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
            WOTC Portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Sign in
          </h1>
          <p className="text-xs text-slate-400">
            Enter the shared username and password to access your credits
            dashboard.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400"
            >
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-sky-500 bg-sky-500/20 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-400"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-slate-500">
          After successful login you&apos;ll be redirected to the{" "}
          <span className="font-mono text-slate-200">/credits</span>{" "}
          dashboard, and all other routes will be protected.
        </p>
      </div>
    </main>
  );
}

