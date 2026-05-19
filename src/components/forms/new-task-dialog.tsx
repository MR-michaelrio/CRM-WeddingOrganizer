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

export function NewTaskDialog({ open, onClose, onSuccess }: Props) {
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
      title: String(fd.get("title") ?? "").trim(),
      category: String(fd.get("category") ?? "Administration"),
      priority: String(fd.get("priority") ?? "medium"),
      dueDate: String(fd.get("dueDate") ?? "") || undefined,
      assignee: String(fd.get("assignee") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
      clientId: clientIdValue ? Number(clientIdValue) : null,
    };
    try {
      await apiFetch("/api/tasks", { body: payload });
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
      title="New Task"
      description="Tambahkan task baru ke checklist"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-task-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Create Task"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-task-form" onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Task Title" required>
          <Input name="title" required placeholder="e.g. Konfirmasi vendor catering" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event" required>
            <Select name="clientId" required defaultValue="">
              <option value="" disabled>
                — Pilih event —
              </option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue="Administration">
              <option>Administration</option>
              <option>Sangjit</option>
              <option>Wedding</option>
              <option>Decoration</option>
              <option>Vendor</option>
              <option>Hari-H</option>
            </Select>
          </Field>
          <Field label="Due Date">
            <Input name="dueDate" type="date" />
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Assignee" className="sm:col-span-2">
            <Input name="assignee" placeholder="Nama PIC" />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea name="notes" placeholder="Detail tambahan..." />
        </Field>
      </form>
    </Dialog>
  );
}
