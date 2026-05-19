"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewVendorDialog({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      category: String(fd.get("category") ?? ""),
      contact: String(fd.get("contact") ?? "") || undefined,
      phone: String(fd.get("phone") ?? "") || undefined,
      email: String(fd.get("email") ?? "") || undefined,
      portfolio: String(fd.get("portfolio") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    try {
      await apiFetch("/api/vendors", { body: payload });
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
      title="Add Vendor"
      description="Tambah vendor baru ke database"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-vendor-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Vendor"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-vendor-form" onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Vendor Name" required>
          <Input name="name" required placeholder="e.g. Grand Catering Services" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <Select name="category" required defaultValue="">
              <option value="" disabled>
                — Pilih —
              </option>
              <option>Catering</option>
              <option>Make Up Artist</option>
              <option>Master of Ceremony</option>
              <option>Sound System</option>
              <option>Lighting & Sound</option>
              <option>Entertainment</option>
              <option>Photography</option>
              <option>Videography</option>
              <option>Florist</option>
              <option>Wedding Cake</option>
              <option>Rental</option>
            </Select>
          </Field>
          <Field label="Contact Person">
            <Input name="contact" placeholder="Nama kontak" />
          </Field>
          <Field label="Phone">
            <Input name="phone" type="tel" placeholder="0812-1111-2222" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" placeholder="vendor@email.com" />
          </Field>
        </div>
        <Field label="Portfolio / Website">
          <Input name="portfolio" placeholder="https://..." />
        </Field>
        <Field label="Internal Notes">
          <Textarea name="notes" placeholder="Catatan kerja sama..." />
        </Field>
      </form>
    </Dialog>
  );
}
