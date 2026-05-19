"use client";

import { useMemo, useState } from "react";
import { Wallet, Coins, Clock, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditPaymentDialog } from "@/components/forms/edit-payment-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { ClientDTO, PaymentDTO } from "@/lib/types";
import { formatDateID, formatIDR, formatIDRCompact } from "@/lib/format";

const typeLabel: Record<string, string> = {
  dp: "DP",
  installment: "Installment",
  final: "Pelunasan",
  vendor: "Vendor",
  expense: "Expense",
};

export default function FinancePage() {
  const { data: payments, refresh } = useFetch<PaymentDTO[]>("/api/payments");
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");

  const [edit, setEdit] = useState<PaymentDTO | null>(null);
  const [del, setDel] = useState<PaymentDTO | null>(null);

  const summary = useMemo(() => {
    if (!payments || !clients) {
      return { total: 0, received: 0, outstanding: 0, expenses: 0 };
    }
    const received = payments
      .filter((p) => p.type !== "expense" && p.type !== "vendor")
      .reduce((s, p) => s + Number(p.amount), 0);
    const expenses = payments
      .filter((p) => p.type === "expense" || p.type === "vendor")
      .reduce((s, p) => s + Number(p.amount), 0);
    const total = clients.reduce((s, c) => s + Number(c.contractValue ?? 0), 0);
    const outstanding = total - received;
    return { total, received, outstanding, expenses };
  }, [payments, clients]);

  return (
    <div className="p-8">
      <PageHeader title="Finance" subtitle="Revenue, expenses, and payment tracking" />

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          iconTone="success"
          value={formatIDRCompact(summary.total)}
          label="Total Contract Value"
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          iconTone="gold"
          value={formatIDRCompact(summary.received)}
          label="Received Payments"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconTone="warning"
          value={formatIDRCompact(summary.outstanding)}
          label="Outstanding"
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          iconTone="danger"
          value={formatIDRCompact(summary.expenses)}
          label="Expenses"
        />
      </div>

      <div className="card-base p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">All Payments</h3>
          <DialogTrigger kind="payment" onSuccess={refresh} />
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
                        p.type === "expense" || p.type === "vendor" ? "danger" : "success"
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
                      onEdit={() => setEdit(p)}
                      onDelete={() => setDel(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <EditPaymentDialog
          open
          onClose={() => setEdit(null)}
          payment={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/payments/${del.id}`}
          title={`Delete payment ${formatIDR(del.amount)}?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
