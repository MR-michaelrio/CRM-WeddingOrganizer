"use client";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { VendorDTO } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  vendor: VendorDTO;
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

export function ViewVendorDialog({ open, onClose, vendor }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={vendor.name}
      description={vendor.category}
      size="md"
      footer={
        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Category" value={<Badge tone="gold">{vendor.category}</Badge>} />
        <Row
          label="Rating"
          value={
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {vendor.rating}
            </span>
          }
        />
        <Row label="Contact Person" value={vendor.contact ?? "—"} />
        <Row label="Phone" value={vendor.phone ?? "—"} />
        <Row label="Email" value={vendor.email ?? "—"} />
        <Row label="Projects" value={`${vendor.projects} events`} />
        {vendor.portfolio && (
          <Row
            label="Portfolio"
            value={
              <a
                href={vendor.portfolio}
                target="_blank"
                rel="noreferrer"
                className="text-gold-dark hover:underline"
              >
                {vendor.portfolio}
              </a>
            }
          />
        )}
        {vendor.notes && (
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Notes
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">
              {vendor.notes}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
