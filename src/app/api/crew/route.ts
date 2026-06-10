import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateCrewBody = {
  name: string;
  role: string;
  status?: string;
  phone?: string;
  email?: string;
  defaultFee?: number;
};

export async function GET() {
  try {
    const crew = await prisma.crew.findMany({
      orderBy: { name: "asc" },
      include: {
        assignments: {
          include: {
            client: {
              select: {
                id: true,
                names: true,
                eventType: true,
                eventDate: true,
                venue: true,
              },
            },
          },
          orderBy: { client: { eventDate: "asc" } },
        },
      },
    });
    return ok(crew);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateCrewBody>(req);
    const crew = await prisma.crew.create({ data: body });
    return created(crew);
  } catch (err) {
    return serverError(err);
  }
}
