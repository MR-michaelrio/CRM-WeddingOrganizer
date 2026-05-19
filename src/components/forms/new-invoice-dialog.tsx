"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import { formatIDR } from "@/lib/format";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultClientId?: number;
  invoice?: InvoiceForEdit;
};

type PackageOption = {
  id: number;
  name: string;
  price: string;
  description: string | null;
};

export type InvoiceItem = {
  description: string;
  qty: number;
  price: number;
};

export type InvoiceForEdit = {
  id: number;
  clientId: number;
  type: string;
  amount: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  items?: InvoiceItem[] | null;
  eventLabel?: string | null;
};

function parseCurrency(s: string): number {
  return Number(s.replace(/\D/g, "")) || 0;
}

const EMPTY_ITEM: InvoiceItem = { description: "", qty: 1, price: 0 };

export function NewInvoiceDialog({
  open,
  onClose,
  onSuccess,
  defaultClientId,
  invoice,
}: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const { data: packages } = useFetch<PackageOption[]>("/api/packages");
  // Track whether the user has manually touched items. While untouched
  // (single empty row OR auto-filled from package), selecting a client
  // will re-prefill from that client's package.
  const [itemsTouched, setItemsTouched] = useState<boolean>(!!invoice);
  const [clientId, setClientId] = useState<string>(
    invoice ? String(invoice.clientId) : defaultClientId ? String(defaultClientId) : ""
  );
  const [type, setType] = useState<string>(invoice?.type ?? "dp");
  const [amount, setAmount] = useState<string>(
    invoice ? String(Math.round(Number(invoice.amount))) : ""
  );
  const [dueDate, setDueDate] = useState<string>(
    invoice?.dueDate ? invoice.dueDate.slice(0, 10) : ""
  );
  const [status, setStatus] = useState<string>(invoice?.status ?? "draft");
  const [notes, setNotes] = useState<string>(invoice?.notes ?? "");
  const [eventLabel, setEventLabel] = useState<string>(invoice?.eventLabel ?? "");
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items && invoice.items.length > 0
      ? invoice.items.map((it) => ({
          description: it.description,
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
        }))
      : [{ ...EMPTY_ITEM }]
  );
  const [dpPercent, setDpPercent] = useState<string>(() => {
    if (!invoice) return "50";
    const amt = Number(invoice.amount);
    // Try to derive percent from existing items if any
    if (invoice.items && invoice.items.length > 0) {
      const subtotal = invoice.items.reduce(
        (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );
      if (subtotal > 0) return String(Math.round((amt / subtotal) * 100));
    }
    return "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineTotal = useMemo(
    () =>
      items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0),
    [items]
  );

  const selectedClient = clients?.find((c) => String(c.id) === clientId);
  const suggestedFullAmount = selectedClient?.contractValue
    ? Number(selectedClient.contractValue)
    : null;

  const baseTotal = lineTotal || suggestedFullAmount || 0;
  const currentAmount = parseCurrency(amount);
  const derivedPercent =
    baseTotal > 0 ? Math.round((currentAmount / baseTotal) * 100) : 0;

  // Keep amount in sync when type/percent/subtotal changes (only when user
  // hasn't manually overridden amount — heuristic: amount equals percent*total).
  useEffect(() => {
    if (invoice) return;
    if (!baseTotal) return;
    if (type === "pelunasan") {
      setAmount(String(Math.round(baseTotal)));
      setDpPercent("100");
      return;
    }
    const pct = Number(dpPercent) || 0;
    if (pct > 0) {
      setAmount(String(Math.round((baseTotal * pct) / 100)));
    }
  }, [type, baseTotal, dpPercent, invoice]);

  const onAmountChange = (v: string) => {
    setAmount(v);
    const num = parseCurrency(v);
    if (baseTotal > 0) {
      setDpPercent(String(Math.round((num / baseTotal) * 100)));
    }
  };

  const onPercentChange = (v: string) => {
    setDpPercent(v);
    const pct = Number(v) || 0;
    if (baseTotal > 0) {
      setAmount(String(Math.round((baseTotal * pct) / 100)));
    }
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItemsTouched(true);
    setItems((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };
  const addItem = () => {
    setItemsTouched(true);
    setItems((arr) => [...arr, { ...EMPTY_ITEM }]);
  };
  const removeItem = (idx: number) => {
    setItemsTouched(true);
    setItems((arr) => (arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx)));
  };

  const addPackageAsItem = (pkgName: string) => {
    const pkg = (packages ?? []).find((p) => p.name === pkgName);
    if (!pkg) return;
    const newItem: InvoiceItem = {
      description: pkg.name.toUpperCase(),
      qty: 1,
      price: Number(pkg.price) || 0,
    };
    setItemsTouched(true);
    setItems((arr) => {
      // If only one empty default row, replace it. Otherwise append.
      const isOnlyEmpty =
        arr.length === 1 &&
        !arr[0].description &&
        !arr[0].price &&
        (arr[0].qty === 0 || arr[0].qty === 1);
      return isOnlyEmpty ? [newItem] : [...arr, newItem];
    });
  };

  // Auto-prefill items from the selected client's package when user hasn't
  // manually edited items yet.
  useEffect(() => {
    if (itemsTouched) return;
    if (!selectedClient?.package) return;
    const pkg = (packages ?? []).find((p) => p.name === selectedClient.package);
    if (!pkg) return;
    setItems([
      {
        description: pkg.name.toUpperCase(),
        qty: 1,
        price: Number(pkg.price) || 0,
      },
    ]);
    // We intentionally don't set itemsTouched here — if user picks a different
    // client we want to prefill again. Touching happens on manual edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.package, packages, itemsTouched]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const id = Number(clientId);
    const amt = parseCurrency(amount);
    if (!id) {
      setError("Pilih client dulu");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount harus angka > 0");
      return;
    }
    const cleanedItems = items
      .map((it) => ({
        description: it.description.trim(),
        qty: Number(it.qty) || 0,
        price: Number(it.price) || 0,
      }))
      .filter((it) => it.description || it.qty > 0 || it.price > 0);

    setSubmitting(true);
    try {
      const body = {
        clientId: id,
        type,
        amount: amt,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
        eventLabel: eventLabel.trim() || null,
        items: cleanedItems.length ? cleanedItems : null,
        status,
      };
      if (invoice) {
        await apiFetch(`/api/invoices/${invoice.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/invoices", { body });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={invoice ? "Edit Invoice" : "New Invoice"}
      description={
        invoice
          ? `Update invoice ${invoice.id}`
          : "Buat invoice DP atau Pelunasan untuk client."
      }
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="invoice-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : invoice ? "Update Invoice" : "Save Invoice"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="invoice-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" required className="sm:col-span-2">
          <Select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={!!invoice || !!defaultClientId}
          >
            <option value="">— Pilih client —</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.names} · {c.eventType}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="dp">DP (Down Payment)</option>
            <option value="pelunasan">Pelunasan</option>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </Select>
        </Field>

        {/* ---- Line items ---- */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-light">
              Items
              {selectedClient?.package && !itemsTouched && (
                <span className="ml-2 normal-case tracking-normal text-[10px] font-normal text-ink-light">
                  · auto-filled dari paket &quot;{selectedClient.package}&quot;
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              {(packages?.length ?? 0) > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addPackageAsItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="rounded-sm border border-line bg-card px-2 py-1 text-xs outline-none focus:border-gold"
                >
                  <option value="">+ Add from package…</option>
                  {(packages ?? []).map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} · {formatIDR(p.price)}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
              >
                <Plus className="h-3 w-3" />
                Custom item
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full text-sm">
              <thead className="bg-cream text-[11px] uppercase tracking-wider text-ink-light">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="w-20 px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="w-40 px-3 py-2 text-right font-semibold">Harga</th>
                  <th className="w-40 px-3 py-2 text-right font-semibold">Total</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const rowTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
                  return (
                    <tr key={idx} className="border-t border-line">
                      <td className="px-3 py-1.5">
                        <Input
                          value={it.description}
                          onChange={(e) =>
                            updateItem(idx, { description: e.target.value })
                          }
                          placeholder="e.g. PAKET BAKI"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={String(it.qty)}
                          onChange={(e) =>
                            updateItem(idx, { qty: Number(e.target.value) || 0 })
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={it.price ? String(it.price) : ""}
                          onChange={(e) =>
                            updateItem(idx, { price: parseCurrency(e.target.value) })
                          }
                          placeholder="0"
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-ink">
                        {formatIDR(rowTotal)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="rounded-sm p-1 text-ink-light transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-cream">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold uppercase text-ink-light">
                    Subtotal
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-ink">
                    {formatIDR(lineTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {type === "dp" && (
          <Field
            label="DP Percent (%)"
            hint="Ubah persen → amount auto-update. Atau isi amount manual di sebelah."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={dpPercent}
              onChange={(e) => onPercentChange(e.target.value)}
              placeholder="50"
            />
          </Field>
        )}

        <Field
          label={type === "dp" ? "DP Amount (Rp)" : "Pelunasan Amount (Rp)"}
          required
          hint={
            baseTotal > 0
              ? `Subtotal items: ${formatIDR(baseTotal)}${derivedPercent ? ` · ≈ ${derivedPercent}%` : ""}`
              : suggestedFullAmount
                ? `Client contract: ${formatIDR(suggestedFullAmount)}`
                : undefined
          }
        >
          <Input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="e.g. 375000"
            required
          />
        </Field>

        <Field label="Due Date">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>

        <Field
          label="Event Label"
          hint="Muncul sebagai bullet di invoice, mis. 'ACARA SANGJIT 06 NOVEMBER 2026'"
          className="sm:col-span-2"
        >
          <Input
            value={eventLabel}
            onChange={(e) => setEventLabel(e.target.value)}
            placeholder="ACARA SANGJIT 06 NOVEMBER 2026"
          />
        </Field>

        <Field label="Notes" className="sm:col-span-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan (terms, payment method, dll.)"
          />
        </Field>
      </form>
    </Dialog>
  );
}
