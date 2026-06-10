"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, Star, Calendar, MapPin, Clock } from "lucide-react";
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
import { formatDateID } from "@/lib/format";

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

            {member.assignments && member.assignments.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
                    Assigned Events
                  </div>
                  <span className="rounded-full bg-gold-light px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                    {member.assignments.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {member.assignments.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-sm border border-line bg-cream/40 px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-ink">
                        {a.client.names}
                      </div>
                      <div className="text-[12px] text-ink-light">
                        {a.client.eventType}
                        {a.role && ` · ${a.role}`}
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
