"use client";

import { TrendingUp, Heart, Wallet, Users, Star, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import type { ReportsDTO } from "@/lib/types";
import { formatIDR, formatIDRCompact } from "@/lib/format";

export default function ReportsPage() {
  const { data, loading, error } = useFetch<ReportsDTO>("/api/reports");

  const maxRevenue = data?.monthlyRevenue.length
    ? Math.max(...data.monthlyRevenue.map((m) => m.value), 1)
    : 1;
  const totalEvents = data?.eventTypes.reduce((s, e) => s + e.count, 0) ?? 0;

  return (
    <div className="p-8">
      <PageHeader title="Reports" subtitle="Business analytics and insights" />

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          iconTone="gold"
          value={loading ? "—" : String(data?.stats.totalEvents ?? 0)}
          label="Total Events YTD"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          iconTone="success"
          value={loading ? "—" : formatIDRCompact(data?.stats.totalRevenue)}
          label="Total Revenue YTD"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconTone="warning"
          value={loading ? "—" : formatIDRCompact(data?.stats.avgValue)}
          label="Avg. Event Value"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconTone="danger"
          value={loading ? "—" : String(data?.stats.activeCrew ?? 0)}
          label="Active Crew Members"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Revenue Trend</h3>
              <p className="text-xs text-ink-light">Monthly revenue (dalam juta IDR)</p>
            </div>
            <select className="btn btn-secondary !py-1.5 text-xs">
              <option>6 Months</option>
              <option>1 Year</option>
              <option>YTD</option>
            </select>
          </div>

          <div className="flex h-[260px] items-end gap-3 border-b border-line">
            {data?.monthlyRevenue.map((m) => {
              const heightPct = (m.value / maxRevenue) * 100;
              return (
                <div
                  key={m.month}
                  className="group relative flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="absolute -top-1 text-xs font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                    Rp {m.value}M
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-gold-dark to-gold transition-all duration-300 hover:from-gold hover:to-gold-light"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-xs font-medium text-ink-light">{m.month}</span>
                </div>
              );
            })}
            {!data && (
              <div className="flex-1 text-center text-sm text-ink-light">
                Loading chart…
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-light">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" />
              Revenue
            </span>
            {data && (
              <>
                <span>·</span>
                <span>
                  Total YTD:{" "}
                  <strong className="text-ink">
                    {formatIDR(data.stats.totalRevenue)}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="card-base p-6">
          <h3 className="mb-5 text-lg font-semibold text-ink">Event Breakdown</h3>
          <div className="mb-5 flex h-3 overflow-hidden rounded-full">
            {data?.eventTypes.map((e, idx) => {
              const colors = [
                "bg-gold",
                "bg-success",
                "bg-warning",
                "bg-danger",
                "bg-ink-medium",
              ];
              return (
                <div
                  key={e.type}
                  className={colors[idx % colors.length]}
                  style={{ width: `${(e.count / Math.max(1, totalEvents)) * 100}%` }}
                  title={`${e.type}: ${e.count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-col gap-3">
            {data?.eventTypes.map((e, idx) => {
              const colors = [
                "bg-gold",
                "bg-success",
                "bg-warning",
                "bg-danger",
                "bg-ink-medium",
              ];
              return (
                <div key={e.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-sm ${colors[idx % colors.length]}`}
                    />
                    <span className="text-sm text-ink">{e.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink">{e.count}</span>
                    <span className="w-12 text-right text-xs text-ink-light">
                      {totalEvents > 0
                        ? Math.round((e.count / totalEvents) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Top Vendors</h3>
            <Badge tone="gold">By projects</Badge>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Vendor", "Category", "Projects", "Rating"].map((h) => (
                  <th
                    key={h}
                    className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-light"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.vendors.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="py-3 text-sm font-semibold text-ink">{v.name}</td>
                  <td className="py-3">
                    <Badge tone="gold">{v.category}</Badge>
                  </td>
                  <td className="py-3 text-sm text-ink-medium">{v.projects}</td>
                  <td className="py-3 text-sm font-semibold text-success">⭐ {v.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Crew Performance</h3>
            <Badge tone="gold">Top performers</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {data?.crew.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md bg-cream p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-light text-xs font-bold text-gold-dark">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{c.name}</div>
                  <div className="text-xs text-ink-light">{c.role}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-sm font-semibold text-ink">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    {c.rating}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-ink-light">
                    <Calendar className="h-3 w-3" />
                    {c.projects} events
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
