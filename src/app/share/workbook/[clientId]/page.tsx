import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { shareCookieName, verifyShareToken } from "@/lib/auth";
import { formatDateID } from "@/lib/format";
import { PinForm } from "./pin-form";
import { SharedWorkbookView } from "./shared-view";

export const dynamic = "force-dynamic";

export default async function ShareWorkbookPage({
  params,
}: {
  params: { clientId: string };
}) {
  const clientId = Number(params.clientId);
  if (Number.isNaN(clientId)) notFound();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      names: true,
      eventType: true,
      eventDate: true,
      venue: true,
      workbookPin: true,
    },
  });
  if (!client) notFound();

  // Tanpa PIN di-set → tidak bisa diakses.
  if (!client.workbookPin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm rounded-lg border border-line bg-card p-8 text-center shadow-pop">
          <h1 className="font-serif text-xl font-semibold text-ink">
            Link belum aktif
          </h1>
          <p className="mt-2 text-sm text-ink-light">
            Tuan rumah belum mengaktifkan akses share. Silakan hubungi tuan rumah.
          </p>
        </div>
      </div>
    );
  }

  // Cek cookie share token
  const tokenCookie = cookies().get(shareCookieName("workbook", clientId))?.value;
  const session = tokenCookie ? await verifyShareToken(tokenCookie) : null;
  const granted = session?.kind === "workbook" && session.clientId === clientId;

  if (!granted) {
    return (
      <PinForm
        clientId={clientId}
        clientName={client.names}
        eventType={client.eventType}
        eventDateLabel={formatDateID(client.eventDate)}
      />
    );
  }

  // Sudah verified → ambil workbook data
  const workbook = await prisma.workbook.findUnique({
    where: { clientId },
    include: { sheets: { orderBy: { position: "asc" } } },
  });

  const sheets = (workbook?.sheets ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    columns: (s.columns as string[]) ?? [],
    rows: (s.rows as Record<string, string>[]) ?? [],
  }));

  return (
    <SharedWorkbookView
      clientId={clientId}
      clientName={client.names}
      eventType={client.eventType}
      eventDateLabel={formatDateID(client.eventDate)}
      venue={client.venue}
      sheets={sheets}
    />
  );
}
