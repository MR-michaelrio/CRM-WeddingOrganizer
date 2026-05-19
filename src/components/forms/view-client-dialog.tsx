"use client";

import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CrewAssignmentPanel } from "@/components/forms/crew-assignment-panel";
import type { ClientDTO } from "@/lib/types";
import { formatDateID, formatIDR } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  client: ClientDTO;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink">{value}</div>
    </div>
  );
}

export function ViewClientDialog({ open, onClose, client }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client.names}
      description={`${client.eventType} · ${formatDateID(client.eventDate)}`}
      size="lg"
      footer={
        <>
          <Link href={`/rundown/${client.id}`} className="btn btn-secondary">
            Open Workbook →
          </Link>
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Email" value={client.email ?? "—"} />
        <Row label="Phone" value={client.phone ?? "—"} />
        <Row label="Venue" value={client.venue ?? "—"} />
        <Row label="PIC" value={client.pic?.name ?? "—"} />
        <Row label="Package" value={<Badge tone="gold">{client.package ?? "—"}</Badge>} />
        <Row
          label="Contract Value"
          value={client.contractValue ? formatIDR(client.contractValue) : "—"}
        />
        <Row
          label="Status"
          value={
            <Badge
              tone={
                client.status === "completed"
                  ? "success"
                  : client.status === "active"
                  ? "warning"
                  : "neutral"
              }
            >
              {client.status}
            </Badge>
          }
        />
        <Row
          label="Event Status"
          value={
            <Badge
              tone={
                client.eventStatus === "confirmed"
                  ? "success"
                  : client.eventStatus === "pending"
                  ? "warning"
                  : "gold"
              }
            >
              {client.eventStatus}
            </Badge>
          }
        />
        <div className="sm:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
            Progress
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={client.progress} />
            <span className="text-sm font-semibold text-ink">{client.progress}%</span>
          </div>
        </div>
        {client.notes && (
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Internal Notes
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">
              {client.notes}
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <CrewAssignmentPanel clientId={client.id} />
        </div>
      </div>
    </Dialog>
  );
}
