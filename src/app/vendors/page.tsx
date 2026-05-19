"use client";

import { useMemo, useState } from "react";
import { Handshake, Phone, Star, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditVendorDialog } from "@/components/forms/edit-vendor-dialog";
import { ViewVendorDialog } from "@/components/forms/view-vendor-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { VendorDTO } from "@/lib/types";

export default function VendorsPage() {
  const { data, loading, error, refresh } =
    useFetch<VendorDTO[]>("/api/vendors");

  const [filterCat, setFilterCat] = useState<string>("all");
  const [view, setView] = useState<VendorDTO | null>(null);
  const [edit, setEdit] = useState<VendorDTO | null>(null);
  const [del, setDel] = useState<VendorDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filterCat === "all") return data;
    return data.filter((v) => v.category === filterCat);
  }, [data, filterCat]);

  return (
    <div className="p-8">
      <PageHeader
        title="Vendor Management"
        subtitle="Your trusted vendor database"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <DialogTrigger kind="vendor" onSuccess={refresh} />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="btn btn-secondary"
        >
          <option value="all">All Categories</option>
          <option>Catering</option>
          <option>Make Up Artist</option>
          <option>Master of Ceremony</option>
          <option>Lighting & Sound</option>
          <option>Florist</option>
          <option>Photography</option>
          <option>Videography</option>
          <option>Wedding Cake</option>
          <option>Rental</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-ink-light">Loading vendors…</div>}

      {!loading && filtered.length === 0 && (
        <div className="card-base p-10 text-center text-sm text-ink-light">
          {filterCat === "all"
            ? "Belum ada vendor. Klik 'Add Vendor' untuk menambahkan."
            : "Tidak ada vendor di kategori ini."}
        </div>
      )}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {filtered.map((vendor) => (
          <div key={vendor.id} className="card-base relative p-6">
            <div className="absolute right-3 top-3">
              <RowActions
                onView={() => setView(vendor)}
                onEdit={() => setEdit(vendor)}
                onDelete={() => setDel(vendor)}
              />
            </div>
            <button
              type="button"
              onClick={() => setView(vendor)}
              className="block w-full text-left"
            >
              <div className="mb-4 flex items-start gap-3 pr-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gold-light text-gold-dark">
                  <Handshake className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="mb-1 text-base font-semibold text-ink">{vendor.name}</h4>
                  <Badge tone="gold">{vendor.category}</Badge>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-2">
                {vendor.contact && (
                  <div className="flex items-center gap-2 text-sm text-ink-medium">
                    <User className="h-4 w-4" />
                    {vendor.contact}
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm text-ink-medium">
                    <Phone className="h-4 w-4" />
                    {vendor.phone}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="text-base font-semibold text-ink">{vendor.rating}</span>
                </div>
                <span className="text-[13px] text-ink-light">
                  {vendor.projects} projects
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {view && <ViewVendorDialog open onClose={() => setView(null)} vendor={view} />}
      {edit && (
        <EditVendorDialog
          open
          onClose={() => setEdit(null)}
          vendor={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/vendors/${del.id}`}
          title={`Delete "${del.name}"?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
