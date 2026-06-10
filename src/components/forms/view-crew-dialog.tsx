"use client";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Clock, MapPin } from "lucide-react";
import type { CrewDTO } from "@/lib/types";
import { formatDateID, formatIDR } from "@/lib/format";
import { initials } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  crew: CrewDTO;
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

export function ViewCrewDialog({ open, onClose, crew }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={crew.name}
      description={crew.role}
      size="md"
      footer={
        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
      }
    >
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-light text-base font-semibold text-gold-dark">
          {initials(crew.name)}
        </div>
        <div>
          <div className="font-serif text-lg font-semibold text-ink">{crew.name}</div>
          <div className="text-sm text-ink-light">{crew.role}</div>
          <Badge tone={crew.status === "available" ? "success" : "warning"}>
            {crew.status === "available" ? "Available" : "Scheduled"}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Phone" value={crew.phone ?? "—"} />
        <Row label="Email" value={crew.email ?? "—"} />
        <Row
          label="Rating"
          value={
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {crew.rating}
            </span>
          }
        />
        <Row label="Total Projects" value={`${crew.projects} events`} />
        <Row
          label="Default Fee per Event"
          value={crew.defaultFee ? formatIDR(crew.defaultFee) : "—"}
        />
      </div>

      {crew.assignments && crew.assignments.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Assigned Events
            </div>
            <span className="rounded-full bg-gold-light px-2 py-0.5 text-[10px] font-bold text-gold-dark">
              {crew.assignments.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {crew.assignments.map((a) => (
              <li
                key={a.id}
                className="rounded-sm border border-line bg-cream/40 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">
                      {a.client.names}
                    </div>
                    <div className="text-[12px] text-ink-light">
                      {a.client.eventType}
                      {a.role && ` · ${a.role}`}
                    </div>
                  </div>
                  {a.fee && (
                    <div className="shrink-0 text-sm font-semibold text-ink">
                      {formatIDR(a.fee)}
                    </div>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateID(a.client.eventDate)}
                  </span>
                  {(a.startTime || a.endTime) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.startTime ?? "—"}
                      {a.endTime ? `–${a.endTime}` : ""}
                    </span>
                  )}
                  {a.client.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {a.client.venue}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
