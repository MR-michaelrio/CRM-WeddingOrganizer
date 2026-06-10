"use client";

import { useMemo, useState } from "react";
import { Ban, Plus, Printer, Receipt, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/page-loader";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import {
  NewInvoiceDialog,
  type InvoiceForEdit,
} from "@/components/forms/new-invoice-dialog";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import { formatDateID, formatIDR } from "@/lib/format";

type InvoiceItem = { description: string; qty: number; price: number; details?: string };

type InvoiceDTO = {
  id: number;
  number: string;
  clientId: number;
  type: string;
  amount: string;
  issuedDate: string;
  dueDate: string | null;
  status: string;
  paidAt: string | null;
  notes: string | null;
  items: InvoiceItem[] | null;
  eventLabel: string | null;
  client: { id: number; names: string; eventType: string; eventDate: string };
};

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger" | "gold"> = {
  draft: "neutral",
  sent: "gold",
  paid: "success",
  overdue: "danger",
  void: "neutral",
};

// Display label & effective status, dengan auto-overdue ketika dueDate sudah
// lewat hari ini & invoice belum paid/void.
function displayInvoiceStatus(
  inv: { status: string; dueDate: string | null; type: string; amount: string },
  totalForPct: number
): { label: string; tone: "neutral" | "warning" | "success" | "danger" | "gold" } {
  const auto =
    inv.status !== "paid" &&
    inv.status !== "void" &&
    inv.dueDate &&
    new Date(inv.dueDate) < new Date(new Date().toDateString())
      ? "overdue"
      : inv.status;

  if (auto === "paid") {
    if (inv.type === "dp") {
      const amt = Number(inv.amount);
      const pct =
        totalForPct > 0 && amt > 0
          ? Math.round((amt / totalForPct) * 100)
          : 0;
      const suffix = pct > 0 && pct < 100 ? ` ${pct}%` : "";
      return { label: `LUNAS${suffix}`, tone: "success" };
    }
    return { label: "LUNAS", tone: "success" };
  }
  if (auto === "overdue") return { label: "OVERDUE", tone: "danger" };
  if (auto === "void") return { label: "BATAL", tone: "neutral" };
  return { label: auto, tone: STATUS_TONE[auto] ?? "neutral" };
}

