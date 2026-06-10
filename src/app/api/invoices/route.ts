import { prisma } from "@/lib/prisma";
import { badRequest, created, ok, parseJson, serverError } from "@/lib/api-helpers";
import { generateInvoiceNumber } from "@/lib/invoice-number";

type InvoiceItem = { description: string; qty: number; price: number; details?: string };

type CreateInvoiceBody = {
  clientId: number;
  type: "dp" | "pelunasan";
  amount: number;
  dueDate?: string | null;
  notes?: string | null;
  status?: string;
  items?: InvoiceItem[] | null;
  eventLabel?: string | null;
};

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { issuedDate: "desc" },
      include: {
        client: { select: { id: true, names: true, eventType: true, eventDate: true } },
      },
    });
    return ok(invoices);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateInvoiceBody>(req);
    if (!body.clientId) return badRequest("clientId required");
    if (body.type !== "dp" && body.type !== "pelunasan") {
      return badRequest("type must be dp or pelunasan");
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest("amount must be > 0");
    }
    const number = await generateInvoiceNumber();
    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: body.clientId,
        type: body.type,
        amount,
        items: body.items ?? undefined,
        eventLabel: body.eventLabel ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
        status: body.status ?? "draft",
      },
      include: {
        client: { select: { id: true, names: true, eventType: true, eventDate: true } },
      },
    });

    // Sync client.contractValue from invoice line items subtotal so the client
    // detail page always reflects the invoiced total.
    if (body.items && body.items.length > 0) {
      const subtotal = body.items.reduce(
        (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );
      if (subtotal > 0) {
        await prisma.client.update({
          where: { id: body.clientId },
          data: { contractValue: subtotal },
        });
      }
    }

    return created(invoice);
  } catch (err) {
    return serverError(err);
  }
}
