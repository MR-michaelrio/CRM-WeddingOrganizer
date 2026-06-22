import { prisma } from "@/lib/prisma";
import { badRequest, created, ok, parseJson, serverError } from "@/lib/api-helpers";
import { checkBakiConflicts, formatSameDayError } from "@/lib/baki-conflicts";
import { parseJenisBakiList } from "@/lib/jenis-baki";
import {
  DAFTAR_BAKI_COLUMNS,
  SANGJIT_RUNDOWN_COLUMNS,
  buildDaftarBakiRows,
  buildSangjitRundownRows,
} from "@/lib/templates/sangjit-rundown";

type CreateClientBody = {
  names: string;
  email?: string;
  phone?: string;
  eventType: string;
  eventDate: string;
  venue?: string;
  package?: string;
  jenisBaki?: string;
  contractValue?: number;
  notes?: string;
  picId?: number;
  template?: string;
};

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { eventDate: "asc" },
      include: { pic: { select: { id: true, name: true } } },
    });
    return ok(clients);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateClientBody>(req);

    // Blokir pemakaian jenis baki yang sama di hari sangjit yang sama.
    const { sameDay } = await checkBakiConflicts({
      date: body.eventDate,
      jenisBaki: parseJenisBakiList(body.jenisBaki),
      eventType: body.eventType,
    });
    if (sameDay.length > 0) {
      return badRequest(formatSameDayError(sameDay));
    }

    const client = await prisma.client.create({
      data: {
        names: body.names,
        email: body.email,
        phone: body.phone,
        eventType: body.eventType,
        eventDate: new Date(body.eventDate),
        venue: body.venue,
        package: body.package,
        jenisBaki: body.jenisBaki,
        contractValue: body.contractValue,
        notes: body.notes,
        picId: body.picId,
      },
    });

    // Auto-create workbook with default sheets based on event type.
    // Match labels case-insensitively so "Sangjit Only", "Wedding Only",
    // "Sangjit & Wedding" and legacy values all route correctly.
    const et = body.eventType.toLowerCase();
    const hasSangjit = et.includes("sangjit");
    const hasWedding = et.includes("wedding");

    const template = body.template
      ?? (hasSangjit && hasWedding
        ? "sangjit-wedding"
        : hasSangjit
          ? "sangjit"
          : hasWedding
            ? "wedding-ballroom"
            : "custom");

    const wb = await prisma.workbook.create({
      data: { clientId: client.id, template },
    });

    const seedSheets = defaultSheets({ hasSangjit, hasWedding });
    await prisma.$transaction(
      seedSheets.map((s, idx) =>
        prisma.sheet.create({ data: { ...s, workbookId: wb.id, position: idx } })
      )
    );

    return created(client);
  } catch (err) {
    return serverError(err);
  }
}

function defaultSheets({
  hasSangjit,
  hasWedding,
}: {
  hasSangjit: boolean;
  hasWedding: boolean;
}) {
  const wedding = {
    slug: "wedding-rundown",
    name: "Wedding Rundown",
    columns: [
      "Start Time",
      "End Time",
      "Duration",
      "Susunan Acara",
      "PIC",
      "Location",
      "Notes",
      "Status",
    ],
    rows: [] as Record<string, string>[],
  };
  const sangjit = {
    slug: "sangjit-rundown",
    name: "Sangjit Rundown",
    columns: SANGJIT_RUNDOWN_COLUMNS,
    rows: buildSangjitRundownRows(),
  };
  const baki = {
    slug: "daftar-baki",
    name: "Daftar Baki",
    columns: DAFTAR_BAKI_COLUMNS,
    rows: buildDaftarBakiRows(),
  };
  const vendors = {
    slug: "vendor-list",
    name: "Vendor List",
    columns: [
      "Vendor Type",
      "Vendor Name",
      "Contact Person",
      "Phone",
      "Price",
      "Status",
      "Notes",
    ],
    rows: [],
  };
  const finance = {
    slug: "finance",
    name: "Finance",
    columns: ["Category", "Item", "Budget", "Actual", "Difference", "Status", "Notes"],
    rows: [],
  };
  const checklist = {
    slug: "checklist",
    name: "Checklist",
    columns: ["Task", "Category", "Due Date", "PIC", "Status", "Notes"],
    rows: [],
  };
  const sheets: typeof wedding[] = [];
  if (hasSangjit) sheets.push(sangjit, baki);
  if (hasWedding) sheets.push(wedding);
  sheets.push(vendors, finance, checklist);
  return sheets;
}
