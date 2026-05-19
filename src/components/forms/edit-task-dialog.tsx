"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO, TaskDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  task: TaskDTO;
};

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function EditTaskDialog({ open, onClose, onSuccess, task }: Props) {
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
      status: String(fd.get("status") ?? "todo"),
      priority: String(fd.get("priority") ?? "medium"),
      dueDate: String(fd.get("dueDate") ?? "") || null,
      assignee: String(fd.get("assignee") ?? "") || null,
      notes: String(fd.get("notes") ?? "") || null,
      clientId: clientIdValue ? Number(clientIdValue) : null,
    };
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "PATCH", body: payload });
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
      title="Edit Task"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-task-form"
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
      <form id="edit-task-form" onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Task Title" required>
          <Input name="title" required defaultValue={task.title} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event">
            <Select name="clientId" defaultValue={task.clientId ?? ""}>
              <option value="">— None —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={task.category}>
              <option>Administration</option>
              <option>Sangjit</option>
              <option>Wedding</option>
              <option>Decoration</option>
              <option>Vendor</option>
              <option>Hari-H</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={task.status}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue={task.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Due Date">
            <Input name="dueDate" type="date" defaultValue={toDateInput(task.dueDate)} />
          </Field>
          <Field label="Assignee">
            <Input name="assignee" defaultValue={task.assignee ?? ""} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea name="notes" defaultValue={task.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
