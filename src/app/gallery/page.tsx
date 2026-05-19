"use client";

import { useMemo, useState } from "react";
import { Search, Camera, Upload, Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/page-loader";
import { Badge } from "@/components/ui/badge";
import { ViewAlbumDialog } from "@/components/forms/view-album-dialog";
import { UploadGalleryDialog } from "@/components/forms/upload-gallery-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";
import { formatDateID } from "@/lib/format";

const categories = ["All", "Wedding", "Sangjit", "Engagement", "Other"] as const;

function coverFor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("sangjit") && t.includes("wedding")) return "✨";
  if (t.includes("sangjit")) return "🎁";
  if (t.includes("engagement")) return "💖";
  if (t.includes("wedding")) return "💐";
  return "📸";
}

export default function GalleryPage() {
  const { data: clients, loading, refresh } = useFetch<ClientDTO[]>("/api/clients");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [viewing, setViewing] = useState<ClientDTO | null>(null);
  const [uploading, setUploading] = useState(false);

  const albums = useMemo(
    () => (clients ?? []).filter((c) => c.status === "completed" || c.progress === 100),
    [clients]
  );

  const filtered = albums.filter((a) => {
    const matchQ =
      a.names.toLowerCase().includes(query.toLowerCase()) ||
      (a.venue ?? "").toLowerCase().includes(query.toLowerCase());
    const matchCat = category === "All" || a.eventType.includes(category);
    return matchQ && matchCat;
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Gallery"
        subtitle="Portfolio & documentation dari event yang sudah selesai"
        action={
          <button onClick={() => setUploading(true)} className="btn btn-primary">
            <Upload className="h-4 w-4" />
            Upload Photos
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-base flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-light text-gold-dark">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-ink">{albums.length}</div>
            <div className="text-xs text-ink-light">Completed Events</div>
          </div>
        </div>
        <div className="card-base flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-light text-gold-dark">
            💐
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-ink">
              {albums.filter((a) => a.eventType.includes("Wedding")).length}
            </div>
            <div className="text-xs text-ink-light">Weddings</div>
          </div>
        </div>
        <div className="card-base flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-light text-gold-dark">
            🎁
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-ink">
              {albums.filter((a) => a.eventType.includes("Sangjit")).length}
            </div>
            <div className="text-xs text-ink-light">Sangjit Events</div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client or venue..."
            className="w-full rounded-md border border-line bg-card py-3 pl-11 pr-4 text-sm outline-none placeholder:text-ink-light focus:border-gold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-sm border px-4 py-2 text-sm font-semibold transition-colors ${
                category === c
                  ? "border-gold bg-gold-light text-gold-dark"
                  : "border-line bg-card text-ink-medium hover:border-gold/50 hover:bg-cream"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <PageLoader label="Loading albums…" />}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {filtered.map((album) => (
          <button
            key={album.id}
            type="button"
            onClick={() => setViewing(album)}
            className="card-base group cursor-pointer overflow-hidden p-0 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-hover"
          >
            <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-gold-light to-beige text-6xl">
              {coverFor(album.eventType)}
            </div>
            <div className="p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h4 className="font-serif text-base font-semibold text-ink">
                  {album.names}
                </h4>
                <Badge tone="gold">{album.eventType}</Badge>
              </div>
              <div className="text-xs text-ink-light">
                {album.venue ?? "—"} · {formatDateID(album.eventDate)}
              </div>
              {album.galleryUrl && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold-dark">
                  <Link2 className="h-3 w-3" />
                  Drive linked
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="card-base px-10 py-16 text-center">
          <Camera className="mx-auto mb-4 h-12 w-12 text-ink-light" />
          <h3 className="mb-2 text-lg font-semibold text-ink">
            Belum ada album yang cocok
          </h3>
          <p className="text-sm text-ink-light">
            Coba ubah filter atau search, atau selesaikan event untuk menambahkannya ke
            gallery.
          </p>
        </div>
      )}

      {viewing && (
        <ViewAlbumDialog
          open
          onClose={() => setViewing(null)}
          album={viewing}
          cover={coverFor(viewing.eventType)}
          onUpdated={() => {
            refresh();
            setViewing(null);
          }}
        />
      )}

      {uploading && (
        <UploadGalleryDialog
          open
          onClose={() => setUploading(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
