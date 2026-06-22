"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { MultiSelect, parseJenisBakiList } from "@/components/ui/multi-select";
import { BakiWarningDialog } from "@/components/forms/baki-warning-dialog";
import { apiFetch, useFetch } from "@/lib/use-fetch";

type PackageOption = { id: number; name: string; price: string };

type ClientPayload = {
  names: string;
  email?: string;
  phone?: string;
  eventType: string;
  eventDate: string;
  venue?: string;
  package?: string;
  jenisBaki?: string;
  contractValue?: number;
  notes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewClientDialog({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bakiWarning, setBakiWarning] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<ClientPayload | null>(null);
  const { data: packages } = useFetch<PackageOption[]>("/api/packages");
  const { data: settings } = useFetch<{ defaultJenisBaki: string | null }>(
    "/api/settings"
  );
  const jenisBakiOptions = parseJenisBakiList(settings?.defaultJenisBaki);

  const closeWarning = () => {
    setBakiWarning(null);
    setPendingPayload(null);
  };

  const submitPayload = async (payload: ClientPayload) => {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/clients", { body: payload });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const payload: ClientPayload = {
      names: String(fd.get("names") ?? "").trim(),
      email: String(fd.get("email") ?? "") || undefined,
      phone: String(fd.get("phone") ?? "") || undefined,
      eventType: String(fd.get("eventType") ?? ""),
      eventDate: String(fd.get("eventDate") ?? ""),
      venue: String(fd.get("venue") ?? "") || undefined,
      package: String(fd.get("package") ?? ""),
      jenisBaki: String(fd.get("jenisBaki") ?? "") || undefined,
      contractValue: Number(String(fd.get("contractValue") ?? "0").replace(/\D/g, "")) || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };

    // Cek konflik jenis baki di hari sangjit yang sama / berselisih 1 hari.
    if (payload.jenisBaki && payload.eventDate) {
      try {
        const params = new URLSearchParams({
          date: payload.eventDate,
          jenisBaki: payload.jenisBaki,
          eventType: payload.eventType,
        });
        const conflicts = (await fetch(
          `/api/clients/baki-conflicts?${params}`
        ).then((r) => r.json())) as {
          sameDayMessage: string | null;
          adjacentMessage: string | null;
        };
        if (conflicts.sameDayMessage) {
          setError(conflicts.sameDayMessage);
          setSubmitting(false);
          return;
        }
        if (conflicts.adjacentMessage) {
          // Tampilkan peringatan sebagai pop-up; simpan menunggu konfirmasi.
          setPendingPayload(payload);
          setBakiWarning(conflicts.adjacentMessage);
          setSubmitting(false);
          return;
        }
      } catch {
        /* abaikan kegagalan cek; jangan blokir penyimpanan */
      }
    }

    await submitPayload(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Client"
      description="Tambah pasangan baru ke database"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-client-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Client"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <BakiWarningDialog
        message={bakiWarning}
        submitting={submitting}
        onCancel={closeWarning}
        onConfirm={() => {
          const payload = pendingPayload;
          setBakiWarning(null);
          setPendingPayload(null);
          if (payload) void submitPayload(payload);
        }}
      />
      <form id="new-client-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Couple Name" required className="sm:col-span-2">
          <Input name="names" required placeholder="e.g. Michael & Felicia" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" placeholder="couple@email.com" />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" placeholder="0812-3456-7890" />
        </Field>
        <Field label="Event Type" required>
          <Select name="eventType" required defaultValue="">
            <option value="" disabled>
              — Pilih —
            </option>
            <option>Sangjit Only</option>
            <option>Wedding Only</option>
            <option>Sangjit &amp; Wedding</option>
            <option>Engagement</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Event Date" required>
          <Input name="eventDate" type="date" required />
        </Field>
        <Field label="Venue" className="sm:col-span-2">
          <Input name="venue" placeholder="Grand Ballroom Hotel Mulia" />
        </Field>
        <Field label="Package" hint="Kelola daftar paket di Settings → Packages">
          <Select name="package" defaultValue="">
            <option value="">— Pilih paket —</option>
            {(packages ?? []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jenis Baki" hint="Bisa pilih lebih dari satu. Kelola pilihan di Settings.">
          <MultiSelect
            name="jenisBaki"
            options={jenisBakiOptions}
            placeholder="— Pilih jenis baki —"
          />
        </Field>
        <Field label="Contract Value (Rp)">
          <Input name="contractValue" type="text" placeholder="85000000" />
        </Field>
        <Field label="Internal Notes" className="sm:col-span-2">
          <Textarea name="notes" placeholder="Catatan internal mengenai client..." />
        </Field>
      </form>
    </Dialog>
  );
}
