import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, parseJson, serverError } from "@/lib/api-helpers";
import { generateInvoiceNumber } from "@/lib/invoice-number";

type InvoiceItem = { description: string; qty: number; price: number; details?: string };

type UpdateBody = Partial<{
  type: string;
  amount: number;
  dueDate: string | null;
  notes: string | null;
  status: string;
  paidAt: string | null;
  items: InvoiceItem[] | null;
  eventLabel: string | null;
}>;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return notFound();
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<UpdateBody>(req);
    const data: Record<string, unknown> = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "paid" && body.paidAt === undefined) {
        data.paidAt = new Date();
      }
    }
    if (body.paidAt !== undefined) {
      data.paidAt = body.paidAt ? new Date(body.paidAt) : null;
    }
    if (body.items !== undefined) data.items = body.items;
    if (body.eventLabel !== undefined) data.eventLabel = body.eventLabel;
    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { client: true },
    });

    // Sync client.contractValue from updated line items subtotal.
    if (body.items && body.items.length > 0) {
      const subtotal = body.items.reduce(
        (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );
      if (subtotal > 0) {
        await prisma.client.update({
          where: { id: invoice.clientId },
          data: { contractValue: subtotal },
        });
      }
    }

    // ---- Auto-create invoice Pelunasan ----
    // Trigger: DP baru ditandai paid + belum ada invoice Pelunasan untuk
    // client ini + ada sisa pembayaran (> 0). Status Pelunasan = draft,
    // dueDate default = eventDate - 7 hari, items disalin dari DP supaya
    // template Pelunasan tetap menampilkan paket yang sama.
    let autoCreatedPelunasanId: number | null = null;
    if (
      body.status === "paid" &&
      invoice.type === "dp" &&
      invoice.status === "paid" // sudah benar2 ke-update
    ) {
      const existingPelunasan = await prisma.invoice.findFirst({
        where: { clientId: invoice.clientId, type: "pelunasan" },
        select: { id: true },
      });
      if (!existingPelunasan) {
        const dpItems = (invoice.items as InvoiceItem[] | null) ?? [];
        const subtotalFromItems = dpItems.reduce(
          (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
          0
        );
        const total =
          subtotalFromItems > 0
            ? subtotalFromItems
            : Number(invoice.client.contractValue ?? 0);
        const sisa = Math.max(0, total - Number(invoice.amount));

        if (sisa > 0) {
          // Default dueDate Pelunasan = eventDate - 7 hari.
          let pelunasanDueDate: Date | null = null;
          if (invoice.client.eventDate) {
            const d = new Date(invoice.client.eventDate);
            d.setDate(d.getDate() - 7);
            pelunasanDueDate = d;
          }
          const number = await generateInvoiceNumber();
          const created = await prisma.invoice.create({
            data: {
              number,
              clientId: invoice.clientId,
              type: "pelunasan",
              amount: sisa,
              items: dpItems as unknown as object[],
              eventLabel: invoice.eventLabel,
              dueDate: pelunasanDueDate,
              status: "draft",
              notes: null,
            },
          });
          autoCreatedPelunasanId = created.id;
        }
      }
    }

    return ok({ ...invoice, autoCreatedPelunasanId });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.invoice.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
