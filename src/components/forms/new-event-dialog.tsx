"use client";

import { useState } from "react";
import { Video, Copy, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
};

type GoogleStatus = {
  connected: boolean;
  email: string | null;
};

export function NewEventDialog({ open, onClose, onSuccess, defaultDate }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const { data: googleStatus } = useFetch<GoogleStatus>("/api/auth/google/status");
  const [type, setType] = useState<string>("meeting");
  const [meetLink, setMeetLink] = useState<string>("");
  const [createMeet, setCreateMeet] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleConnected = googleStatus?.connected ?? false;

  const handleCopy = () => {
    if (meetLink) navigator.clipboard.writeText(meetLink);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") ?? "");
    const start = String(fd.get("startTime") ?? "");
    const end = String(fd.get("endTime") ?? "");
    if (!date || !start) {
      setError("Tanggal & jam mulai wajib diisi");
      setSubmitting(false);
      return;
    }
    const clientIdValue = String(fd.get("clientId") ?? "");
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      type,
      startAt: `${date}T${start}:00`,
      endAt: end ? `${date}T${end}:00` : undefined,
      location: String(fd.get("location") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
      meetLink: !createMeet && meetLink ? meetLink : undefined,
      clientId: clientIdValue ? Number(clientIdValue) : null,
      createGoogleMeet: type === "meeting" && createMeet,
    };
    try {
      await apiFetch("/api/events", { body: payload });
      setMeetLink("");
      setCreateMeet(false);
      setType("meeting");
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
      title="New Event / Meeting"
      description="Bisa jadi meeting client, survey venue, loading dekor, bongkar, atau event utama"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="new-event-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting
              ? createMeet
                ? "Creating in Google Calendar…"
                : "Saving…"
              : "Create Event"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form id="new-event-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Event Title" required className="sm:col-span-2">
          <Input name="title" required placeholder="e.g. Meeting Final Rundown" />
        </Field>
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)} name="type">
            <option value="meeting">Meeting</option>
            <option value="survey">Survey Venue</option>
            <option value="wedding">Wedding (Hari-H)</option>
            <option value="sangjit">Sangjit</option>
            <option value="loading">Loading Dekor</option>
            <option value="bongkar">Bongkar Dekor</option>
          </Select>
        </Field>
        <Field label="Linked Client">
          <Select name="clientId" defaultValue="">
            <option value="">— None —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" required>
          <Input name="date" type="date" required defaultValue={defaultDate ?? ""} />
        </Field>
        <Field label="Start Time" required>
          <Input name="startTime" type="time" required defaultValue="10:00" />
        </Field>
        <Field label="End Time">
          <Input name="endTime" type="time" defaultValue="11:00" />
        </Field>
        <Field label="Location" className="sm:col-span-2">
          <Input name="location" placeholder="Office / Hotel Mulia / Online" />
        </Field>

        {type === "meeting" && (
          <div className="sm:col-span-2">
            {googleConnected ? (
              <div className="rounded-md border border-gold/40 bg-gold/5 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={createMeet}
                    onChange={(e) => setCreateMeet(e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-gold-dark"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <Video className="h-4 w-4 text-gold-dark" />
                      Create Google Meet automatically
                    </div>
                    <p className="mt-1 text-xs text-ink-light">
                      Event akan ter-create di Google Calendar{" "}
                      <strong className="text-ink-medium">
                        {googleStatus?.email}
                      </strong>{" "}
                      dan Meet link valid akan otomatis ter-generate.
                    </p>
                  </div>
                </label>

                {!createMeet && (
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-light">
                      Or paste existing Meet link
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        className="flex-1"
                      />
                      {meetLink && (
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="btn btn-secondary !px-3 text-xs"
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-line bg-cream p-4">
                <div className="mb-2 text-sm font-semibold text-ink">
                  Google Meet Link (manual)
                </div>
                <div className="flex gap-2">
                  <Input
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="flex-1"
                  />
                  {meetLink && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn btn-secondary !px-3 text-xs"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-ink-light">
                  💡 Untuk auto-create Meet link, connect Google Account dulu di{" "}
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-0.5 font-semibold text-gold-dark hover:underline"
                  >
                    Settings
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" placeholder="Agenda meeting, peserta, dll" />
        </Field>
      </form>
    </Dialog>
  );
}
