export function formatIDR(amount: number | string | null | undefined): string {
  const n =
    typeof amount === "string"
      ? Number(amount)
      : typeof amount === "number"
      ? amount
      : 0;
  if (!Number.isFinite(n)) return "Rp 0";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function formatIDRCompact(amount: number | string | null | undefined): string {
  const n =
    typeof amount === "string"
      ? Number(amount)
      : typeof amount === "number"
      ? amount
      : 0;
  if (!Number.isFinite(n) || n === 0) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (n >= 1_000_000) return `Rp ${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}K`;
  return `Rp ${Math.round(n)}`;
}

export function formatDateID(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
