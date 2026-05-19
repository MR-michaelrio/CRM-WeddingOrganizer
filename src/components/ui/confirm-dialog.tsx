"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/use-fetch";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary !bg-none !bg-danger hover:!bg-danger/90"
            style={{ background: "var(--danger)" }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-medium">
        Tindakan ini tidak bisa dibatalkan. Data terkait akan dihapus permanen.
      </p>
    </Dialog>
  );
}

type DeleteEndpointProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  endpoint: string;
  title: string;
  description?: string;
};

export function DeleteEndpointDialog({
  open,
  onClose,
  onSuccess,
  endpoint,
  title,
  description,
}: DeleteEndpointProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(endpoint, { method: "DELETE" });
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
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
            style={{ background: "var(--danger)" }}
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <p className="text-sm text-ink-medium">
        Tindakan ini tidak bisa dibatalkan. Data terkait akan dihapus permanen.
      </p>
    </Dialog>
  );
}
