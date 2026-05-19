"use client";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { DesignDTO } from "@/lib/types";
import { formatDateID } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  design: DesignDTO;
};

const statusTone = {
  approved: "success",
  pending: "warning",
  revision: "danger",
} as const;

export function ViewDesignDialog({ open, onClose, design }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={design.name}
      description={design.category}
      size="md"
      footer={
        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
      }
    >
      <div className="flex h-64 items-center justify-center rounded-md bg-cream text-8xl">
        {design.thumbnail ?? "🎨"}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
            Event
          </div>
          <div className="mt-1 text-sm text-ink">{design.client?.names ?? "—"}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
            Category
          </div>
          <div className="mt-1">
            <Badge tone="gold">{design.category}</Badge>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
            Status
          </div>
          <div className="mt-1">
            <Badge tone={statusTone[design.status]}>{design.status}</Badge>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
            Uploaded
          </div>
          <div className="mt-1 text-sm text-ink">{formatDateID(design.uploadedAt)}</div>
        </div>
        {design.notes && (
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Notes
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">
              {design.notes}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
