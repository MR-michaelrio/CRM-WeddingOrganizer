"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditDesignDialog } from "@/components/forms/edit-design-dialog";
import { ViewDesignDialog } from "@/components/forms/view-design-dialog";
import { useFetch } from "@/lib/use-fetch";
import { formatDateID } from "@/lib/format";
import type { DesignDTO } from "@/lib/types";

const statusTone = {
  approved: "success",
  pending: "warning",
  revision: "danger",
} as const;

const statusLabel = {
  approved: "Approved",
  pending: "Pending",
  revision: "Revision",
} as const;

export default function DesignUploadPage() {
  const { data, loading, error, refresh } =
    useFetch<DesignDTO[]>("/api/designs");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [view, setView] = useState<DesignDTO | null>(null);
  const [edit, setEdit] = useState<DesignDTO | null>(null);
  const [del, setDel] = useState<DesignDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filterStatus === "all") return data;
    return data.filter((d) => d.status === filterStatus);
  }, [data, filterStatus]);

  return (
    <div className="p-8">
      <PageHeader
        title="Design Upload"
        subtitle="Manage design files and client approvals"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <DialogTrigger kind="design" onSuccess={refresh} />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="btn btn-secondary"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="revision">Revision</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-ink-light">Loading designs…</div>}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {filtered.map((design) => (
          <div
            key={design.id}
            className="card-base relative p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-hover"
          >
            <div className="absolute right-3 top-3 z-10">
              <RowActions
                onView={() => setView(design)}
                onEdit={() => setEdit(design)}
                onDelete={() => setDel(design)}
              />
            </div>
            <button
              type="button"
              onClick={() => setView(design)}
              className="block w-full text-left"
            >
              <div className="mb-4 flex h-44 items-center justify-center rounded-md bg-cream text-6xl">
                {design.thumbnail ?? "🎨"}
              </div>
              <h4 className="mb-2 pr-8 text-base font-semibold text-ink">{design.name}</h4>
              <div className="mb-3 text-[13px] text-ink-light">
                💍 {design.client?.names ?? "—"}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-light">
                  {formatDateID(design.uploadedAt)}
                </span>
                <Badge tone={statusTone[design.status]}>{statusLabel[design.status]}</Badge>
              </div>
            </button>
          </div>
        ))}
      </div>

      {view && <ViewDesignDialog open onClose={() => setView(null)} design={view} />}
      {edit && (
        <EditDesignDialog
          open
          onClose={() => setEdit(null)}
          design={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/designs/${del.id}`}
          title={`Delete design "${del.name}"?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
