"use client";

import { useMemo, useState } from "react";
import {
  Wallet,
  Coins,
  TrendingDown,
  TrendingUp,
  Plus,
  Ban,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-field";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditPaymentDialog } from "@/components/forms/edit-payment-dialog";
import {
  ExpenseDialog,
  type ExpenseForEdit,
} from "@/components/forms/expense-dialog";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO, PaymentDTO } from "@/lib/types";
import { formatDateID, formatIDR, formatIDRCompact } from "@/lib/format";

const typeLabel: Record<string, string> = {
  dp: "DP",
  installment: "Installment",
  final: "Pelunasan",
  vendor: "Vendor",
  expense: "Expense",
};

type ExpenseDTO = {
  id: number;
  date: string;
  category: string;
  amount: string;
  method: string;
  vendor: string;
  clientId: number | null;
  client: { id: number; names: string } | null;
  description: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: string;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
};

const expenseStatusTone: Record<string, "neutral" | "success" | "danger" | "gold"> = {
  draft: "neutral",
  paid: "success",
  void: "danger",
};

export default function FinancePage() {
  const { data: payments, refresh: refreshPayments } =
    useFetch<PaymentDTO[]>("/api/payments");
  const { data: expenses, refresh: refreshExpenses } =
    useFetch<ExpenseDTO[]>("/api/expenses");
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");

  const [editPay, setEditPay] = useState<PaymentDTO | null>(null);
  const [delPay, setDelPay] = useState<PaymentDTO | null>(null);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseForEdit | null>(null);
  const [voidExpense, setVoidExpense] = useState<ExpenseDTO | null>(null);
  const [delExpense, setDelExpense] = useState<ExpenseDTO | null>(null);

  const refreshAll = () => {
    refreshPayments();
    refreshExpenses();
  };

  const summary = useMemo(() => {
    const received = (payments ?? [])
      .filter((p) => p.type !== "expense" && p.type !== "vendor")
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = (expenses ?? [])
      .filter((e) => e.status === "paid")
      .reduce((s, e) => s + Number(e.amount), 0);
    const totalContract = (clients ?? []).reduce(
      (s, c) => s + Number(c.contractValue ?? 0),
      0
    );
    const profit = received - totalExpenses;
    return { totalContract, received, totalExpenses, profit };
  }, [payments, expenses, clients]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses ?? []) {
      if (e.status === "void") continue;
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const byClient = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const e of expenses ?? []) {
      if (e.status === "void") continue;
      const key = e.client?.id ? String(e.client.id) : "_none";
      const name = e.client?.names ?? "Operasional / Tanpa Client";
      const prev = map.get(key) ?? { name, total: 0 };
      prev.total += Number(e.amount);
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const toExpenseForEdit = (e: ExpenseDTO): ExpenseForEdit => ({
    id: e.id,
    date: e.date,
    category: e.category,
    amount: e.amount,
    method: e.method,
    vendor: e.vendor,
    clientId: e.clientId,
    description: e.description,
    attachmentUrl: e.attachmentUrl,
    attachmentName: e.attachmentName,
    status: e.status,
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Finance"
        subtitle="Pemasukan, pengeluaran, dan tracking pembayaran"
      />

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          iconTone="success"
          value={formatIDRCompact(summary.totalContract)}
          label="Total Contract Value"
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          iconTone="gold"
          value={formatIDRCompact(summary.received)}
          label="Total Pemasukan"
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          iconTone="danger"
          value={formatIDRCompact(summary.totalExpenses)}
          label="Total Pengeluaran"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconTone={summary.profit >= 0 ? "success" : "danger"}
          value={formatIDRCompact(summary.profit)}
          label="Profit"
        />
      </div>

      {/* ---- Breakdown grid ---- */}
      {(byCategory.length > 0 || byClient.length > 0) && (
        <div className="mb-8 grid gap-5 lg:grid-cols-2">
          <div className="card-base p-6">
            <h3 className="mb-4 text-base font-semibold text-ink">
              Pengeluaran per Kategori
            </h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-ink-light">Belum ada pengeluaran.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {byCategory.map((row) => {
                  const pct =
                    summary.totalExpenses > 0
                      ? (row.total / summary.totalExpenses) * 100
                      : 0;
                  return (
                    <li key={row.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{row.category}</span>
                        <span className="font-semibold text-ink">
                          {formatIDR(row.total)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-cream">
                        <div
                          className="h-full bg-danger/70"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card-base p-6">
            <h3 className="mb-4 text-base font-semibold text-ink">
              Pengeluaran per Client
            </h3>
            {byClient.length === 0 ? (
              <p className="text-sm text-ink-light">Belum ada pengeluaran.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {byClient.map((row) => {
                  const pct =
                    summary.totalExpenses > 0
                      ? (row.total / summary.totalExpenses) * 100
                      : 0;
                  return (
                    <li key={row.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{row.name}</span>
                        <span className="font-semibold text-ink">
                          {formatIDR(row.total)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-cream">
                        <div
                          className="h-full bg-gold/70"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ---- Expenses table ---- */}
      <div className="mb-8 card-base p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Pengeluaran</h3>
          <button
            onClick={() => setCreatingExpense(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" /> Tambah Pengeluaran
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                {[
                  "Tanggal",
                  "Kategori",
                  "Vendor",
                  "Client",
                  "Nominal",
                  "Bukti",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!expenses || expenses.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-ink-light">
                    Belum ada pengeluaran tercatat.
                  </td>
                </tr>
              )}
              {expenses?.map((e) => {
                const isPdf = e.attachmentUrl?.toLowerCase().endsWith(".pdf");
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-line last:border-0 ${
                      e.status === "void" ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-4 text-sm text-ink-medium">
                      {formatDateID(e.date)}
                    </td>
                    <td className="py-4">
                      <Badge tone="neutral">{e.category}</Badge>
                    </td>
                    <td className="py-4 font-semibold text-ink">{e.vendor}</td>
                    <td className="py-4 text-sm text-ink-medium">
                      {e.client?.names ?? <span className="text-ink-light">—</span>}
                    </td>
                    <td className="py-4 font-semibold text-ink">
                      {formatIDR(e.amount)}
                    </td>
                    <td className="py-4">
                      {e.attachmentUrl ? (
                        <a
                          href={e.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
                          title={e.attachmentName ?? "Bukti pembayaran"}
                        >
                          {isPdf ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5" />
                          )}
                          Lihat
                        </a>
                      ) : (
                        <span className="text-xs text-ink-light">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      <Badge tone={expenseStatusTone[e.status] ?? "neutral"}>
                        {e.status === "void" ? "VOID" : e.status}
                      </Badge>
                      {e.status === "void" && e.voidedBy && (
                        <div className="mt-0.5 text-[10px] text-ink-light">
                          oleh {e.voidedBy}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <RowActions
                        onEdit={
                          e.status !== "void"
                            ? () => setEditExpense(toExpenseForEdit(e))
                            : undefined
                        }
                        extras={
                          e.status !== "void"
                            ? [
                                {
                                  label: "Void",
                                  icon: Ban,
                                  onClick: () => setVoidExpense(e),
                                },
                              ]
                            : undefined
                        }
                        onDelete={() => setDelExpense(e)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Payments table ---- */}
      <div className="card-base p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Pembayaran Masuk</h3>
          <DialogTrigger kind="payment" onSuccess={refreshPayments} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                {["Date", "Client", "Type", "Method", "Amount", "Reference", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {payments?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-ink-light">
                    Belum ada pembayaran tercatat.
                  </td>
                </tr>
              )}
              {payments?.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-4 text-ink-medium">
                    {formatDateID(p.paymentDate)}
                  </td>
                  <td className="py-4 font-semibold text-ink">
                    {p.client?.names ?? "—"}
                  </td>
                  <td className="py-4">
                    <Badge
                      tone={
                        p.type === "expense" || p.type === "vendor"
                          ? "danger"
                          : "success"
                      }
                    >
                      {typeLabel[p.type] ?? p.type}
                    </Badge>
                  </td>
                  <td className="py-4 text-ink-medium">{p.method}</td>
                  <td className="py-4 font-semibold text-ink">
                    {formatIDR(p.amount)}
                  </td>
                  <td className="py-4 text-ink-light">{p.reference ?? "—"}</td>
                  <td className="py-3">
                    <RowActions
                      onEdit={() => setEditPay(p)}
                      onDelete={() => setDelPay(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Dialogs ---- */}
      {creatingExpense && (
        <ExpenseDialog
          open
          onClose={() => setCreatingExpense(false)}
          onSuccess={refreshAll}
        />
      )}
      {editExpense && (
        <ExpenseDialog
          open
          onClose={() => setEditExpense(null)}
          expense={editExpense}
          onSuccess={refreshAll}
        />
      )}
      {voidExpense && (
        <VoidExpenseDialog
          expense={voidExpense}
          onClose={() => setVoidExpense(null)}
          onSuccess={refreshAll}
        />
      )}
      {delExpense && (
        <DeleteEndpointDialog
          open
          onClose={() => setDelExpense(null)}
          endpoint={`/api/expenses/${delExpense.id}`}
          title={`Hapus pengeluaran ${formatIDR(delExpense.amount)}?`}
          description="Tindakan ini tidak dapat diurungkan. Untuk audit, gunakan Void sebagai gantinya."
          onSuccess={refreshAll}
        />
      )}

      {editPay && (
        <EditPaymentDialog
          open
          onClose={() => setEditPay(null)}
          payment={editPay}
          onSuccess={refreshPayments}
        />
      )}
      {delPay && (
        <DeleteEndpointDialog
          open
          onClose={() => setDelPay(null)}
          endpoint={`/api/payments/${delPay.id}`}
          title={`Delete payment ${formatIDR(delPay.amount)}?`}
          onSuccess={refreshPayments}
        />
      )}
    </div>
  );
}

function VoidExpenseDialog({
  expense,
  onClose,
  onSuccess,
}: {
  expense: ExpenseDTO;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [voidedBy, setVoidedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError("Alasan void wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/expenses/${expense.id}/void`, {
        method: "POST",
        body: { reason: reason.trim(), voidedBy: voidedBy.trim() || undefined },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal void");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Void Pengeluaran"
      description={`${expense.vendor} · ${formatIDR(expense.amount)} · ${expense.category}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          {error && <span className="mr-auto text-xs text-danger">{error}</span>}
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button
            type="submit"
            form="void-expense-form"
            disabled={submitting}
            className="btn btn-primary !bg-danger"
          >
            {submitting ? "Memproses..." : "Void Pengeluaran"}
          </button>
        </div>
      }
    >
      <form
        id="void-expense-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-ink-medium">
          Pengeluaran tidak akan dihapus, hanya ditandai sebagai{" "}
          <strong>VOID</strong>. Wajib mengisi alasan untuk catatan audit.
        </p>
        <Field label="Alasan void" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mis. salah input nominal / pengeluaran dibatalkan / dobel pencatatan"
            rows={3}
            required
          />
        </Field>
        <Field
          label="Dilakukan oleh (opsional)"
          hint="Kosongkan untuk pakai nama dari Settings."
        >
          <Input
            value={voidedBy}
            onChange={(e) => setVoidedBy(e.target.value)}
            placeholder="Nama (kosongkan = otomatis)"
          />
        </Field>
      </form>
    </Dialog>
  );
}
