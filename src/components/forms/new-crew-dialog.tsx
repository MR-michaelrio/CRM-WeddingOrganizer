"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewCrewDialog({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const fee = Number(String(fd.get("defaultFee") ?? "0").replace(/\D/g, ""));
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      role: String(fd.get("role") ?? ""),
      status: String(fd.get("status") ?? "available"),
      phone: String(fd.get("phone") ?? "") || undefined,
      email: String(fd.get("email") ?? "") || undefined,
      defaultFee: fee || undefined,
    };
    try {
      await apiFetch("/api/crew", { body: payload });
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
      title="Add Crew Member"
      description="Tambah anggota tim baru"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-crew-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add Crew"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-crew-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required className="sm:col-span-2">
          <Input name="name" required placeholder="e.g. Budi Santoso" />
        </Field>
        <Field label="Role" required>
          <Select name="role" required defaultValue="">
            <option value="" disabled>
              — Pilih role —
            </option>
            <option>Decoration Lead</option>
            <option>Setup Crew</option>
            <option>Lighting Technician</option>
            <option>Event Coordinator</option>
            <option>Technical Manager</option>
            <option>Logistics</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="available">
            <option value="available">Available</option>
            <option value="scheduled">Scheduled</option>
            <option value="off_duty">Off Duty</option>
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" placeholder="0812-1111-1111" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" placeholder="crew@email.com" />
        </Field>
        <Field label="Default Fee per Event (Rp)" className="sm:col-span-2">
          <Input name="defaultFee" placeholder="500000" />
        </Field>
      </form>
    </Dialog>
  );
}
