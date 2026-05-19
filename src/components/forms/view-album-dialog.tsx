"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UploadGalleryDialog } from "@/components/forms/upload-gallery-dialog";
import type { ClientDTO } from "@/lib/types";
import { formatDateID, formatIDR } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  album: ClientDTO;
  cover: string;
  onUpdated?: () => void;
};

export function ViewAlbumDialog({ open, onClose, album, cover, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={album.names}
        description={`${album.eventType} · ${formatDateID(album.eventDate)}`}
        size="md"
        footer={
          <>
            <Link href={`/rundown/${album.id}`} className="btn btn-secondary">
              View Workbook
            </Link>
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </>
        }
      >
        <div className="mb-5 flex h-64 items-center justify-center rounded-md bg-gradient-to-br from-gold-light to-beige text-8xl">
          {cover}
        </div>

        <div className="mb-5 rounded-md border border-line bg-cream p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Gallery Drive Link
            </div>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
            >
              <Pencil className="h-3 w-3" />
              {album.galleryUrl ? "Edit" : "Add link"}
            </button>
          </div>
          {album.galleryUrl ? (
            <a
              href={album.galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 break-all text-sm text-ink hover:text-gold-dark"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{album.galleryUrl}</span>
            </a>
          ) : (
            <div className="text-sm italic text-ink-light">
              Belum ada link. Klik &quot;Add link&quot; untuk upload foto via Google
              Drive.
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Venue
            </div>
            <div className="text-sm text-ink">{album.venue ?? "—"}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Package
            </div>
            <div>
              <Badge tone="gold">{album.package ?? "—"}</Badge>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              Contract
            </div>
            <div className="text-sm text-ink">
              {album.contractValue ? formatIDR(album.contractValue) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
              PIC
            </div>
            <div className="text-sm text-ink">{album.pic?.name ?? "—"}</div>
          </div>
        </div>
      </Dialog>

      {editing && (
        <UploadGalleryDialog
          open
          album={album}
          onClose={() => setEditing(false)}
          onSuccess={() => {
            setEditing(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}
