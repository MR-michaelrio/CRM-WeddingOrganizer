import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateID } from "@/lib/format";
import { WorkbookClient } from "./workbook-client";

export const dynamic = "force-dynamic";

export default async function WorkbookPage({ params }: { params: { id: string } }) {
  const clientId = Number(params.id);
  if (Number.isNaN(clientId)) notFound();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      pic: { select: { name: true } },
      workbook: {
        include: {
          sheets: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!client) notFound();

  const sheets = (client.workbook?.sheets ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    position: s.position,
    columns: (s.columns as string[]) ?? [],
    rows: (s.rows as Record<string, string>[]) ?? [],
  }));

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-card px-8 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/rundown"
            className="-ml-2 rounded-sm p-2 text-ink transition-colors hover:bg-beige"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="font-serif text-lg font-semibold text-ink">
              {client.names}
            </div>
            <div className="text-xs text-ink-light">
              {client.pic?.name ?? "Unassigned"} · {client.eventType}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-sm bg-beige px-3 py-2 text-[13px] text-ink">
            <Calendar className="h-4 w-4" />
            {formatDateID(client.eventDate)}
          </span>
          {client.venue && (
            <span className="flex items-center gap-1.5 rounded-sm bg-beige px-3 py-2 text-[13px] text-ink">
              <MapPin className="h-4 w-4" />
              {client.venue}
            </span>
          )}
        </div>
      </div>

      <WorkbookClient
        clientId={client.id}
        workbookId={`workbook-${client.id}`}
        sheets={sheets}
        title={`${client.names} - Workbook`}
        clientName={client.names}
      />
    </div>
  );
}
