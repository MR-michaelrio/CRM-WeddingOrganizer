"use client";

import dynamic from "next/dynamic";
import { Calendar, MapPin, Lock, Printer } from "lucide-react";

type Sheet = {
  id: number;
  slug: string;
  name: string;
  columns: string[];
  rows: Record<string, string>[];
};

type Props = {
  clientId: number;
  clientName: string;
  eventType: string;
  eventDateLabel: string;
  venue: string | null;
  sheets: Sheet[];
};

const UniverWorkbook = dynamic(
  () =>
    import("@/components/workbook/univer-workbook").then((m) => m.UniverWorkbook),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl">📊</div>
          <p className="text-sm text-ink-light">Loading workbook…</p>
        </div>
      </div>
    ),
  }
);

export function SharedWorkbookView({
  clientId,
  clientName,
  eventType,
  eventDateLabel,
  venue,
  sheets,
}: Props) {
  const univerSheets = sheets.map((s, idx) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    position: idx,
    columns: s.columns,
    rows: s.rows,
  }));

  return (
    <div className="flex h-screen flex-col bg-cream">
      <div className="border-b border-line bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-serif text-lg font-semibold text-ink">
              {clientName}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-ink-light">
              <span>{eventType}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {eventDateLabel}
              </span>
              {venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venue}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/share/workbook/${clientId}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary !py-1.5 text-xs"
              title="Cetak workbook"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </a>
            <div className="inline-flex items-center gap-1.5 rounded-sm bg-cream px-3 py-1.5 text-xs text-ink-light">
              <Lock className="h-3 w-3" />
              Read-only
            </div>
          </div>
        </div>
      </div>

      {sheets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-ink-light">
          Workbook belum berisi data.
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-card">
          <UniverWorkbook
            workbookId={`share-workbook-${univerSheets[0]?.id ?? 0}`}
            sheets={univerSheets}
            title={`${clientName} — Workbook`}
            readonly
          />
        </div>
      )}
    </div>
  );
}
