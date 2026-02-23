export function formatIdr(amount: number): string {
  if (!Number.isFinite(amount)) return "Rp 0";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const rounded = Math.round(amount);
    return `Rp ${rounded.toLocaleString("id-ID")}`;
  }
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

export function safeDateLabel(isoDate: string): string {
  // Expects "YYYY-MM-DD". Returns "MMM YYYY" for monthly series.
  const [y, m] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

