import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";

type UpdateSheetBody = Partial<{
  name: string;
  columns: string[];
  rows: Record<string, string>[];
  position: number;
}>;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<UpdateSheetBody>(req);
    const sheet = await prisma.sheet.update({
      where: { id },
      data: body,
    });
    return ok(sheet);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    await prisma.sheet.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
