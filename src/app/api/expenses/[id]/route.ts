import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, parseJson, serverError } from "@/lib/api-helpers";

type UpdateBody = Partial<{
  date: string;
  category: string;
  amount: number;
  method: string;
  vendor: string;
  clientId: number | null;
  description: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: "draft" | "paid" | "void";
}>;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { client: { select: { id: true, names: true } } },
    });
    if (!expense) return notFound();
    return ok(expense);
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
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.category !== undefined) data.category = body.category;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.method !== undefined) data.method = body.method;
    if (body.vendor !== undefined) data.vendor = body.vendor;
    if (body.clientId !== undefined) data.clientId = body.clientId;
    if (body.description !== undefined) data.description = body.description;
    if (body.attachmentUrl !== undefined) data.attachmentUrl = body.attachmentUrl;
    if (body.attachmentName !== undefined) data.attachmentName = body.attachmentName;
    if (body.status !== undefined) data.status = body.status;

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.expense.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
