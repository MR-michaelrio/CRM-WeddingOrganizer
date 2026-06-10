"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Download, FileText, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditClientDialog } from "@/components/forms/edit-client-dialog";
import { AssignCrewDialog } from "@/components/forms/assign-crew-dialog";
import { useFetch } from "@/lib/use-fetch";
import { formatDateID, formatIDR } from "@/lib/format";
import type { ClientDTO } from "@/lib/types";

const statusTone = {
  confirmed: "success",
  pending: "warning",
  inquiry: "gold",
} as const;

const statusLabel = {
  confirmed: "Confirmed",
  pending: "Pending",
  inquiry: "Inquiry",
} as const;

export default function ClientsPage() {
  const { data, loading, error, refresh } =
    useFetch<ClientDTO[]>("/api/clients");

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPackage, setFilterPackage] = useState<string>("all");
  const [edit, setEdit] = useState<ClientDTO | null>(null);
  const [del, setDel] = useState<ClientDTO | null>(null);
  const [assignCrew, setAssignCrew] = useState<ClientDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.filter((c) => {
      const matchQ =
        !q ||
        c.names.toLowerCase().includes(q) ||
        (c.venue ?? "").toLowerCase().includes(q) ||
        c.eventType.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || c.eventStatus === filterStatus;
      const matchPackage = filterPackage === "all" || c.package === filterPackage;
      return matchQ && matchStatus && matchPackage;
    });
  }, [data, query, filterStatus, filterPackage]);

  return (
    <div className="p-8">
      <PageHeader
        title="Client Management"
        subtitle="Manage your clients and events"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <DialogTrigger kind="client" onSuccess={refresh} />
          <button className="btn btn-secondary">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="w-full rounded-sm border border-line bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="btn btn-secondary min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="inquiry">Inquiry</option>
          </select>
          <select
            value={filterPackage}
            onChange={(e) => setFilterPackage(e.target.value)}
            className="btn btn-secondary min-w-[140px]"
          >
            <option value="all">All Package</option>
            <option>Standard</option>
            <option>Premium</option>
            <option>Luxury</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="card-base overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line bg-cream">
                {[
                  "Client",
                  "Event",
                  "Date",
                  "Package",
                  "Value",
                  "Progress",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-ink-light">
                    Loading clients…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-ink-light">
                    {data?.length === 0
                      ? "Belum ada client. Klik 'New Client' untuk menambahkan."
                      : "Tidak ada client yang cocok dengan filter."}
                  </td>
                </tr>
              )}
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-cream/60"
                >
                  <td className="px-6 py-5">
                    <div className="font-semibold text-ink">{client.names}</div>
                    {client.email && (
                      <div className="mt-1 text-[13px] text-ink-light">{client.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-ink">{client.eventType}</div>
                    {client.venue && (
                      <div className="mt-1 flex items-center gap-1 text-[13px] text-ink-light">
                        <MapPin className="h-3.5 w-3.5" />
                        {client.venue}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-ink-medium">
                    {formatDateID(client.eventDate)}
                  </td>
                  <td className="px-6 py-5">
                    {client.package && <Badge tone="gold">{client.package}</Badge>}
                  </td>
                  <td className="px-6 py-5 font-semibold text-ink">
                    {client.contractValue ? formatIDR(client.contractValue) : "—"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={client.progress}
                        className="min-w-[80px] max-w-[120px]"
                      />
                      <span className="text-xs font-semibold text-ink-light">
                        {client.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Badge tone={statusTone[client.eventStatus]}>
                      {statusLabel[client.eventStatus]}
                    </Badge>
                  </td>
                  <td
                    className="px-6 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      onView={() => router.push(`/clients/${client.id}`)}
                      onEdit={() => setEdit(client)}
                      extras={[
                        {
                          label: "Assign Crew",
                          icon: Users,
                          onClick: () => setAssignCrew(client),
                        },
                        {
                          label: "Print Kontrak",
                          icon: FileText,
                          onClick: () =>
                            window.open(`/clients/${client.id}/contract`, "_blank"),
                        },
                      ]}
                      onDelete={() => setDel(client)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <EditClientDialog
          open
          onClose={() => setEdit(null)}
          client={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/clients/${del.id}`}
          title={`Delete "${del.names}"?`}
          description="Workbook, sheets, tasks, payments, dan designs terkait akan ikut terhapus."
          onSuccess={refresh}
        />
      )}
      {assignCrew && (
        <AssignCrewDialog
          open
          onClose={() => setAssignCrew(null)}
          client={assignCrew}
        />
      )}
    </div>
  );
}
