"use client";

import { useState } from "react";
import { Video, MapPin, Trash2, ExternalLink, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import type { CalendarEventDTO } from "@/lib/types-extra";
import { formatDateLong } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  event: CalendarEventDTO;
  onSuccess?: () => void;
  onEdit?: () => void;
};

const typeTone: Record<string, "gold" | "success" | "warning" | "danger" | "neutral"> = {
  meeting: "gold",
  survey: "warning",
  wedding: "success",
  sangjit: "success",
  loading: "neutral",
  bongkar: "neutral",
};

function formatTimeRange(startAt: string, endAt: string | null) {
  const s = new Date(startAt);
  const start = s.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (!endAt) return start;
  const e = new Date(endAt);
  const end = e.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${start} — ${end}`;
}

export function ViewEventDialog({ open, onClose, event, onSuccess, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={event.title}
        description={formatDateLong(event.startAt)}
        size="md"
        footer={
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-secondary text-danger"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            {onEdit && (
              <button onClick={onEdit} className="btn btn-secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={typeTone[event.type] ?? "gold"}>
              {event.type.toUpperCase()}
            </Badge>
            <span className="text-sm font-medium text-ink-medium">
              🕐 {formatTimeRange(event.startAt, event.endAt)}
            </span>
          </div>

          {event.location && (
            <div className="flex items-start gap-2 text-sm text-ink">
              <MapPin className="mt-0.5 h-4 w-4 text-ink-light" />
              {event.location}
            </div>
          )}

          {event.client && (
            <div className="text-sm text-ink">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
                Client
              </span>
              <div className="mt-1 font-semibold">{event.client.names}</div>
            </div>
          )}

          {event.meetLink && (
            <div className="rounded-md border border-gold/40 bg-gold/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <Video className="h-4 w-4 text-gold-dark" />
                Google Meet Link
              </div>
              <a
                href={event.meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gold-dark hover:underline"
              >
                {event.meetLink}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {event.notes && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
                Notes
              </div>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">
                {event.notes}
              </p>
            </div>
          )}
        </div>
      </Dialog>

      <DeleteEndpointDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        endpoint={`/api/events/${event.id}`}
        title={`Delete "${event.title}"?`}
        onSuccess={() => {
          onSuccess?.();
          onClose();
        }}
      />
    </>
  );
}
