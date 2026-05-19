import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateInventoryBody = {
  name: string;
  category: string;
  quantity: number;
  available?: number;
  unit?: string;
  condition?: string;
  location?: string;
  notes?: string;
};

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
    return ok(items);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateInventoryBody>(req);
    const item = await prisma.inventoryItem.create({
      data: {
        ...body,
        available: body.available ?? body.quantity,
        unit: body.unit ?? "pcs",
        condition: body.condition ?? "Good",
      },
    });
    return created(item);
  } catch (err) {
    return serverError(err);
  }
}
