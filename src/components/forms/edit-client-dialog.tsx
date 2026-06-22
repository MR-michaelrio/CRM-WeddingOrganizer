"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { MultiSelect, parseJenisBakiList } from "@/components/ui/multi-select";
import { BakiWarningDialog } from "@/components/forms/baki-warning-dialog";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";

type PackageOption = { id: number; name: string; price: string };

type EditClientPayload = {
  names: string;
  email: string | null;
  phone: string | null;
  eventType: string;
  eventDate: string;
  venue: string | null;
  package: string;
  jenisBaki: string | null;
  contractValue: number | null;
  status: string;
  eventStatus: string;
  progress: number;
  notes: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  client: ClientDTO;
};

function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function EditClientDialog({ open, onClose, onSuccess, client }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bakiWarning, setBakiWarning] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<EditClientPayload | null>(null);
  const { data: packages } = useFetch<PackageOption[]>("/api/packages");
  const { data: settings } = useFetch<{ defaultJenisBaki: string | null }>(
    "/api/settings"
  );
  const jenisBakiOptions = Array.from(
    new Set([
      ...parseJenisBakiList(settings?.defaultJenisBaki),
      ...parseJenisBakiList(client.jenisBaki),
    ])
  );

  const closeWarning = () => {
    setBakiWarning(null);
    setPendingPayload(null);
  };

  const submitPayload = async (payload: EditClientPayload) => {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/clients/${client.id}`, { method: "PATCH", body: payload });
      onSuccess?.();
      onClose();
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
    const contractValue = Number(
      String(fd.get("contractValue") ?? "0").replace(/\D/g, "")
    );

    const payload: EditClientPayload = {
      names: String(fd.get("names") ?? "").trim(),
      email: String(fd.get("email") ?? "") || null,
      phone: String(fd.get("phone") ?? "") || null,
      eventType: String(fd.get("eventType") ?? ""),
      eventDate: String(fd.get("eventDate") ?? ""),
      venue: String(fd.get("venue") ?? "") || null,
      package: String(fd.get("package") ?? ""),
      jenisBaki: String(fd.get("jenisBaki") ?? "") || null,
      contractValue: contractValue || null,
      status: String(fd.get("status") ?? "active"),
      eventStatus: String(fd.get("eventStatus") ?? "confirmed"),
      progress: Number(fd.get("progress") ?? 0),
      notes: String(fd.get("notes") ?? "") || null,
    };

    // Cek konflik jenis baki di hari sangjit yang sama / berselisih 1 hari.
    if (payload.jenisBaki && payload.eventDate) {
      try {
        const params = new URLSearchParams({
          date: payload.eventDate,
          jenisBaki: payload.jenisBaki,
          eventType: payload.eventType,
          excludeId: String(client.id),
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
      title="Edit Client"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-client-form"
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
      <form id="edit-client-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Couple Name" required className="sm:col-span-2">
          <Input name="names" required defaultValue={client.names} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={client.email ?? ""} />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" defaultValue={client.phone ?? ""} />
        </Field>
        <Field label="Event Type" required>
          <Select name="eventType" required defaultValue={client.eventType}>
            <option>Sangjit Only</option>
            <option>Wedding Only</option>
            <option>Sangjit &amp; Wedding</option>
            <option>Engagement</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Event Date" required>
          <Input
            name="eventDate"
            type="date"
            required
            defaultValue={toDateInput(client.eventDate)}
          />
        </Field>
        <Field label="Venue" className="sm:col-span-2">
          <Input name="venue" defaultValue={client.venue ?? ""} />
        </Field>
        <Field label="Package" hint="Kelola daftar paket di Settings → Packages">
          <Select name="package" defaultValue={client.package ?? ""}>
            <option value="">— Pilih paket —</option>
            {client.package &&
              !(packages ?? []).some((p) => p.name === client.package) && (
                <option value={client.package}>{client.package} (legacy)</option>
              )}
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
            defaultValue={parseJenisBakiList(client.jenisBaki)}
            placeholder="— Pilih jenis baki —"
          />
        </Field>
        <Field label="Contract Value (Rp)">
          <Input
            name="contractValue"
            defaultValue={
              client.contractValue ? String(Math.round(Number(client.contractValue))) : ""
            }
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={client.status}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Event Status">
          <Select name="eventStatus" defaultValue={client.eventStatus}>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="inquiry">Inquiry</option>
          </Select>
        </Field>
        <Field label={`Progress (${client.progress}%)`} className="sm:col-span-2">
          <Input
            name="progress"
            type="number"
            min={0}
            max={100}
            defaultValue={client.progress}
          />
        </Field>
        <Field label="Internal Notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={client.notes ?? ""} />
        </Field>
      </form>
    </Dialog>
  );
}
