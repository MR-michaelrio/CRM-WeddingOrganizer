"use client";

import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditItemDialog } from "@/components/forms/edit-item-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { InventoryItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const { data, loading, error, refresh } =
    useFetch<InventoryItemDTO[]>("/api/inventory");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [edit, setEdit] = useState<InventoryItemDTO | null>(null);
  const [del, setDel] = useState<InventoryItemDTO | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filterCat === "all") return data;
    return data.filter((i) => i.category === filterCat);
  }, [data, filterCat]);

  return (
    <div className="p-8">
      <PageHeader title="Inventory" subtitle="Decoration inventory management" />

      <div className="mb-6 flex flex-wrap gap-3">
        <DialogTrigger kind="item" onSuccess={refresh} />
        <button className="btn btn-secondary">
          <RefreshCcw className="h-4 w-4" />
          Check In/Out
        </button>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="btn btn-secondary"
        >
          <option value="all">All Categories</option>
          <option>Furniture</option>
          <option>Lighting</option>
          <option>Decoration</option>
          <option>Structure</option>
          <option>Fabric</option>
          <option>Props</option>
        </select>
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
                {["Item Name", "Category", "Total Qty", "Available", "In Use", "Condition", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-ink-light"
                  >
                    Loading inventory…
                  </td>
                </tr>
              )}
              {filtered.map((item) => {
                const inUse = item.quantity - item.available;
                const availPct =
                  item.quantity > 0 ? (item.available / item.quantity) * 100 : 0;
                const healthy = availPct > 50;
                return (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-5 font-semibold text-ink">{item.name}</td>
                    <td className="px-6 py-5">
                      <Badge tone="gold">{item.category}</Badge>
                    </td>
                    <td className="px-6 py-5 text-ink-medium">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-5">
                      <div
                        className={cn(
                          "mb-1 font-semibold",
                          healthy ? "text-success" : "text-warning"
                        )}
                      >
                        {item.available} {item.unit}
                      </div>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-line">
                        <div
                          className={cn("h-full", healthy ? "bg-success" : "bg-warning")}
                          style={{ width: `${availPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-ink-medium">
                      {inUse} {item.unit}
                    </td>
                    <td className="px-6 py-5">
                      <Badge tone={item.condition === "Excellent" ? "success" : "gold"}>
                        {item.condition}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <RowActions
                        onEdit={() => setEdit(item)}
                        onDelete={() => setDel(item)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <EditItemDialog
          open
          onClose={() => setEdit(null)}
          item={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/inventory/${del.id}`}
          title={`Delete item "${del.name}"?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
