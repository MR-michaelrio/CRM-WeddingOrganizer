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

export function NewItemDialog({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const quantity = Number(fd.get("quantity") ?? 0);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      category: String(fd.get("category") ?? ""),
      quantity,
      available: quantity,
      unit: String(fd.get("unit") ?? "pcs"),
      condition: String(fd.get("condition") ?? "Good"),
      location: String(fd.get("location") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    try {
      await apiFetch("/api/inventory", { body: payload });
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
      title="Add Inventory Item"
      description="Tambah item dekorasi atau peralatan"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-item-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Item"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-item-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Item Name" required className="sm:col-span-2">
          <Input name="name" required placeholder="e.g. Gold Chiavari Chairs" />
        </Field>
        <Field label="Category" required>
          <Select name="category" required defaultValue="">
            <option value="" disabled>
              — Pilih —
            </option>
            <option>Furniture</option>
            <option>Lighting</option>
            <option>Decoration</option>
            <option>Structure</option>
            <option>Fabric</option>
            <option>Props</option>
          </Select>
        </Field>
        <Field label="Condition">
          <Select name="condition" defaultValue="Good">
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>NeedsRepair</option>
          </Select>
        </Field>
        <Field label="Total Quantity" required>
          <Input name="quantity" type="number" min={1} required placeholder="200" />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue="pcs">
            <option value="pcs">pcs</option>
            <option value="sets">sets</option>
            <option value="panels">panels</option>
            <option value="units">units</option>
            <option value="meters">meters</option>
          </Select>
        </Field>
        <Field label="Warehouse Location" className="sm:col-span-2">
          <Input name="location" placeholder="e.g. Warehouse A — Rack 3" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" placeholder="Catatan tambahan..." />
        </Field>
      </form>
    </Dialog>
  );
}
