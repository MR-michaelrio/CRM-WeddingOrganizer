"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";
import type { InventoryItemDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item: InventoryItemDTO;
};

export function EditItemDialog({ open, onClose, onSuccess, item }: Props) {
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
      quantity: Number(fd.get("quantity") ?? 0),
      available: Number(fd.get("available") ?? 0),
      unit: String(fd.get("unit") ?? "pcs"),
      condition: String(fd.get("condition") ?? "Good"),
      location: String(fd.get("location") ?? "") || null,
      notes: String(fd.get("notes") ?? "") || null,
    };
    try {
      await apiFetch(`/api/inventory/${item.id}`, { method: "PATCH", body: payload });
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
      title="Edit Inventory Item"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-item-form"
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
      <form id="edit-item-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Item Name" required className="sm:col-span-2">
          <Input name="name" required defaultValue={item.name} />
        </Field>
        <Field label="Category" required>
          <Select name="category" required defaultValue={item.category}>
            <option>Furniture</option>
            <option>Lighting</option>
            <option>Decoration</option>
            <option>Structure</option>
            <option>Fabric</option>
            <option>Props</option>
          </Select>
        </Field>
        <Field label="Condition">
          <Select name="condition" defaultValue={item.condition}>
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>NeedsRepair</option>
          </Select>
        </Field>
        <Field label="Total Quantity" required>
          <Input name="quantity" type="number" min={0} required defaultValue={item.quantity} />
        </Field>
        <Field label="Available">
          <Input
            name="available"
            type="number"
            min={0}
            defaultValue={item.available}
          />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue={item.unit}>
            <option value="pcs">pcs</option>
            <option value="sets">sets</option>
            <option value="panels">panels</option>
            <option value="units">units</option>
            <option value="meters">meters</option>
          </Select>
        </Field>
        <Field label="Warehouse Location">
          <Input name="location" defaultValue={item.location ?? ""} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={item.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
