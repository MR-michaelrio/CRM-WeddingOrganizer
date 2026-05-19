"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO, DesignDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  design: DesignDTO;
};

export function EditDesignDialog({ open, onClose, onSuccess, design }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const clientIdValue = String(fd.get("clientId") ?? "");
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      category: String(fd.get("category") ?? "Backdrop"),
      status: String(fd.get("status") ?? "pending"),
      notes: String(fd.get("notes") ?? "") || null,
      clientId: clientIdValue ? Number(clientIdValue) : null,
    };
    try {
      await apiFetch(`/api/designs/${design.id}`, { method: "PATCH", body: payload });
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
      title="Edit Design"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-design-form"
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
      <form id="edit-design-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Design Name" required className="sm:col-span-2">
          <Input name="name" required defaultValue={design.name} />
        </Field>
        <Field label="Event">
          <Select name="clientId" defaultValue={design.clientId ?? ""}>
            <option value="">— None —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={design.category}>
            <option>Backdrop</option>
            <option>Ceiling</option>
            <option>Photobooth</option>
            <option>Stage</option>
            <option>Entrance</option>
            <option>Invitation</option>
            <option>Seat Plan</option>
          </Select>
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select name="status" defaultValue={design.status}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="revision">Revision</option>
          </Select>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={design.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
