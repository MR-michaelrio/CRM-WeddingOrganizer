// Status transaksi per-client, diturunkan dari invoice DP + Pelunasan.
//
// Aturan:
// - batal       : ada invoice (DP/Pelunasan) yang status-nya "void".
// - paid_lunas  : invoice Pelunasan status=paid.
// - paid_dp     : invoice DP status=paid (dan Pelunasan belum paid).
// - overdue     : invoice Pelunasan (atau DP kalau Pelunasan belum dibuat)
//                 dueDate sudah lewat hari ini & belum paid.
// - sent        : minimal satu invoice status=sent (belum paid, belum overdue).
// - draft       : default — masih draft.

export type TransactionStatus =
  | "draft"
  | "sent"
  | "paid_dp"
  | "paid_lunas"
  | "overdue"
  | "batal";

export type InvoiceForStatus = {
  type: string; // "dp" | "pelunasan"
  status: string;
  amount: number | string;
  dueDate: Date | string | null;
  paidAt?: Date | string | null;
};

const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  draft: "Draft",
  sent: "Terkirim",
  paid_dp: "DP Lunas",
  paid_lunas: "Lunas",
  overdue: "Overdue",
  batal: "Batal",
};

const TRANSACTION_STATUS_TONE: Record<TransactionStatus, string> = {
  draft: "neutral",
  sent: "gold",
  paid_dp: "warning",
  paid_lunas: "success",
  overdue: "danger",
  batal: "neutral",
};

export function transactionStatusLabel(s: TransactionStatus): string {
  return TRANSACTION_STATUS_LABEL[s];
}

export function transactionStatusTone(s: TransactionStatus): string {
  return TRANSACTION_STATUS_TONE[s];
}

function asDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeTransactionStatus(
  invoices: InvoiceForStatus[],
  now: Date = new Date()
): TransactionStatus {
  if (invoices.some((i) => i.status === "void")) return "batal";

  const dp = invoices.find((i) => i.type === "dp");
  const pel = invoices.find((i) => i.type === "pelunasan");

  if (pel?.status === "paid") return "paid_lunas";

  // Pelunasan ada tapi overdue → overdue
  if (pel && pel.status !== "paid") {
    const due = asDate(pel.dueDate);
    if (due && due < startOfDay(now)) return "overdue";
  }

  if (dp?.status === "paid") return "paid_dp";

  // DP belum dibayar tapi sudah lewat dueDate → overdue
  if (dp && dp.status !== "paid") {
    const due = asDate(dp.dueDate);
    if (due && due < startOfDay(now)) return "overdue";
  }

  if (invoices.some((i) => i.status === "sent")) return "sent";
  return "draft";
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// Persentase DP dari total package. Total = subtotal items kalau ada, kalau
// tidak ya jumlah pelunasan + DP. Return rounded integer percent (1..99) atau
// null kalau tidak bisa dihitung.
export function dpPercent(
  dpAmount: number,
  pelunasanAmount: number | null,
  totalItems: number | null
): number | null {
  const total =
    totalItems && totalItems > 0
      ? totalItems
      : (pelunasanAmount ?? 0) + dpAmount;
  if (total <= 0) return null;
  const pct = Math.round((dpAmount / total) * 100);
  if (pct <= 0 || pct >= 100) return null;
  return pct;
}