export default function InvoicesPage() {
  const { data, loading, error, refresh } = useFetch<InvoiceDTO[]>("/api/invoices");
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InvoiceForEdit | null>(null);
  const [deleting, setDeleting] = useState<InvoiceDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.filter((inv) => {
      const matchQ =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.client.names.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      const matchType = filterType === "all" || inv.type === filterType;
      return matchQ && matchStatus && matchType;
    });
  }, [data, query, filterStatus, filterType]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const paid = rows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + Number(r.amount), 0);
    const outstanding = rows
      .filter((r) => r.status === "sent" || r.status === "overdue" || r.status === "draft")
      .reduce((s, r) => s + Number(r.amount), 0);
    return { total, paid, outstanding };
  }, [data]);

  const markPaid = async (inv: InvoiceDTO) => {
    try {
      const res = await apiFetch<{ autoCreatedPelunasanId: number | null }>(
        `/api/invoices/${inv.id}`,
        { method: "PATCH", body: { status: "paid" } }
      );
      refresh();
      if (inv.type === "dp" && res?.autoCreatedPelunasanId) {
        alert(
          "DP berhasil ditandai lunas.\nInvoice Pelunasan otomatis dibuat sebagai draft — silakan review & kirim ke client."
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const markBatal = async (inv: InvoiceDTO) => {
    if (
      !window.confirm(
        `Batalkan invoice ${inv.number}? Status akan jadi "Batal" (void).`
      )
    )
      return;
    try {
      await apiFetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        body: { status: "void" },
      });
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Invoices"
        subtitle="Buat dan kelola invoice DP dan Pelunasan"
        action={
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Total Issued</div>
          <div className="mt-1 font-serif text-2xl font-bold text-ink">
            {formatIDR(stats.total)}
          </div>
        </div>
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Paid</div>
          <div className="mt-1 font-serif text-2xl font-bold text-success">
            {formatIDR(stats.paid)}
          </div>
        </div>
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Outstanding</div>
          <div className="mt-1 font-serif text-2xl font-bold text-warning">
            {formatIDR(stats.outstanding)}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice number or client…"
            className="w-full rounded-sm border border-line bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="btn btn-secondary min-w-[140px]"
        >
          <option value="all">All Types</option>
          <option value="dp">DP</option>
          <option value="pelunasan">Pelunasan</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="btn btn-secondary min-w-[140px]"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="card-base overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line bg-cream">
                {[
                  "Invoice #",
                  "Client",
                  "Type",
                  "Amount",
                  "Issued",
                  "Due",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12">
                    <PageLoader label="Loading invoices…" />
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-ink-light">
                    {data?.length === 0
                      ? "Belum ada invoice. Klik 'New Invoice' untuk menambah."
                      : "Tidak ada invoice yang cocok dengan filter."}
                  </td>
                </tr>
              )}
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-cream/60"
                >
                  <td className="px-6 py-4 font-mono text-sm text-ink">{inv.number}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-ink">{inv.client.names}</div>
                    <div className="text-xs text-ink-light">{inv.client.eventType}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={inv.type === "dp" ? "gold" : "success"}>
                      {inv.type === "dp" ? "DP" : "Pelunasan"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-semibold text-ink">
                    {formatIDR(inv.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-medium">
                    {formatDateID(inv.issuedDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-medium">
                    {inv.dueDate ? formatDateID(inv.dueDate) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const subtotal = (inv.items ?? []).reduce(
                        (s, it) =>
                          s + (Number(it.qty) || 0) * (Number(it.price) || 0),
                        0
                      );
                      const totalForPct =
                        subtotal > 0 ? subtotal : Number(inv.amount);
                      const d = displayInvoiceStatus(
                        {
                          status: inv.status,
                          dueDate: inv.dueDate,
                          type: inv.type,
                          amount: inv.amount,
                        },
                        totalForPct
                      );
                      return <Badge tone={d.tone}>{d.label}</Badge>;
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/invoices/${inv.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary !py-1.5 text-xs"
                        title={`Print Invoice ${inv.type === "dp" ? "DP" : "Pelunasan"}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Invoice {inv.type === "dp" ? "DP" : "Pelunasan"}
                      </a>
                      {inv.status === "paid" && (
                        <a
                          href={`/invoices/${inv.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary !py-1.5 text-xs"
                          title={`Kwitansi ${inv.type === "dp" ? "Pembayaran DP" : "Pelunasan"}`}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Kwitansi {inv.type === "dp" ? "DP" : "Pelunasan"}
                        </a>
                      )}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <button
                          onClick={() => markPaid(inv)}
                          className="btn btn-secondary !py-1.5 text-xs"
                          title={`Tandai ${inv.type === "dp" ? "DP" : "Pelunasan"} sudah dibayar`}
                        >
                          Tandai Lunas {inv.type === "dp" ? "DP" : "Pelunasan"}
                        </button>
                      )}
                      <RowActions
                        onEdit={() =>
                          setEditing({
                            id: inv.id,
                            clientId: inv.clientId,
                            type: inv.type,
                            amount: inv.amount,
                            dueDate: inv.dueDate,
                            status: inv.status,
                            notes: inv.notes,
                            items: inv.items,
                            eventLabel: inv.eventLabel,
                          })
                        }
                        extras={
                          inv.status !== "void" && inv.status !== "paid"
                            ? [
                                {
                                  label: "Mark Batal",
                                  icon: Ban,
                                  onClick: () => markBatal(inv),
                                },
                              ]
                            : undefined
                        }
                        onDelete={() => setDeleting(inv)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <NewInvoiceDialog
          open
          onClose={() => setCreating(false)}
          onSuccess={refresh}
        />
      )}

      {editing && (
        <NewInvoiceDialog
          open
          invoice={editing}
          onClose={() => setEditing(null)}
          onSuccess={refresh}
        />
      )}

      {deleting && (
        <DeleteEndpointDialog
          open
          onClose={() => setDeleting(null)}
          onSuccess={refresh}
          endpoint={`/api/invoices/${deleting.id}`}
          title={`Hapus invoice ${deleting.number}?`}
          description={`Invoice untuk ${deleting.client.names} akan dihapus permanen.`}
        />
      )}
    </div>
  );
}
