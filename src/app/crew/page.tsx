"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, Star } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditCrewDialog } from "@/components/forms/edit-crew-dialog";
import { ViewCrewDialog } from "@/components/forms/view-crew-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { CrewDTO } from "@/lib/types";
import { initials } from "@/lib/utils";

export default function CrewPage() {
  const { data, loading, error, refresh } = useFetch<CrewDTO[]>("/api/crew");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [view, setView] = useState<CrewDTO | null>(null);
  const [edit, setEdit] = useState<CrewDTO | null>(null);
  const [del, setDel] = useState<CrewDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filterStatus === "all") return data;
    return data.filter((c) => c.status === filterStatus);
  }, [data, filterStatus]);

  return (
    <div className="p-8">
      <PageHeader title="Crew Management" subtitle="Schedule and manage your team" />

      <div className="mb-6 flex flex-wrap gap-3">
        <DialogTrigger kind="crew" onSuccess={refresh} />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="btn btn-secondary"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="scheduled">Scheduled</option>
          <option value="off_duty">Off Duty</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-ink-light">Loading crew…</div>}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {filtered.map((member) => (
          <div key={member.id} className="card-base relative p-6">
            <div className="absolute right-3 top-3">
              <RowActions
                onView={() => setView(member)}
                onEdit={() => setEdit(member)}
                onDelete={() => setDel(member)}
              />
            </div>
            <button
              type="button"
              onClick={() => setView(member)}
              className="block w-full text-left"
            >
              <div className="mb-4 flex items-start gap-3 pr-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-light text-base font-semibold text-gold-dark">
                  {initials(member.name)}
                </div>
                <div className="flex-1">
                  <h4 className="mb-1 text-base font-semibold text-ink">{member.name}</h4>
                  <div className="mb-2 text-[13px] text-ink-light">{member.role}</div>
                  <Badge tone={member.status === "available" ? "success" : "warning"}>
                    {member.status === "available" ? "Available" : "Scheduled"}
                  </Badge>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-1.5 border-b border-line pb-4">
                {member.phone && (
                  <div className="flex items-center gap-2 text-[13px] text-ink-medium">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-[13px] text-ink-medium">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-semibold text-ink">{member.rating}</span>
                </div>
                <span className="text-[13px] text-ink-light">
                  {member.projects} events
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {view && <ViewCrewDialog open onClose={() => setView(null)} crew={view} />}
      {edit && (
        <EditCrewDialog
          open
          onClose={() => setEdit(null)}
          crew={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/crew/${del.id}`}
          title={`Delete crew "${del.name}"?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
