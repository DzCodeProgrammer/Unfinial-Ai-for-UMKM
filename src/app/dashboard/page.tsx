"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MiniLineChart } from "@/components/MiniLineChart";
import {
  createTransaction,
  financeChat,
  getExpenseIntelligence,
  getHealthScore,
  getPrediction,
  getSummary,
  listTransactions,
  uploadTransactionsFile,
} from "@/lib/api";
import { clearToken, getToken, getUserJson } from "@/lib/auth";
import { formatIdr, formatPct, safeDateLabel } from "@/lib/format";
import type {
  ExpenseIntelligenceResponse,
  HealthScoreResponse,
  PredictionResponse,
  SummaryResponse,
  TransactionRead,
  UserRead,
} from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

function safeParseUser(raw: string | null): UserRead | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRead;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserRead | null>(null);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [health, setHealth] = useState<HealthScoreResponse | null>(null);
  const [expense, setExpense] = useState<ExpenseIntelligenceResponse | null>(null);
  const [prediction, setPredictionState] = useState<PredictionResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionRead[]>([]);

  const [predMonths, setPredMonths] = useState(6);
  const [predModel, setPredModel] = useState<"linear" | "arima">("linear");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya Unfinial AI. Tanyakan kondisi keuangan, prediksi cash flow, atau rekomendasi penghematan.",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const trendPoints = useMemo(() => {
    const points = summary?.monthly_trend || [];
    return points.map((p) => ({ x: safeDateLabel(p.month), y: p.net_cash_flow }));
  }, [summary]);

  const predPoints = useMemo(() => {
    const points = prediction?.points || [];
    return points.map((p) => ({ x: safeDateLabel(p.month), y: p.predicted_cash_flow }));
  }, [prediction]);

  async function loadAll(t: string) {
    setError(null);
    setBusy(true);
    try {
      const [s, h, e, p, txs] = await Promise.all([
        getSummary(t),
        getHealthScore(t),
        getExpenseIntelligence(t),
        getPrediction({ token: t, months: predMonths, model: predModel }),
        listTransactions({ token: t, limit: 50 }),
      ]);
      setSummary(s);
      setHealth(h);
      setExpense(e);
      setPredictionState(p);
      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setTokenState(t);
    setUser(safeParseUser(getUserJson()));
    void loadAll(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadAll(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predMonths, predModel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatBusy]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  async function onAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setToast(null);
    setError(null);

    try {
      setBusy(true);
      await createTransaction({
        token,
        type: txType,
        category: txCategory.trim(),
        amount: Number(txAmount),
        date: txDate,
      });
      setTxCategory("");
      setTxAmount(0);
      setToast("Transaksi berhasil ditambahkan.");
      await loadAll(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan transaksi.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !uploadFile) return;
    setToast(null);
    setError(null);

    try {
      setBusy(true);
      const res = await uploadTransactionsFile({ token, file: uploadFile });
      setToast(res.message);
      setUploadFile(null);
      await loadAll(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload transaksi.");
    } finally {
      setBusy(false);
    }
  }

  async function onSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const q = chatInput.trim();
    if (!q) return;

    setChatInput("");
    setChatBusy(true);
    setChatMessages((m) => [...m, { role: "user", content: q }]);

    try {
      const res = await financeChat({ token, question: q });
      setChatMessages((m) => [...m, { role: "assistant", content: res.answer }]);
    } catch (err) {
      setChatMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `Maaf, terjadi error: ${err.message}`
              : "Maaf, terjadi error saat memproses pertanyaan.",
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_0%,rgba(31,122,140,0.18),transparent_60%),radial-gradient(1100px_600px_at_95%_18%,rgba(244,162,97,0.14),transparent_55%),linear-gradient(180deg,#fbf7ef,transparent_65%),linear-gradient(120deg,#f2efe6,#fbf7ef)] text-[color:var(--ink)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/80"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
              Unfinial AI
            </Link>
            <div className="text-sm text-black/60">
              {user ? (
                <span>
                  {user.name} | <span className="font-mono text-xs">{user.email}</span>
                </span>
              ) : (
                <span>Dashboard</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => token && void loadAll(token)}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:bg-black hover:text-white"
              disabled={busy}
            >
              {busy ? "Memuat..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full bg-black px-4 py-2 text-sm text-white transition hover:bg-black/90"
            >
              Logout
            </button>
          </div>
        </header>

        {toast ? (
          <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black/80 backdrop-blur">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <main className="mt-7 grid gap-6">
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <p className="text-xs text-black/55">Revenue</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatIdr(summary?.total_revenue ?? 0)}
              </p>
              <p className="mt-2 text-xs text-black/50">Total pemasukan</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <p className="text-xs text-black/55">Expense</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatIdr(summary?.total_expense ?? 0)}
              </p>
              <p className="mt-2 text-xs text-black/50">Total pengeluaran</p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <p className="text-xs text-black/55">Net Profit</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatIdr(summary?.net_profit ?? 0)}
              </p>
              <p className="mt-2 text-xs text-black/50">
                Margin {formatPct(summary?.margin_percent ?? 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <p className="text-xs text-black/55">Health Score</p>
              <p className="mt-1 text-2xl font-semibold">
                {(health?.health_score ?? 0).toFixed(0)}/100
              </p>
              <p className="mt-2 text-xs text-black/50">{health?.interpretation || "-"}</p>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Tren Cash Flow Bulanan</h2>
                  <p className="mt-1 text-sm text-black/60">
                    Net cash flow dari data transaksi.
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--accent)]/15 px-3 py-2 text-xs ring-1 ring-black/10">
                  {summary?.monthly_trend?.length ?? 0} bulan
                </div>
              </div>
              <div className="mt-4">
                <MiniLineChart points={trendPoints} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-black/70">
                {(summary?.insights || []).slice(0, 3).map((insight) => (
                  <div key={insight} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-black/25" />
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Prediksi Cash Flow</h2>
                  <p className="mt-1 text-sm text-black/60">
                    Estimasi {predMonths} bulan ke depan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={predMonths}
                    onChange={(e) => setPredMonths(Number(e.target.value))}
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                    disabled={busy}
                  >
                    {[3, 6, 9, 12].map((m) => (
                      <option key={m} value={m}>
                        {m} bulan
                      </option>
                    ))}
                  </select>
                  <select
                    value={predModel}
                    onChange={(e) =>
                      setPredModel(e.target.value === "arima" ? "arima" : "linear")
                    }
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                    disabled={busy}
                  >
                    <option value="linear">Linear</option>
                    <option value="arima">ARIMA</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <MiniLineChart points={predPoints} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-black/70">
                <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                  Model: {prediction?.model_used || "-"}
                </span>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1">
                  Risiko defisit: {prediction?.deficit_risk_months ?? 0} bulan
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Transaksi Terbaru</h2>
                  <p className="mt-1 text-sm text-black/60">
                    Terakhir {Math.min(transactions.length, 50)} transaksi.
                  </p>
                </div>
                <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(31,122,140,0.14),rgba(244,162,97,0.14))] px-3 py-2 text-xs ring-1 ring-black/10">
                  {formatIdr(summary?.net_profit ?? 0)} net
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-black/10 bg-white/60 px-4 py-2 text-xs text-black/60">
                  <div className="col-span-3">Tanggal</div>
                  <div className="col-span-2">Tipe</div>
                  <div className="col-span-4">Kategori</div>
                  <div className="col-span-3 text-right">Jumlah</div>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  {transactions.length ? (
                    transactions.map((t) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-black/[0.03]"
                      >
                        <div className="col-span-3 font-mono text-xs text-black/60">
                          {t.date}
                        </div>
                        <div className="col-span-2">
                          <span
                            className={
                              "rounded-full px-2 py-1 text-xs " +
                              (t.type === "income"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-rose-100 text-rose-900")
                            }
                          >
                            {t.type}
                          </span>
                        </div>
                        <div className="col-span-4 truncate">{t.category}</div>
                        <div className="col-span-3 text-right font-medium">
                          {formatIdr(t.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-black/60">
                      Belum ada transaksi. Tambahkan manual atau upload file.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <form
                  onSubmit={onAddTransaction}
                  className="rounded-3xl border border-black/10 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold">Tambah Transaksi</h3>
                  <div className="mt-3 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={txType}
                        onChange={(e) =>
                          setTxType(e.target.value === "expense" ? "expense" : "income")
                        }
                        className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                        disabled={busy}
                      >
                        <option value="income">income</option>
                        <option value="expense">expense</option>
                      </select>
                      <input
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        type="date"
                        className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                        disabled={busy}
                        required
                      />
                    </div>
                    <input
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                      placeholder="Kategori (contoh: Rent, Sales, Ads)"
                      disabled={busy}
                      required
                    />
                    <input
                      value={txAmount ? String(txAmount) : ""}
                      onChange={(e) => setTxAmount(Number(e.target.value))}
                      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                      placeholder="Jumlah (angka)"
                      inputMode="numeric"
                      disabled={busy}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Tambah
                  </button>
                </form>

                <form
                  onSubmit={onUpload}
                  className="rounded-3xl border border-black/10 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold">Upload CSV/XLSX</h3>
                  <p className="mt-2 text-xs text-black/60">
                    Kolom wajib: <span className="font-mono">date, type, category, amount</span>
                  </p>
                  <div className="mt-3 grid gap-2">
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                      disabled={busy}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !uploadFile}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Upload
                  </button>
                </form>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
              <h2 className="text-lg font-semibold">Expense Intelligence</h2>
              <p className="mt-1 text-sm text-black/60">
                Deteksi biaya berulang dan rekomendasi penghematan.
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-black/45">
                    Recurring
                  </p>
                  <div className="mt-3 grid gap-2">
                    {(expense?.recurring_expenses || []).length ? (
                      (expense?.recurring_expenses || []).map((it) => (
                        <div
                          key={it.category}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate">{it.category}</span>
                          <span className="shrink-0 font-medium">
                            {formatIdr(it.average_monthly_amount)}/bln
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-black/60">Belum ada recurring expense.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[linear-gradient(135deg,rgba(31,122,140,0.10),rgba(244,162,97,0.10))] p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-black/45">
                    Rekomendasi
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-black/75">
                    {(expense?.recommendations || []).slice(0, 4).map((r) => (
                      <div key={r} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-black/25" />
                        <p>{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-black/10 pt-5">
                <h2 className="text-lg font-semibold">Chat Asisten</h2>
                <div className="mt-3 flex h-[320px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <div className="flex-1 overflow-auto p-4">
                    <div className="grid gap-3">
                      {chatMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={
                            "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 " +
                            (m.role === "user"
                              ? "ml-auto bg-black text-white"
                              : "bg-black/[0.04] text-black")
                          }
                        >
                          {m.content}
                        </div>
                      ))}
                      {chatBusy ? (
                        <div className="max-w-[92%] rounded-2xl bg-black/[0.04] px-3 py-2 text-sm text-black/70">
                          Mengetik...
                        </div>
                      ) : null}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                  <form onSubmit={onSendChat} className="border-t border-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                        placeholder="Tanya sesuatu..."
                        disabled={chatBusy}
                      />
                      <button
                        type="submit"
                        disabled={chatBusy}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Kirim
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 text-xs text-black/55">
          <p>
            API:{" "}
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}
