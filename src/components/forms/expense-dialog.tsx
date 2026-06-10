"use client";

import { useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO, VendorDTO } from "@/lib/types";

export const EXPENSE_CATEGORIES = [
  "Vendor",
  "Photographer",
  "Dekorasi",
  "Transport",
  "Operasional",
  "Perlengkapan",
  "Konsumsi",
  "Lainnya",
];

export const EXPENSE_METHODS = ["transfer", "cash", "card", "qris"] as const;

export type ExpenseForEdit = {
  id: number;
  date: string;
  category: string;
  amount: string | number;
  method: string;
  vendor: string;
  clientId: number | null;
  description: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  expense?: ExpenseForEdit;
};

function parseCurrency(s: string): number {
  return Number(s.replace(/\D/g, "")) || 0;
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function ExpenseDialog({ open, onClose, onSuccess, expense }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const { data: vendors } = useFetch<VendorDTO[]>("/api/vendors");
  const [date, setDate] = useState<string>(
    expense?.date ? expense.date.slice(0, 10) : todayISO()
  );
  const [category, setCategory] = useState<string>(
    expense?.category ?? EXPENSE_CATEGORIES[0]
  );
  const [amount, setAmount] = useState<string>(
    expense ? String(Math.round(Number(expense.amount))) : ""
  );
  const [method, setMethod] = useState<string>(expense?.method ?? "transfer");
  const [vendor, setVendor] = useState<string>(expense?.vendor ?? "");
  const [clientId, setClientId] = useState<string>(
    expense?.clientId ? String(expense.clientId) : ""
  );
  const [description, setDescription] = useState<string>(expense?.description ?? "");
  const [status, setStatus] = useState<string>(expense?.status ?? "draft");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(
    expense?.attachmentUrl ?? null
  );
  const [attachmentName, setAttachmentName] = useState<string | null>(
    expense?.attachmentName ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/expense", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        url?: string;
        filename?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload gagal");
      }
      setAttachmentUrl(data.url);
      setAttachmentName(data.filename ?? file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentName(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const amt = parseCurrency(amount);
    if (!date) {
      setError("Tanggal pengeluaran wajib diisi");
      return;
    }
    if (!vendor.trim()) {
      setError("Vendor / penerima wajib diisi");
      return;
    }
    if (amt <= 0) {
      setError("Nominal harus > 0");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        date,
        category,
        amount: amt,
        method,
        vendor: vendor.trim(),
        clientId: clientId ? Number(clientId) : null,
        description: description.trim() || null,
        attachmentUrl,
        attachmentName,
        status,
      };
      if (expense) {
        await apiFetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch("/api/expenses", { method: "POST", body });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const isPdf = attachmentUrl?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={expense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
      description={
        expense
          ? "Ubah detail pengeluaran. Untuk membatalkan, gunakan tombol Void."
          : "Catat pengeluaran operasional atau yang berhubungan dengan client."
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          {error && <span className="mr-auto text-xs text-danger">{error}</span>}
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={submitting || uploading}
            className="btn btn-primary"
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      }
    >
      <form
        id="expense-form"
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Tanggal Pengeluaran" required>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Kategori" required>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nominal" required>
          <Input
            type="text"
            inputMode="numeric"
            value={amount ? Number(amount).toLocaleString("id-ID") : ""}
            onChange={(e) => setAmount(String(parseCurrency(e.target.value)))}
            placeholder="0"
            required
          />
        </Field>
        <Field label="Metode Pembayaran">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {EXPENSE_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Vendor / Penerima"
          required
          hint="Pilih dari daftar vendor, atau ketik manual kalau belum terdaftar."
          className="sm:col-span-2"
        >
          <Combobox
            value={vendor}
            onChange={setVendor}
            options={(vendors ?? []).map((v) => ({
              value: v.name,
              label: v.name,
              description: v.category,
            }))}
            placeholder="Cari atau ketik nama vendor..."
            required
          />
        </Field>
        <Field
          label="Client (opsional)"
          hint="Kosongkan untuk pengeluaran operasional umum."
          className="sm:col-span-2"
        >
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— Tidak berhubungan dengan client —</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.names} · {c.eventType}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={status === "void"}
          >
            <option value="draft">Draft</option>
            <option value="paid">Paid</option>
            {status === "void" && <option value="void">Void</option>}
          </Select>
        </Field>
        <Field label="Catatan / Deskripsi" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detail tambahan (opsional)"
            rows={3}
          />
        </Field>
        <Field label="Bukti Pembayaran" className="sm:col-span-2">
          {attachmentUrl ? (
            <div className="flex items-center gap-3 rounded-md border border-line bg-cream/30 px-3 py-2">
              {isPdf ? (
                <FileText className="h-5 w-5 text-ink-light" />
              ) : (
                <ImageIcon className="h-5 w-5 text-ink-light" />
              )}
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-semibold text-ink hover:underline"
              >
                {attachmentName ?? attachmentUrl}
              </a>
              <button
                type="button"
                onClick={clearAttachment}
                className="text-ink-light hover:text-danger"
                aria-label="Hapus bukti"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="expense-attachment"
              />
              <label
                htmlFor="expense-attachment"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-beige"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Mengupload..." : "Upload JPG/PNG/PDF"}
              </label>
              <span className="text-xs text-ink-light">Maks 5 MB</span>
            </div>
          )}
        </Field>
      </form>
    </Dialog>
  );
}
