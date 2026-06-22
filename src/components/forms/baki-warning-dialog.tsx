"use client";

import { Dialog } from "@/components/ui/dialog";

type Props = {
  /** Pesan peringatan. Pop-up tampil saat tidak null. */
  message: string | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Pop-up peringatan ketika jenis baki dipakai pada hari berselisih 1 hari. */
export function BakiWarningDialog({ message, submitting, onCancel, onConfirm }: Props) {
  return (
    <Dialog
      open={!!message}
      onClose={onCancel}
      title="⚠️ Peringatan Jenis Baki"
      size="sm"
      footer={
        <>
          <button onClick={onCancel} className="btn btn-secondary" disabled={submitting}>
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Menyimpan…" : "Tetap Simpan"}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-medium">{message}</p>
    </Dialog>
  );
}
