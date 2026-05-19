"use client";

import {
  Heart,
  Wallet,
  Clock,
  CheckCircle2,
  MapPin,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import type { DashboardDTO } from "@/lib/types";
import { formatIDRCompact } from "@/lib/format";
import { initials } from "@/lib/utils";

function formatDateBlock(date: Date) {
  return {
    day: date.getDate(),
    month: date
      .toLocaleDateString("id-ID", { month: "short" })
      .toUpperCase()
      .replace(".", ""),
  };
}

export default function DashboardPage() {
  const { data, loading, error } = useFetch<DashboardDTO>("/api/dashboard");

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Sarah! Here's what's happening today."
      />

      {error && (
        <div className="mb-6 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Failed to load dashboard: {error}
        </div>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          iconTone="gold"
          value={loading ? "—" : String(data?.stats.eventsThisMonth ?? 0)}
          label="Events This Month"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          iconTone="success"
          value={loading ? "—" : formatIDRCompact(data?.stats.monthlyRevenue)}
          label="Monthly Revenue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconTone="warning"
          value={loading ? "—" : formatIDRCompact(data?.stats.outstanding)}
          label="Outstanding"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconTone="gold"
          value={loading ? "—" : `${data?.stats.taskProgress ?? 0}%`}
          label="Checklist Progress"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Upcoming Events</h3>
            <Link
              href="/calendar"
              className="text-sm font-medium text-gold-dark hover:text-gold"
            >
              View All →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {loading && (
              <div className="text-sm text-ink-light">Loading…</div>
            )}
            {!loading && (data?.upcomingEvents.length ?? 0) === 0 && (
              <div className="text-sm text-ink-light">Belum ada event mendatang.</div>
            )}
            {data?.upcomingEvents.slice(0, 4).map((event) => {
              const d = formatDateBlock(new Date(event.eventDate));
              return (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center gap-4 rounded-md bg-cream p-4 transition-colors hover:bg-beige"
                >
                  <div className="flex h-16 min-w-[60px] flex-col items-center justify-center rounded-sm border border-line bg-card px-3 py-3">
                    <div className="font-serif text-2xl font-bold leading-none text-gold-dark">
                      {d.day}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-light">
                      {d.month}
                    </div>
                  </div>

                  <div className="min-w-[200px] flex-1">
                    <div className="text-base font-semibold text-ink">{event.names}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-ink-medium">
                      <span>{event.eventType}</span>
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={event.progress} className="max-w-[200px]" />
                      <span className="text-xs font-semibold text-ink-light">
                        {event.progress}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {event.pic && <Badge tone="gold">PIC: {event.pic.name}</Badge>}
                    <Badge
                      tone={
                        event.eventStatus === "confirmed"
                          ? "success"
                          : event.eventStatus === "pending"
                          ? "warning"
                          : "gold"
                      }
                    >
                      {event.eventStatus === "confirmed"
                        ? "Confirmed"
                        : event.eventStatus === "pending"
                        ? "Pending"
                        : "Inquiry"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Recent Activities</h3>
            <Link
              href="/reports"
              className="text-sm font-medium text-gold-dark hover:text-gold"
            >
              View All →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {loading && <div className="text-sm text-ink-light">Loading…</div>}
            {data?.activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-light text-sm text-gold-dark">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-ink">{activity.text}</p>
                  <p className="mt-1 text-xs text-ink-light">
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-base mt-5 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Crew Schedule Today</h3>
          <Link
            href="/crew"
            className="text-sm font-medium text-gold-dark hover:text-gold"
          >
            Manage Schedule →
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {loading && <div className="text-sm text-ink-light">Loading…</div>}
          {!loading && (data?.crewSchedule.length ?? 0) === 0 && (
            <div className="text-sm text-ink-light">Belum ada crew terjadwal.</div>
          )}
          {data?.crewSchedule.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-sm bg-cream p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-light text-sm font-semibold text-gold-dark">
                {initials(member.name)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">{member.name}</div>
                <div className="text-xs text-ink-light">{member.role}</div>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink-medium">
                <Timer className="h-4 w-4" />
                {member.status === "scheduled" ? "Scheduled" : "Available"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}
