"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function UploadDesignDialog({ open, onClose, onSuccess }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const category = String(fd.get("category") ?? "Backdrop");
    const thumbMap: Record<string, string> = {
      Backdrop: "🎨",
      Ceiling: "✨",
      Photobooth: "📸",
      Stage: "🎭",
      Entrance: "🏛️",
      Invitation: "💌",
      "Seat Plan": "📐",
    };
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      category,
      thumbnail: thumbMap[category] ?? "🎨",
      clientId: Number(fd.get("clientId") ?? 0) || null,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    try {
      await apiFetch("/api/designs", { body: payload });
      setFileName(null);
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
      title="Upload Design"
      description="Upload design dari Canva, PSD, atau file gambar"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="upload-design-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Uploading…" : "Upload"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="upload-design-form" onSubmit={handleSubmit} className="grid gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-line bg-cream py-10 transition-colors hover:border-gold hover:bg-gold/5"
        >
          <Upload className="h-8 w-8 text-gold-dark" />
          <div className="text-sm font-semibold text-ink">
            {fileName ?? "Click to upload file"}
          </div>
          <div className="text-xs text-ink-light">PNG, JPG, PDF up to 50MB</div>
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFileName(f.name);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Design Name" required className="sm:col-span-2">
            <Input name="name" required placeholder="e.g. Backdrop Design v2" />
          </Field>
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
            <Select name="category" defaultValue="Backdrop">
              <option>Backdrop</option>
              <option>Ceiling</option>
              <option>Photobooth</option>
              <option>Stage</option>
              <option>Entrance</option>
              <option>Invitation</option>
              <option>Seat Plan</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes for Client">
          <Textarea name="notes" placeholder="Mohon review design ini..." />
        </Field>
      </form>
    </Dialog>
  );
}
