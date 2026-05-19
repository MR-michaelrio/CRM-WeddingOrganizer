"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewPaymentDialog({ open, onClose, onSuccess }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const clientIdValue = String(fd.get("clientId") ?? "");
    const amount = Number(String(fd.get("amount") ?? "0").replace(/\D/g, ""));
    const payload = {
      clientId: clientIdValue ? Number(clientIdValue) : null,
      type: String(fd.get("type") ?? "dp"),
      method: String(fd.get("method") ?? "transfer"),
      amount,
      paymentDate: String(fd.get("paymentDate") ?? ""),
      reference: String(fd.get("reference") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    try {
      await apiFetch("/api/payments", { body: payload });
      onSuccess?.();
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
      title="Record Payment"
      description="Catat pembayaran DP atau pelunasan"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-payment-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record Payment"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-payment-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" required className="sm:col-span-2">
          <Select name="clientId" required defaultValue="">
            <option value="" disabled>
              — Pilih client —
            </option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment Type" required>
          <Select name="type" required defaultValue="">
            <option value="" disabled>
              — Pilih tipe —
            </option>
            <option value="dp">Down Payment (DP)</option>
            <option value="installment">Installment</option>
            <option value="final">Pelunasan</option>
            <option value="vendor">Vendor Payment</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
        <Field label="Payment Method">
          <Select name="method" defaultValue="transfer">
            <option value="transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Credit Card</option>
            <option value="qris">QRIS</option>
          </Select>
        </Field>
        <Field label="Amount (Rp)" required>
          <Input name="amount" type="text" required placeholder="42500000" />
        </Field>
        <Field label="Payment Date" required>
          <Input name="paymentDate" type="date" required />
        </Field>
        <Field label="Reference / Receipt #" className="sm:col-span-2">
          <Input name="reference" placeholder="INV-2026-0001" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" placeholder="Catatan pembayaran..." />
        </Field>
      </form>
    </Dialog>
  );
}
