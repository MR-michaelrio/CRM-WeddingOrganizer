"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Plus, Video } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { NewEventDialog } from "@/components/forms/new-event-dialog";
import { ViewEventDialog } from "@/components/forms/view-event-dialog";
import { useFetch } from "@/lib/use-fetch";
import type { ClientDTO } from "@/lib/types";
import type { CalendarEventDTO } from "@/lib/types-extra";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function buildMonthGrid(viewDate: Date): Date[] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - startWeekday);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const eventTypeTone: Record<string, string> = {
  meeting: "bg-gold/20 text-gold-dark",
  survey: "bg-warning/20 text-warning",
  wedding: "bg-success/20 text-success",
  sangjit: "bg-success/20 text-success",
  loading: "bg-ink-light/20 text-ink-medium",
  bongkar: "bg-ink-light/20 text-ink-medium",
};

export default function CalendarPage() {
  const today = new Date();
  const { data: clients } = useFetch<ClientDTO[]>("/api/clients");
  const { data: events, refresh: refreshEvents } =
    useFetch<CalendarEventDTO[]>("/api/events");

  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CalendarEventDTO | null>(null);

  const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const currentMonth = viewDate.getMonth();

  // Merge calendar events + client event dates into one map for the grid
  const dayBuckets = useMemo(() => {
    const map = new Map<
      string,
      Array<{ kind: "event" | "client"; id: number; label: string; type: string }>
    >();

    (events ?? []).forEach((evt) => {
      const key = new Date(evt.startAt).toDateString();
      const list = map.get(key) ?? [];
      list.push({ kind: "event", id: evt.id, label: evt.title, type: evt.type });
      map.set(key, list);
    });

    (clients ?? []).forEach((c) => {
      const key = new Date(c.eventDate).toDateString();
      const list = map.get(key) ?? [];
      list.push({
        kind: "client",
        id: c.id,
        label: c.names,
        type: c.eventType.toLowerCase().includes("sangjit") ? "sangjit" : "wedding",
      });
      map.set(key, list);
    });

    return map;
  }, [events, clients]);

  const selectedEntries = selectedDate
    ? dayBuckets.get(selectedDate.toDateString()) ?? []
    : [];

  const upcomingEvents = useMemo(() => {
    return [...(events ?? [])]
      .filter((e) => new Date(e.startAt) >= today)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return (
    <div className="p-8">
      <PageHeader
        title="Calendar"
        subtitle="Semua event, meeting, survey, dan bongkar dekor"
        action={
          <button onClick={() => setCreateOpen(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            New Event
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="card-base p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-line text-ink hover:bg-beige"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="min-w-[180px] text-center font-serif text-xl font-semibold text-ink">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </h3>
              <button
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-line text-ink hover:bg-beige"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDate(today);
              }}
              className="btn btn-secondary !py-1.5 text-xs"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 border-l border-t border-line">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-b border-r border-line bg-cream px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-light"
              >
                {d}
              </div>
            ))}
            {days.map((day, idx) => {
              const inMonth = day.getMonth() === currentMonth;
              const isToday = sameDay(day, today);
              const isSelected = selectedDate && sameDay(day, selectedDate);
              const entries = dayBuckets.get(day.toDateString()) ?? [];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[90px] border-b border-r border-line p-2 text-left transition-colors",
                    inMonth ? "bg-card" : "bg-cream/60",
                    isSelected && "ring-2 ring-inset ring-gold"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday
                        ? "bg-gold text-white"
                        : inMonth
                        ? "text-ink"
                        : "text-ink-light"
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {entries.slice(0, 2).map((e) => (
                      <div
                        key={`${e.kind}-${e.id}`}
                        className={cn(
                          "truncate rounded-sm px-1.5 py-0.5 text-[11px] font-semibold",
                          eventTypeTone[e.type] ?? "bg-gold/15 text-gold-dark"
                        )}
                        title={e.label}
                      >
                        {e.label}
                      </div>
                    ))}
                    {entries.length > 2 && (
                      <div className="text-[10px] text-ink-light">
                        +{entries.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card-base p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                {selectedDate
                  ? selectedDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Pilih tanggal"}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="text-xs font-semibold text-gold-dark hover:text-gold"
                >
                  + Add
                </button>
              )}
            </div>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-ink-light">Tidak ada event di tanggal ini.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedEntries.map((entry) => {
                  const evt =
                    entry.kind === "event"
                      ? events?.find((e) => e.id === entry.id)
                      : null;
                  return (
                    <button
                      key={`${entry.kind}-${entry.id}`}
                      onClick={() => {
                        if (evt) setViewing(evt);
                      }}
                      className="rounded-md bg-cream p-3 text-left transition-colors hover:bg-beige"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{entry.label}</span>
                        <Badge tone="gold">{entry.type}</Badge>
                      </div>
                      {evt && evt.location && (
                        <div className="flex items-center gap-1 text-xs text-ink-light">
                          <MapPin className="h-3.5 w-3.5" />
                          {evt.location}
                        </div>
                      )}
                      {evt && evt.meetLink && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gold-dark">
                          <Video className="h-3.5 w-3.5" /> Google Meet attached
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card-base p-6">
            <h3 className="mb-4 text-base font-semibold text-ink">Upcoming Events</h3>
            <div className="flex flex-col gap-3">
              {upcomingEvents.length === 0 && (
                <p className="text-sm text-ink-light">Belum ada event mendatang.</p>
              )}
              {upcomingEvents.map((evt) => {
                const d = new Date(evt.startAt);
                return (
                  <button
                    key={evt.id}
                    onClick={() => setViewing(evt)}
                    className="flex items-center gap-3 text-left transition-colors hover:bg-cream"
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-sm border border-line bg-cream text-center">
                      <span className="font-serif text-base font-bold leading-none text-gold-dark">
                        {d.getDate()}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-ink-light">
                        {d
                          .toLocaleDateString("id-ID", { month: "short" })
                          .replace(".", "")}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-sm font-semibold text-ink">
                        {evt.title}
                      </div>
                      <div className="truncate text-xs text-ink-light">
                        {evt.type} ·{" "}
                        {d.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <NewEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={selectedDate ? toDateInput(selectedDate) : undefined}
        onSuccess={refreshEvents}
      />
      {viewing && (
        <ViewEventDialog
          open
          onClose={() => setViewing(null)}
          event={viewing}
          onSuccess={refreshEvents}
        />
      )}
    </div>
  );
}
