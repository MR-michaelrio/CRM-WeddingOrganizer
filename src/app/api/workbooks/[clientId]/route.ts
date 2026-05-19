import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, serverError } from "@/lib/api-helpers";

export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  try {
    const clientId = Number(params.clientId);
    if (Number.isNaN(clientId)) return badRequest("Invalid clientId");
    const workbook = await prisma.workbook.findUnique({
      where: { clientId },
      include: {
        client: { include: { pic: { select: { name: true } } } },
        sheets: { orderBy: { position: "asc" } },
      },
    });
    if (!workbook) return notFound("Workbook not found");
    return ok(workbook);
  } catch (err) {
    return serverError(err);
  }
}
