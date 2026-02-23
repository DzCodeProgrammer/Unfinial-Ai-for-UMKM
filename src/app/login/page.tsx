"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { login, registerUser } from "@/lib/api";
import { setToken, setUserJson } from "@/lib/auth";

type Mode = "login" | "register";

function sanitizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    return mode === "login" ? "Masuk" : "Buat Akun";
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const emailSanitized = sanitizeEmail(email);
      if (mode === "register") {
        await registerUser({ name: name.trim(), email: emailSanitized, password });
      }

      const token = await login({ email: emailSanitized, password });
      setToken(token.access_token);
      setUserJson(JSON.stringify(token.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_500px_at_20%_0%,rgba(31,122,140,0.22),transparent_60%),radial-gradient(900px_500px_at_90%_20%,rgba(244,162,97,0.18),transparent_55%),linear-gradient(180deg,#fbf7ef,transparent_60%),linear-gradient(120deg,#f2efe6,#fbf7ef)] text-[color:var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 md:flex-row md:items-center md:gap-10">
        <div className="md:w-1/2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/80"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
            Unfinial AI
          </Link>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
            Keuangan UMKM, jadi jelas dalam 1 dashboard.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-black/70">
            Upload transaksi, dapat ringkasan, prediksi cash flow, dan rekomendasi
            penghematan. Chat dengan asisten berbasis data Anda.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-black/70">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
              <p>
                Ringkasan otomatis: revenue, expense, profit, margin, tren bulanan.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
              <p>
                Prediksi 3–12 bulan (linear/ARIMA) dan deteksi risiko defisit.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
              <p>
                Expense intelligence: biaya berulang dan rekomendasi penghematan.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 md:mt-0 md:w-1/2">
          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70 transition hover:bg-black hover:text-white"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Buat akun" : "Punya akun"}
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-3">
              {mode === "register" ? (
                <label className="grid gap-1 text-sm">
                  <span className="text-black/70">Nama</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none ring-[color:var(--accent)]/30 focus:ring-4"
                    placeholder="Nama usaha / nama Anda"
                    required
                  />
                </label>
              ) : null}

              <label className="grid gap-1 text-sm">
                <span className="text-black/70">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none ring-[color:var(--accent)]/30 focus:ring-4"
                  placeholder="email@domain.com"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-black/70">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none ring-[color:var(--accent)]/30 focus:ring-4"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar & masuk"}
              </button>

              <p className="text-xs text-black/60">
                Dengan masuk, Anda menyetujui penggunaan data transaksi hanya untuk
                analisis di dashboard Anda.
              </p>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-black/55">
            Backend API: {process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}
          </p>
        </div>
      </div>
    </div>
  );
}
