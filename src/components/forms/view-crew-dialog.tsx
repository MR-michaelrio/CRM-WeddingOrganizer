"use client";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { CrewDTO } from "@/lib/types";
import { formatIDR } from "@/lib/format";
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
    </Dialog>
  );
}
