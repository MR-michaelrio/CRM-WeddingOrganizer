import { prisma } from "@/lib/prisma";
import { badRequest, created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreatePackageBody = {
  name: string;
  price: number;
  description?: string;
  position?: number;
};

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return ok(packages);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreatePackageBody>(req);
    if (!body.name?.trim()) return badRequest("Name required");
    if (body.price === undefined || body.price === null || Number.isNaN(Number(body.price))) {
      return badRequest("Price required");
    }
    const pkg = await prisma.package.create({
      data: {
        name: body.name.trim(),
        price: body.price,
        description: body.description,
        position: body.position ?? 0,
      },
    });
    return created(pkg);
  } catch (err) {
    return serverError(err);
  }
}
