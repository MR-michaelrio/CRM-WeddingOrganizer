"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO, PaymentDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  payment: PaymentDTO;
};

function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function EditPaymentDialog({ open, onClose, onSuccess, payment }: Props) {
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
      reference: String(fd.get("reference") ?? "") || null,
      notes: String(fd.get("notes") ?? "") || null,
    };
    try {
      await apiFetch(`/api/payments/${payment.id}`, { method: "PATCH", body: payload });
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
      title="Edit Payment"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-payment-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="edit-payment-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" className="sm:col-span-2">
          <Select name="clientId" defaultValue={payment.clientId ?? ""}>
            <option value="">— None —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment Type">
          <Select name="type" defaultValue={payment.type}>
            <option value="dp">Down Payment (DP)</option>
            <option value="installment">Installment</option>
            <option value="final">Pelunasan</option>
            <option value="vendor">Vendor Payment</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
        <Field label="Method">
          <Select name="method" defaultValue={payment.method}>
            <option value="transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Credit Card</option>
            <option value="qris">QRIS</option>
          </Select>
        </Field>
        <Field label="Amount (Rp)" required>
          <Input
            name="amount"
            type="text"
            required
            defaultValue={String(Math.round(Number(payment.amount)))}
          />
        </Field>
        <Field label="Payment Date" required>
          <Input
            name="paymentDate"
            type="date"
            required
            defaultValue={toDateInput(payment.paymentDate)}
          />
        </Field>
        <Field label="Reference" className="sm:col-span-2">
          <Input name="reference" defaultValue={payment.reference ?? ""} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={payment.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
