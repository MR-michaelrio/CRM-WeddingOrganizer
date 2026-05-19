"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";
import type { CrewDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  crew: CrewDTO;
};

export function EditCrewDialog({ open, onClose, onSuccess, crew }: Props) {
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
      phone: String(fd.get("phone") ?? "") || null,
      email: String(fd.get("email") ?? "") || null,
      defaultFee: fee || null,
    };
    try {
      await apiFetch(`/api/crew/${crew.id}`, { method: "PATCH", body: payload });
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
      title="Edit Crew Member"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-crew-form"
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
      <form id="edit-crew-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required className="sm:col-span-2">
          <Input name="name" required defaultValue={crew.name} />
        </Field>
        <Field label="Role" required>
          <Select name="role" required defaultValue={crew.role}>
            <option>Decoration Lead</option>
            <option>Setup Crew</option>
            <option>Lighting Technician</option>
            <option>Event Coordinator</option>
            <option>Technical Manager</option>
            <option>Logistics</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={crew.status}>
            <option value="available">Available</option>
            <option value="scheduled">Scheduled</option>
            <option value="off_duty">Off Duty</option>
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" defaultValue={crew.phone ?? ""} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={crew.email ?? ""} />
        </Field>
        <Field label="Default Fee per Event (Rp)" className="sm:col-span-2">
          <Input
            name="defaultFee"
            defaultValue={crew.defaultFee ? String(Math.round(Number(crew.defaultFee))) : ""}
          />
        </Field>
      </form>
    </Dialog>
  );
}
