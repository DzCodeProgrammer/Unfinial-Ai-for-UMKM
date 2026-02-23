import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_500px_at_20%_0%,rgba(31,122,140,0.22),transparent_60%),radial-gradient(900px_500px_at_90%_20%,rgba(244,162,97,0.18),transparent_55%),linear-gradient(180deg,#fbf7ef,transparent_60%),linear-gradient(120deg,#f2efe6,#fbf7ef)] text-[color:var(--ink)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
            Unfinial AI
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:bg-black hover:text-white"
            >
              Masuk
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-black px-4 py-2 text-sm text-white transition hover:bg-black/90"
            >
              Buka Dashboard
            </Link>
          </div>
        </header>

        <main className="mt-14 grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Dari transaksi ke keputusan.
              <span className="block text-black/60">Tanpa ribet.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-black/70">
              Unfinial AI membantu UMKM memahami kondisi keuangan, memprediksi cash flow,
              dan menemukan kebocoran biaya secara otomatis dalam 1 dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90"
              >
                Mulai Sekarang
              </Link>
              <a
                href="http://127.0.0.1:8000/docs"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-medium text-black/80 backdrop-blur transition hover:bg-white/80"
              >
                Lihat API Docs
              </a>
            </div>

            <div className="mt-10 grid gap-3 text-sm text-black/70">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
                <p>Upload CSV/XLSX, atau input manual.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
                <p>Health score 0–100 untuk evaluasi cepat.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-black/25" />
                <p>Chat assistant dengan konteks data keuangan Anda.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-black/50">
                  Preview
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Dashboard Ringkas
                </h2>
                <p className="mt-2 text-sm text-black/65">
                  Contoh komponen yang akan Anda lihat setelah login.
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-[color:var(--accent)]/15 ring-1 ring-black/10" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs text-black/55">Revenue</p>
                <p className="mt-1 text-2xl font-semibold">Rp 18.500.000</p>
                <p className="mt-2 text-xs text-black/50">+12% MoM</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs text-black/55">Expense</p>
                <p className="mt-1 text-2xl font-semibold">Rp 11.200.000</p>
                <p className="mt-2 text-xs text-black/50">-4% MoM</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs text-black/55">Net Profit</p>
                <p className="mt-1 text-2xl font-semibold">Rp 7.300.000</p>
                <p className="mt-2 text-xs text-black/50">Margin 39%</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs text-black/55">Health Score</p>
                <p className="mt-1 text-2xl font-semibold">78/100</p>
                <p className="mt-2 text-xs text-black/50">Cukup sehat</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-[linear-gradient(135deg,rgba(31,122,140,0.10),rgba(244,162,97,0.10))] p-4">
              <p className="text-sm font-medium">Insight otomatis</p>
              <p className="mt-2 text-sm text-black/70">
                Biaya operasional meningkat 22% dalam 2 bulan terakhir.
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-16 border-t border-black/10 pt-8 text-xs text-black/55">
          <p>
            Unfinial AI MVP. Untuk development lokal, jalankan backend di port 8000 dan
            frontend di port 3000.
          </p>
        </footer>
      </div>
    </div>
  );
}
