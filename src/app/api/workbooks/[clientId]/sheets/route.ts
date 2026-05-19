import { prisma } from "@/lib/prisma";
import { badRequest, created, parseJson, serverError } from "@/lib/api-helpers";

type CreateSheetBody = {
  slug?: string;
  name: string;
  columns: string[];
  rows?: Record<string, string>[];
};

export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  try {
    const clientId = Number(params.clientId);
    if (Number.isNaN(clientId)) return badRequest("Invalid clientId");
    const body = await parseJson<CreateSheetBody>(req);
    const workbook = await prisma.workbook.findUnique({ where: { clientId } });
    if (!workbook) return badRequest("Workbook not found");

    const count = await prisma.sheet.count({ where: { workbookId: workbook.id } });
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const sheet = await prisma.sheet.create({
      data: {
        workbookId: workbook.id,
        slug: `${slug}-${Date.now()}`,
        name: body.name,
        columns: body.columns,
        rows: body.rows ?? [],
        position: count,
      },
    });
    return created(sheet);
  } catch (err) {
    return serverError(err);
  }
}
