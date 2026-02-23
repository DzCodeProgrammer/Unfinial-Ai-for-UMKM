import type {
  ExpenseIntelligenceResponse,
  HealthScoreResponse,
  PredictionResponse,
  SummaryResponse,
  TokenResponse,
  TransactionRead,
  UserRead,
} from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

async function parseError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await res.json()) as { detail?: unknown };
      if (typeof data.detail === "string") return data.detail;
      return JSON.stringify(data);
    } catch {
      return `${res.status} ${res.statusText}`;
    }
  }
  try {
    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");

  if (token) headers.set("authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (err) {
    const hint =
      "Gagal menghubungi backend API. Pastikan FastAPI jalan di port 8000, " +
      "dan `NEXT_PUBLIC_API_BASE_URL` menunjuk ke host yang benar.";
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${hint} (API=${API_BASE}${path}) (${msg})`);
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as T;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<UserRead> {
  return apiFetch<UserRead>("/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, role: "owner" }),
  });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getSummary(token: string): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>("/dashboard/summary", {}, token);
}

export async function getHealthScore(
  token: string,
): Promise<HealthScoreResponse> {
  return apiFetch<HealthScoreResponse>("/insights/health-score", {}, token);
}

export async function getExpenseIntelligence(
  token: string,
): Promise<ExpenseIntelligenceResponse> {
  return apiFetch<ExpenseIntelligenceResponse>(
    "/insights/expense-intelligence",
    {},
    token,
  );
}

export async function getPrediction(params: {
  token: string;
  months: number;
  model: "linear" | "arima";
}): Promise<PredictionResponse> {
  const q = new URLSearchParams({
    months: String(params.months),
    model: params.model,
  });
  return apiFetch<PredictionResponse>(`/predictions/cash-flow?${q}`, {}, params.token);
}

export async function listTransactions(params: {
  token: string;
  limit?: number;
  offset?: number;
}): Promise<TransactionRead[]> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<TransactionRead[]>(`/transactions${suffix}`, {}, params.token);
}

export async function createTransaction(params: {
  token: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  note?: string;
}): Promise<TransactionRead> {
  const { token, ...payload } = params;
  return apiFetch<TransactionRead>(
    "/transactions",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function uploadTransactionsFile(params: {
  token: string;
  file: File;
}): Promise<{ inserted_rows: number; skipped_rows: number; message: string }> {
  const form = new FormData();
  form.append("file", params.file);

  return apiFetch<{ inserted_rows: number; skipped_rows: number; message: string }>(
    "/transactions/upload/me",
    {
      method: "POST",
      body: form,
    },
    params.token,
  );
}

export async function financeChat(params: {
  token: string;
  question: string;
}): Promise<{ answer: string }> {
  return apiFetch<{ answer: string }>(
    "/chat/me",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: params.question }),
    },
    params.token,
  );
}
