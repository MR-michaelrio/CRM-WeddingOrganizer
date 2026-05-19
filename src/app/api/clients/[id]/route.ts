import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, parseJson, serverError } from "@/lib/api-helpers";

type UpdateClientBody = Partial<{
  names: string;
  email: string | null;
  phone: string | null;
  eventType: string;
  eventDate: string;
  venue: string | null;
  package: string | null;
  contractValue: number | null;
  status: string;
  eventStatus: string;
  progress: number;
  notes: string | null;
  galleryUrl: string | null;
  picId: number | null;
}>;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");

    // ?full=1 → return aggregated detail for the customer detail page
    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "1";

    if (!full) {
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          pic: true,
          workbook: { include: { sheets: { orderBy: { position: "asc" } } } },
        },
      });
      if (!client) return notFound();
      return ok(client);
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        pic: true,
        workbook: {
          include: {
            sheets: {
              orderBy: { position: "asc" },
              select: { id: true, slug: true, name: true, position: true },
            },
          },
        },
        tasks: { orderBy: [{ status: "asc" }, { position: "asc" }] },
        payments: { orderBy: { paymentDate: "desc" } },
        invoices: { orderBy: { issuedDate: "desc" } },
        designs: { orderBy: { uploadedAt: "desc" } },
        crewAssignments: {
          include: { crew: { select: { id: true, name: true, role: true } } },
        },
        events: { orderBy: { startAt: "asc" } },
      },
    });
    if (!client) return notFound();
    return ok(client);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<UpdateClientBody>(req);
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...body,
        eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      },
    });
    return ok(client);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.client.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
