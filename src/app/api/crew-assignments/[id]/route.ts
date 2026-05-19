import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<Record<string, unknown>>(req);
    const assignment = await prisma.crewAssignment.update({
      where: { id },
      data: body,
      include: {
        crew: {
          select: { id: true, name: true, role: true, defaultFee: true, status: true },
        },
      },
    });
    return ok(assignment);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.crewAssignment.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
