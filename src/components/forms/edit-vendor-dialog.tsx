"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";
import type { VendorDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  vendor: VendorDTO;
};

export function EditVendorDialog({ open, onClose, onSuccess, vendor }: Props) {
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
      contact: String(fd.get("contact") ?? "") || null,
      phone: String(fd.get("phone") ?? "") || null,
      email: String(fd.get("email") ?? "") || null,
      portfolio: String(fd.get("portfolio") ?? "") || null,
      rating: Number(fd.get("rating") ?? 0) || 0,
      projects: Number(fd.get("projects") ?? 0) || 0,
      notes: String(fd.get("notes") ?? "") || null,
    };
    try {
      await apiFetch(`/api/vendors/${vendor.id}`, { method: "PATCH", body: payload });
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
      title="Edit Vendor"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-vendor-form"
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
      <form id="edit-vendor-form" onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Vendor Name" required>
          <Input name="name" required defaultValue={vendor.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <Select name="category" required defaultValue={vendor.category}>
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
            <Input name="contact" defaultValue={vendor.contact ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" type="tel" defaultValue={vendor.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={vendor.email ?? ""} />
          </Field>
          <Field label="Rating">
            <Input
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              defaultValue={vendor.rating}
            />
          </Field>
          <Field label="Projects Count">
            <Input
              name="projects"
              type="number"
              min="0"
              defaultValue={vendor.projects}
            />
          </Field>
        </div>
        <Field label="Portfolio / Website">
          <Input name="portfolio" defaultValue={vendor.portfolio ?? ""} />
        </Field>
        <Field label="Internal Notes">
          <Textarea name="notes" defaultValue={vendor.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
