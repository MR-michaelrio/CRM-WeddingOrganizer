import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateDesignBody = {
  name: string;
  category?: string;
  status?: string;
  thumbnail?: string;
  notes?: string;
  clientId?: number | null;
};

export async function GET() {
  try {
    const designs = await prisma.design.findMany({
      orderBy: { uploadedAt: "desc" },
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(designs);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateDesignBody>(req);
    const design = await prisma.design.create({
      data: {
        name: body.name,
        category: body.category ?? "Backdrop",
        status: body.status ?? "pending",
        thumbnail: body.thumbnail ?? "🎨",
        notes: body.notes,
        clientId: body.clientId ?? null,
      },
    });
    return created(design);
  } catch (err) {
    return serverError(err);
  }
}
