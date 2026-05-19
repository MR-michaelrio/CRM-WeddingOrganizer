"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";

type PackageOption = { id: number; name: string; price: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewClientDialog({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: packages } = useFetch<PackageOption[]>("/api/packages");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      names: String(fd.get("names") ?? "").trim(),
      email: String(fd.get("email") ?? "") || undefined,
      phone: String(fd.get("phone") ?? "") || undefined,
      eventType: String(fd.get("eventType") ?? ""),
      eventDate: String(fd.get("eventDate") ?? ""),
      venue: String(fd.get("venue") ?? "") || undefined,
      package: String(fd.get("package") ?? ""),
      contractValue: Number(String(fd.get("contractValue") ?? "0").replace(/\D/g, "")) || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };

    try {
      await apiFetch("/api/clients", { body: payload });
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
      title="New Client"
      description="Tambah pasangan baru ke database"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-client-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Client"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-client-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Couple Name" required className="sm:col-span-2">
          <Input name="names" required placeholder="e.g. Michael & Felicia" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" placeholder="couple@email.com" />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" placeholder="0812-3456-7890" />
        </Field>
        <Field label="Event Type" required>
          <Select name="eventType" required defaultValue="">
            <option value="" disabled>
              — Pilih —
            </option>
            <option>Sangjit Only</option>
            <option>Wedding Only</option>
            <option>Sangjit &amp; Wedding</option>
            <option>Engagement</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Event Date" required>
          <Input name="eventDate" type="date" required />
        </Field>
        <Field label="Venue" className="sm:col-span-2">
          <Input name="venue" placeholder="Grand Ballroom Hotel Mulia" />
        </Field>
        <Field label="Package" hint="Kelola daftar paket di Settings → Packages">
          <Select name="package" defaultValue="">
            <option value="">— Pilih paket —</option>
            {(packages ?? []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contract Value (Rp)">
          <Input name="contractValue" type="text" placeholder="85000000" />
        </Field>
        <Field label="Internal Notes" className="sm:col-span-2">
          <Textarea name="notes" placeholder="Catatan internal mengenai client..." />
        </Field>
      </form>
    </Dialog>
  );
}
