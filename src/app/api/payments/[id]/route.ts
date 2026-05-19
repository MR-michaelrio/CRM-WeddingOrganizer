import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<Record<string, unknown>>(req);
    const data: Record<string, unknown> = { ...body };
    if (typeof body.paymentDate === "string") data.paymentDate = new Date(body.paymentDate);
    const payment = await prisma.payment.update({ where: { id }, data });
    return ok(payment);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.payment.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
