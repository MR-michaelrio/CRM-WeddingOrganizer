"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // If provided, lock the client picker to this album.
  album?: ClientDTO;
};

function isLikelyUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function UploadGalleryDialog({ open, onClose, onSuccess, album }: Props) {
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");

  // Show all clients — gallery link bisa di-set kapan saja, tidak harus
  // menunggu event selesai.
  const albumOptions = useMemo(() => clients ?? [], [clients]);

  const [clientId, setClientId] = useState<string>(album ? String(album.id) : "");
  const [url, setUrl] = useState<string>(album?.galleryUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const id = Number(clientId);
    if (!id) {
      setError("Pilih client/album dulu");
      return;
    }
    const trimmed = url.trim();
    if (trimmed && !isLikelyUrl(trimmed)) {
      setError("URL tidak valid (harus diawali http:// atau https://)");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/clients/${id}`, {
        method: "PATCH",
        body: { galleryUrl: trimmed || null },
      });
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
      title="Upload Photos"
      description="Paste link Google Drive (atau folder cloud lain) ke album event."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="upload-gallery-form"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Link"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form
        id="upload-gallery-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Field
          label="Album / Client"
          required
          hint={album ? undefined : "Pilih client mana yang link Drive-nya mau diisi."}
        >
          {album ? (
            <Input value={album.names} disabled readOnly />
          ) : (
            <Select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Pilih album —</option>
              {albumOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names} · {c.eventType}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Drive Link"
          hint="Pastikan folder Drive sudah di-share (Anyone with the link → Viewer). Kosongkan untuk menghapus link."
        >
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
          />
        </Field>

        {url && isLikelyUrl(url.trim()) && (
          <a
            href={url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gold-dark hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview link
          </a>
        )}
      </form>
    </Dialog>
  );
}
