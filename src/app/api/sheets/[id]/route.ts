import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";

type SheetLayout = {
  columnWidths?: Record<string, number>;
  rowHeights?: Record<string, number>;
};

type UpdateSheetBody = Partial<{
  name: string;
  columns: string[];
  rows: Record<string, string>[];
  position: number;
  layout: SheetLayout | null;
  snapshot: unknown;
}>;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<UpdateSheetBody>(req);
    const { layout, snapshot, ...rest } = body;
    const data: Prisma.SheetUpdateInput = { ...rest };
    if (layout !== undefined) {
      data.layout = layout === null ? Prisma.JsonNull : (layout as Prisma.InputJsonValue);
    }
    if (snapshot !== undefined) {
      data.snapshot =
        snapshot === null ? Prisma.JsonNull : (snapshot as Prisma.InputJsonValue);
    }
    const sheet = await prisma.sheet.update({
      where: { id },
      data,
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
