"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Search, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";
import { formatDateID } from "@/lib/format";

type StatusFilter = "all" | "planning" | "active" | "completed";

export default function RundownListPage() {
  const { data, loading, error, refresh } =
    useFetch<ClientDTO[]>("/api/clients");
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "progress">("date");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    const result = data.filter((client) => {
      const matchQ =
        client.names.toLowerCase().includes(q) ||
        (client.venue ?? "").toLowerCase().includes(q) ||
        client.eventType.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || client.status === filterStatus;
      return matchQ && matchStatus;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "date")
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      if (sortBy === "name") return a.names.localeCompare(b.names);
      return b.progress - a.progress;
    });
  }, [data, query, filterStatus, sortBy]);

  return (
    <div className="p-8">
      <PageHeader
        title="Rundown Workbooks"
        subtitle="Pilih client untuk membuka workbook rundown"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client name, venue, or event type..."
            className="w-full rounded-md border border-line bg-card py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-ink-light focus:border-gold"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          className="btn btn-secondary min-w-[150px]"
        >
          <option value="all">All Status</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="btn btn-secondary min-w-[150px]"
        >
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="progress">Sort by Progress</option>
        </select>

        <DialogTrigger kind="workbook" onSuccess={refresh} />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-4 text-sm text-ink-light">
        {loading
          ? "Loading workbooks…"
          : `Showing ${filtered.length} of ${data?.length ?? 0} workbooks`}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="card-base px-10 py-16 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <h3 className="mb-2 text-lg font-semibold text-ink">No workbooks found</h3>
          <p className="text-sm text-ink-light">Try adjusting your search or filters</p>
        </div>
      )}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {filtered.map((client) => (
          <Link
            key={client.id}
            href={`/rundown/${client.id}`}
            className="card-base group block p-6 transition-all duration-200 hover:-translate-y-1 hover:border-gold hover:shadow-hover"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="mb-1.5 font-serif text-xl font-semibold text-ink">
                  {client.names}
                </h3>
                <div className="flex items-center gap-1.5 text-[13px] text-ink-light">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateID(client.eventDate)}
                </div>
              </div>
              <Badge tone="gold">{client.eventType}</Badge>
            </div>

            <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4">
              {client.venue && (
                <div className="flex items-center gap-2 text-sm text-ink-medium">
                  <MapPin className="h-4 w-4" />
                  {client.venue}
                </div>
              )}
              {client.pic && (
                <div className="flex items-center gap-2 text-sm text-ink-medium">
                  <User className="h-4 w-4" />
                  PIC: {client.pic.name}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1.5 text-xs text-ink-light">Progress</div>
                <Progress value={client.progress} className="w-[120px]" />
              </div>
              <div className="font-serif text-2xl font-bold text-gold-dark">
                {client.progress}%
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4 text-center text-[13px] font-semibold text-gold-dark transition-colors group-hover:text-gold">
              Open Workbook →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
