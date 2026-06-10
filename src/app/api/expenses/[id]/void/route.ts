import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, parseJson, serverError } from "@/lib/api-helpers";

type VoidBody = {
  reason: string;
  // optional override; default ambil dari Settings.signatoryName
  voidedBy?: string;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<VoidBody>(req);
    if (!body.reason?.trim()) return badRequest("reason required");

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return notFound();
    if (existing.status === "void") {
      return badRequest("Pengeluaran sudah dibatalkan sebelumnya.");
    }

    let voidedBy = body.voidedBy?.trim();
    if (!voidedBy) {
      const setting = await prisma.setting.findUnique({ where: { id: 1 } });
      voidedBy = setting?.signatoryName || "System";
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        status: "void",
        voidReason: body.reason.trim(),
        voidedBy,
        voidedAt: new Date(),
      },
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}
